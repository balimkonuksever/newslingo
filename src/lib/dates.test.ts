import { describe, expect, it } from "vitest";

import {
  formatArticleDate,
  formatDateTime,
  startOfDisplayDay,
  startOfNextDisplayDay,
} from "./dates";

describe("formatArticleDate", () => {
  it("formats a timestamp as day, month name and year", () => {
    expect(formatArticleDate(new Date("2026-09-25T09:00:00Z"))).toBe(
      "25 September 2026",
    );
  });

  it("uses Istanbul time rather than the server's time zone", () => {
    // 21:45 UTC is already 00:45 the next day in Istanbul (UTC+3).
    expect(formatArticleDate(new Date("2026-09-19T21:45:00Z"))).toBe(
      "20 September 2026",
    );
  });

  it("rejects an invalid date", () => {
    expect(() => formatArticleDate(new Date("not a date"))).toThrow(RangeError);
  });
});

describe("formatDateTime", () => {
  it("formats a timestamp to the minute in Istanbul time", () => {
    expect(formatDateTime(new Date("2026-10-25T15:40:30Z"))).toBe(
      "25 October 2026 at 18:40",
    );
    expect(formatDateTime(new Date("2026-09-19T21:05:00Z"))).toBe(
      "20 September 2026 at 00:05",
    );
  });
});

describe("Istanbul day boundaries", () => {
  it("starts a day at midnight Istanbul time", () => {
    expect(startOfDisplayDay("2026-09-20").toISOString()).toBe(
      "2026-09-19T21:00:00.000Z",
    );
  });

  it("starts the next day exactly 24 hours later", () => {
    expect(startOfNextDisplayDay("2026-09-20").toISOString()).toBe(
      "2026-09-20T21:00:00.000Z",
    );
  });

  it("agrees with the displayed calendar date", () => {
    const start = startOfDisplayDay("2026-09-20");
    const lastMoment = new Date(
      startOfNextDisplayDay("2026-09-20").getTime() - 1,
    );

    expect(formatArticleDate(start)).toBe("20 September 2026");
    expect(formatArticleDate(lastMoment)).toBe("20 September 2026");
  });
});
