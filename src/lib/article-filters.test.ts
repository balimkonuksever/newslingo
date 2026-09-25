import { describe, expect, it } from "vitest";

import {
  hasActiveFilters,
  parseArticleFilters,
  sourceDateRange,
} from "./article-filters";

const categories = ["ai", "world"];

describe("parseArticleFilters", () => {
  it("returns no filters for an empty query", () => {
    expect(parseArticleFilters({}, categories)).toEqual({});
  });

  it("keeps valid values", () => {
    expect(
      parseArticleFilters(
        {
          category: "world",
          level: "B2",
          length: "medium",
          from: "2026-09-01",
          to: "2026-09-30",
        },
        categories,
      ),
    ).toEqual({
      category: "world",
      level: "B2",
      length: "medium",
      from: "2026-09-01",
      to: "2026-09-30",
    });
  });

  it("drops empty, unknown and malformed values", () => {
    expect(
      parseArticleFilters(
        {
          category: "sports",
          level: "b2",
          length: "",
          from: "2026-02-30",
          to: "yesterday",
          unrelated: "value",
        },
        categories,
      ),
    ).toEqual({});
  });

  it("uses the first value when a parameter repeats", () => {
    expect(parseArticleFilters({ level: ["C1", "A2"] }, categories)).toEqual({
      level: "C1",
    });
  });

  it("puts a reversed date range back in order", () => {
    expect(
      parseArticleFilters({ from: "2026-09-30", to: "2026-09-01" }, categories),
    ).toEqual({ from: "2026-09-01", to: "2026-09-30" });
  });
});

describe("hasActiveFilters", () => {
  it("is false only when no filter is set", () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ to: "2026-09-01" })).toBe(true);
  });
});

describe("sourceDateRange", () => {
  it("is undefined without dates", () => {
    expect(sourceDateRange({ level: "A2" })).toBeUndefined();
  });

  it("covers whole Istanbul days, including the last one", () => {
    expect(sourceDateRange({ from: "2026-09-01", to: "2026-09-02" })).toEqual({
      gte: new Date("2026-08-31T21:00:00Z"),
      lt: new Date("2026-09-02T21:00:00Z"),
    });
  });

  it("supports open-ended ranges", () => {
    expect(sourceDateRange({ from: "2026-09-01" })).toEqual({
      gte: new Date("2026-08-31T21:00:00Z"),
    });
    expect(sourceDateRange({ to: "2026-09-01" })).toEqual({
      lt: new Date("2026-09-01T21:00:00Z"),
    });
  });
});
