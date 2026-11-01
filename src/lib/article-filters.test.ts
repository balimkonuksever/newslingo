import { describe, expect, it } from "vitest";

import {
  datedAtRange,
  filterArticles,
  hasActiveFilters,
  parseArticleFilters,
  searchParamsRecord,
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

  it.each([
    ["an inherited property name as a length", { length: "toString" }],
    ["a month that does not exist", { from: "2026-13-01" }],
    ["a date without leading zeros", { to: "2026-1-5" }],
    ["a date with a time", { from: "2026-01-05T10:00" }],
  ])("drops %s", (_name, searchParams) => {
    expect(parseArticleFilters(searchParams, categories)).toEqual({});
  });

  it("keeps a leap day only in a leap year", () => {
    expect(
      parseArticleFilters({ from: "2028-02-29", to: "2026-02-29" }, categories),
    ).toEqual({ from: "2028-02-29" });
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

describe("datedAtRange", () => {
  it("is undefined without dates", () => {
    expect(datedAtRange({ level: "A2" })).toBeUndefined();
  });

  it("covers whole Istanbul days, including the last one", () => {
    expect(datedAtRange({ from: "2026-09-01", to: "2026-09-02" })).toEqual({
      gte: new Date("2026-08-31T21:00:00Z"),
      lt: new Date("2026-09-02T21:00:00Z"),
    });
  });

  it("supports open-ended ranges", () => {
    expect(datedAtRange({ from: "2026-09-01" })).toEqual({
      gte: new Date("2026-08-31T21:00:00Z"),
    });
    expect(datedAtRange({ to: "2026-09-01" })).toEqual({
      lt: new Date("2026-09-01T21:00:00Z"),
    });
  });
});

describe("searchParamsRecord", () => {
  it("keeps one value as a string and repeated ones as a list", () => {
    expect(
      searchParamsRecord(new URLSearchParams("level=B2&category=ai&level=A2")),
    ).toEqual({ level: ["B2", "A2"], category: "ai" });
  });

  it("feeds parseArticleFilters as the server's search parameters did", () => {
    const params = new URLSearchParams("level=B2&level=A2&from=2026-02-30");

    expect(parseArticleFilters(searchParamsRecord(params), categories)).toEqual(
      { level: "B2" },
    );
  });
});

describe("filterArticles", () => {
  const article = (
    slug: string,
    fields: {
      category?: string;
      difficulty?: "A2" | "B1" | "B2" | "C1";
      readingTimeMinutes?: number;
      datedAt?: string;
    } = {},
  ) => ({
    slug,
    category: { slug: fields.category ?? "ai" },
    difficulty: fields.difficulty ?? "B1",
    readingTimeMinutes: fields.readingTimeMinutes ?? 2,
    datedAt: new Date(fields.datedAt ?? "2026-09-10T09:00:00Z"),
  });
  const slugs = (articles: Array<{ slug: string }>) =>
    articles.map(({ slug }) => slug);

  it("keeps every article without filters, in order", () => {
    const articles = [article("b"), article("a")];

    expect(slugs(filterArticles(articles, {}))).toEqual(["b", "a"]);
  });

  it("filters by category and level together", () => {
    const articles = [
      article("ai-b1"),
      article("ai-c1", { difficulty: "C1" }),
      article("world-c1", { category: "world", difficulty: "C1" }),
    ];

    expect(
      slugs(filterArticles(articles, { category: "world", level: "C1" })),
    ).toEqual(["world-c1"]);
  });

  it("uses the reading-time bands, with an open-ended longest band", () => {
    const articles = [3, 4, 5, 6, 12].map((minutes) =>
      article(`${minutes}`, { readingTimeMinutes: minutes }),
    );

    expect(slugs(filterArticles(articles, { length: "short" }))).toEqual(["3"]);
    expect(slugs(filterArticles(articles, { length: "medium" }))).toEqual([
      "4",
      "5",
    ]);
    expect(slugs(filterArticles(articles, { length: "long" }))).toEqual([
      "6",
      "12",
    ]);
  });

  it("covers whole Istanbul days, as the database query does", () => {
    const articles = [
      // 23:30 on 31 August in Istanbul.
      article("before", { datedAt: "2026-08-31T20:30:00Z" }),
      // 00:30 on 1 September in Istanbul.
      article("first", { datedAt: "2026-08-31T21:30:00Z" }),
      // 23:59 on 2 September in Istanbul.
      article("last", { datedAt: "2026-09-02T20:59:00Z" }),
      article("after", { datedAt: "2026-09-02T21:00:00Z" }),
    ];

    expect(
      slugs(filterArticles(articles, { from: "2026-09-01", to: "2026-09-02" })),
    ).toEqual(["first", "last"]);
  });
});
