import { describe, expect, it } from "vitest";

import { clientAddress, createRateLimiter } from "./rate-limit";

function limiter(limit: number, maxKeys?: number) {
  let time = 0;

  return {
    limiter: createRateLimiter({
      limit,
      windowMs: 60_000,
      maxKeys,
      now: () => time,
    }),
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe("createRateLimiter", () => {
  it("allows up to the limit in a window, then says when to retry", () => {
    const { limiter: limits, advance } = limiter(2);

    expect(limits.take("a")).toEqual({ allowed: true });
    expect(limits.take("a")).toEqual({ allowed: true });
    advance(15_000);
    expect(limits.take("a")).toEqual({
      allowed: false,
      retryAfterSeconds: 45,
    });
  });

  it("starts a new window once the old one ends", () => {
    const { limiter: limits, advance } = limiter(1);

    limits.take("a");
    expect(limits.take("a").allowed).toBe(false);
    advance(60_000);
    expect(limits.take("a").allowed).toBe(true);
  });

  it("counts each key separately", () => {
    const { limiter: limits } = limiter(1);

    expect(limits.take("a").allowed).toBe(true);
    expect(limits.take("b").allowed).toBe(true);
    expect(limits.take("a").allowed).toBe(false);
  });

  it("forgets the oldest windows when it holds too many keys", () => {
    const { limiter: limits } = limiter(1, 2);

    limits.take("a");
    limits.take("b");
    limits.take("c");

    // "a" was forgotten, so it starts over; "c" is still limited.
    expect(limits.take("a").allowed).toBe(true);
    expect(limits.take("c").allowed).toBe(false);
  });
});

describe("RateLimiter.check", () => {
  it("reports the limit without counting a request", () => {
    const { limiter: limits, advance } = limiter(1);

    expect(limits.check("a")).toEqual({ allowed: true });
    expect(limits.check("a")).toEqual({ allowed: true });
    expect(limits.take("a")).toEqual({ allowed: true });
    advance(20_000);
    expect(limits.check("a")).toEqual({
      allowed: false,
      retryAfterSeconds: 40,
    });
    advance(40_000);
    expect(limits.check("a")).toEqual({ allowed: true });
  });
});

describe("clientAddress", () => {
  it("takes the address the nearest proxy added", () => {
    expect(
      clientAddress(new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" })),
    ).toBe("2.2.2.2");
    expect(clientAddress(new Headers())).toBe("unknown");
  });
});
