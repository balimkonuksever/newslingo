import { describe, expect, it } from "vitest";

import {
  adminArticlesHref,
  parseAdminArticleFilters,
} from "./admin-article-filters";

const categories = ["ai", "world"];

describe("parseAdminArticleFilters", () => {
  it("returns no filters for an empty query", () => {
    expect(parseAdminArticleFilters({}, categories)).toEqual({});
  });

  it("keeps a known status and category", () => {
    expect(
      parseAdminArticleFilters(
        { status: "draft", category: "world" },
        categories,
      ),
    ).toEqual({ status: "DRAFT", category: "world" });
    expect(parseAdminArticleFilters({ status: "failed" }, categories)).toEqual({
      status: "FAILED",
    });
  });

  it("drops empty, unknown and differently written values", () => {
    expect(
      parseAdminArticleFilters(
        { status: "DRAFT", category: "World" },
        categories,
      ),
    ).toEqual({});
    expect(
      parseAdminArticleFilters({ status: "deleted", category: "" }, categories),
    ).toEqual({});
  });

  it("uses the first of repeated values", () => {
    expect(
      parseAdminArticleFilters(
        { status: ["archived", "draft"], category: ["ai", "world"] },
        categories,
      ),
    ).toEqual({ status: "ARCHIVED", category: "ai" });
  });
});

describe("adminArticlesHref", () => {
  it("writes the filters back into the list's URL", () => {
    expect(adminArticlesHref({})).toBe("/admin/articles");
    expect(adminArticlesHref({ status: "PUBLISHED" })).toBe(
      "/admin/articles?status=published",
    );
    expect(adminArticlesHref({ status: "DRAFT", category: "world" })).toBe(
      "/admin/articles?status=draft&category=world",
    );
  });

  it("round-trips through the parser", () => {
    const filters = { status: "ARCHIVED", category: "ai" } as const;
    const query = new URL(adminArticlesHref(filters), "http://localhost")
      .searchParams;

    expect(
      parseAdminArticleFilters(Object.fromEntries(query), categories),
    ).toEqual(filters);
  });
});
