import "server-only";

export type RateLimitDecision =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };

export type RateLimiter = {
  /** Counts one request for `key` and says whether it may go ahead. */
  take(key: string): RateLimitDecision;
  /** Says whether `key` is under its limit, without counting anything. */
  check(key: string): RateLimitDecision;
};

/**
 * The last `x-forwarded-for` entry, which the nearest proxy adds. Without a
 * proxy that sets the header, clients can choose their own address, so a
 * per-client limit is a courtesy, never the only limit.
 */
export function clientAddress(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
}

/**
 * A fixed-window counter held in this server process's memory. With several
 * server instances each keeps its own counts, so the limits are per instance
 * until hosting is chosen and a shared store replaces this.
 */
export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
  now = Date.now,
}: {
  limit: number;
  windowMs: number;
  /** Bounds memory when many clients appear; the oldest windows go first. */
  maxKeys?: number;
  now?: () => number;
}): RateLimiter {
  const windows = new Map<string, { resetAt: number; count: number }>();

  function makeRoom(time: number) {
    for (const [key, window] of windows) {
      if (window.resetAt <= time) {
        windows.delete(key);
      }
    }

    for (const key of windows.keys()) {
      if (windows.size < maxKeys) {
        break;
      }
      windows.delete(key);
    }
  }

  return {
    take(key) {
      const time = now();
      let window = windows.get(key);

      if (!window || window.resetAt <= time) {
        windows.delete(key);
        if (windows.size >= maxKeys) {
          makeRoom(time);
        }

        window = { resetAt: time + windowMs, count: 0 };
        windows.set(key, window);
      }

      if (window.count >= limit) {
        return refusal(window.resetAt, time);
      }

      window.count += 1;

      return { allowed: true };
    },
    check(key) {
      const time = now();
      const window = windows.get(key);

      if (!window || window.resetAt <= time || window.count < limit) {
        return { allowed: true };
      }

      return refusal(window.resetAt, time);
    },
  };
}

function refusal(resetAt: number, time: number): RateLimitDecision {
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - time) / 1000)),
  };
}
