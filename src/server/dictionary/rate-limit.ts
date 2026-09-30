import "server-only";

export type RateLimitDecision =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };

export type RateLimiter = {
  /** Counts one request for `key` and says whether it may go ahead. */
  take(key: string): RateLimitDecision;
};

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
        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((window.resetAt - time) / 1000),
          ),
        };
      }

      window.count += 1;

      return { allowed: true };
    },
  };
}
