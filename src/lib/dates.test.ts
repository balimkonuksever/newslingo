import { describe, expect, it } from "vitest";

import { formatArticleDate } from "./dates";

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
