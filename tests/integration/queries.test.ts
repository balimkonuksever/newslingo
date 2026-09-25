import { beforeEach, describe, expect, it } from "vitest";

import {
  getFeaturedAndLatestArticles,
  getPublicArticleBySlug,
  listPublicArticles,
} from "@/server/articles/queries";
import {
  getCategoryWithArticles,
  listCategoriesWithArticleCounts,
} from "@/server/categories/queries";
import { db } from "@/server/db/client";

import { DEMO_ARTICLES } from "../../prisma/fixtures/articles";
import { REFERENCE_CATEGORIES } from "../../prisma/reference/categories";
import { provisionReferenceData, seedDemoArticles } from "../../prisma/seeders";
import { createArticle, createCategory, resetDatabase } from "./database";

const at = (day: number) => new Date(Date.UTC(2026, 8, day, 12));

beforeEach(resetDatabase);

/**
 * One visible category with public articles published on 1–3 September, plus
 * articles that must never be public: a draft, an archived article, and a
 * published article in an inactive category.
 */
async function createMixedArticles() {
  const category = await createCategory({ slug: "visible", displayOrder: 1 });
  const hidden = await createCategory({
    slug: "hidden",
    displayOrder: 2,
    isActive: false,
  });

  await createArticle(category.id, {
    slug: "oldest",
    sourcePublishedAt: at(1),
    publishedOnSiteAt: at(1),
  });
  await createArticle(category.id, {
    slug: "newest",
    sourcePublishedAt: at(3),
    publishedOnSiteAt: at(3),
  });
  await createArticle(category.id, {
    slug: "middle",
    sourcePublishedAt: at(2),
    publishedOnSiteAt: at(2),
  });
  await createArticle(category.id, {
    slug: "draft",
    status: "DRAFT",
    sourcePublishedAt: at(9),
    publishedOnSiteAt: null,
  });
  await createArticle(category.id, {
    slug: "archived",
    status: "ARCHIVED",
    sourcePublishedAt: at(9),
    publishedOnSiteAt: at(9),
  });
  await createArticle(hidden.id, {
    slug: "in-hidden-category",
    sourcePublishedAt: at(9),
    publishedOnSiteAt: at(9),
  });

  return { category, hidden };
}

describe("getFeaturedAndLatestArticles", () => {
  it("features the newest public article and lists the rest newest first", async () => {
    await createMixedArticles();

    const { featured, latest } = await getFeaturedAndLatestArticles(10);

    expect(featured?.slug).toBe("newest");
    expect(latest.map(({ slug }) => slug)).toEqual(["middle", "oldest"]);
  });

  it("limits the latest list without counting the featured article", async () => {
    await createMixedArticles();

    const { featured, latest } = await getFeaturedAndLatestArticles(1);

    expect(featured?.slug).toBe("newest");
    expect(latest.map(({ slug }) => slug)).toEqual(["middle"]);
  });

  it("returns an empty result when nothing is public", async () => {
    const category = await createCategory();
    await createArticle(category.id, {
      status: "DRAFT",
      publishedOnSiteAt: null,
    });

    expect(await getFeaturedAndLatestArticles(5)).toEqual({
      featured: null,
      latest: [],
    });
  });

  it("returns card fields only", async () => {
    const category = await createCategory({ slug: "ai", name: "AI" });
    await createArticle(category.id, {
      slug: "card",
      title: "Card title",
      shortSummary: "Summary",
      difficulty: "C1",
      sourceName: "Source",
      sourcePublishedAt: at(4),
      readingTimeMinutes: 3,
    });

    const { featured } = await getFeaturedAndLatestArticles(0);

    expect(featured).toEqual({
      slug: "card",
      title: "Card title",
      shortSummary: "Summary",
      difficulty: "C1",
      sourceName: "Source",
      sourcePublishedAt: at(4),
      readingTimeMinutes: 3,
      category: { slug: "ai", name: "AI" },
    });
  });
});

describe("listPublicArticles", () => {
  async function createFilterFixtures() {
    const world = await createCategory({ slug: "world" });
    const ai = await createCategory({ slug: "ai" });

    await createArticle(world.id, {
      slug: "world-a2-short",
      difficulty: "A2",
      readingTimeMinutes: 2,
      sourcePublishedAt: new Date("2026-09-10T08:00:00Z"),
    });
    await createArticle(world.id, {
      slug: "world-c1-long",
      difficulty: "C1",
      readingTimeMinutes: 7,
      sourcePublishedAt: new Date("2026-09-12T08:00:00Z"),
    });
    await createArticle(ai.id, {
      slug: "ai-b2-medium",
      difficulty: "B2",
      readingTimeMinutes: 5,
      sourcePublishedAt: new Date("2026-09-11T08:00:00Z"),
    });
    await createArticle(ai.id, {
      slug: "ai-b2-draft",
      status: "DRAFT",
      difficulty: "B2",
      readingTimeMinutes: 5,
      publishedOnSiteAt: null,
    });
  }

  const slugsFor = async (filters: Parameters<typeof listPublicArticles>[0]) =>
    (await listPublicArticles(filters, 20)).map(({ slug }) => slug);

  it("lists every public article, newest source first, without filters", async () => {
    await createFilterFixtures();

    expect(await slugsFor({})).toEqual([
      "world-c1-long",
      "ai-b2-medium",
      "world-a2-short",
    ]);
  });

  it.each([
    [{ category: "ai" }, ["ai-b2-medium"]],
    [{ level: "A2" }, ["world-a2-short"]],
    [{ length: "short" }, ["world-a2-short"]],
    [{ length: "medium" }, ["ai-b2-medium"]],
    [{ length: "long" }, ["world-c1-long"]],
    [{ category: "world", level: "C1" }, ["world-c1-long"]],
    [{ category: "ai", level: "A2" }, []],
  ] as const)("filters by %o", async (filters, expected) => {
    await createFilterFixtures();

    expect(await slugsFor(filters)).toEqual(expected);
  });

  it("includes whole Istanbul days at both ends of a date range", async () => {
    const category = await createCategory();
    // 20:59 UTC on 9 Sept is 23:59 in Istanbul; 21:00 UTC is already 10 Sept.
    await createArticle(category.id, {
      slug: "late-on-the-9th",
      sourcePublishedAt: new Date("2026-09-09T20:59:00Z"),
    });
    await createArticle(category.id, {
      slug: "first-minute-of-the-10th",
      sourcePublishedAt: new Date("2026-09-09T21:00:00Z"),
    });
    await createArticle(category.id, {
      slug: "last-minute-of-the-11th",
      sourcePublishedAt: new Date("2026-09-11T20:59:00Z"),
    });
    await createArticle(category.id, {
      slug: "first-minute-of-the-12th",
      sourcePublishedAt: new Date("2026-09-11T21:00:00Z"),
    });

    expect(await slugsFor({ from: "2026-09-10", to: "2026-09-11" })).toEqual([
      "last-minute-of-the-11th",
      "first-minute-of-the-10th",
    ]);
  });

  it("never returns articles from inactive categories or non-public articles", async () => {
    await createMixedArticles();

    expect(await slugsFor({})).toEqual(["newest", "middle", "oldest"]);
    expect(await slugsFor({ category: "hidden" })).toEqual([]);
  });

  it("limits the number of results", async () => {
    await createFilterFixtures();

    expect(await listPublicArticles({}, 2)).toHaveLength(2);
  });
});

describe("listCategoriesWithArticleCounts", () => {
  it("lists active categories in display order with their public article counts", async () => {
    const { category } = await createMixedArticles();
    // Created last but displayed first.
    await createCategory({ slug: "empty", name: "Empty", displayOrder: 3 });
    await db.category.update({
      where: { id: category.id },
      data: { displayOrder: 4 },
    });

    expect(await listCategoriesWithArticleCounts()).toEqual([
      {
        slug: "empty",
        name: "Empty",
        description: null,
        publicArticleCount: 0,
      },
      {
        slug: "visible",
        name: category.name,
        description: null,
        publicArticleCount: 3,
      },
    ]);
  });
});

describe("getCategoryWithArticles", () => {
  it("returns only the category's own public articles, newest source first", async () => {
    await createMixedArticles();
    const other = await createCategory({ slug: "other" });
    await createArticle(other.id, {
      slug: "other-story",
      sourcePublishedAt: at(5),
    });

    const result = await getCategoryWithArticles("visible", 10);

    expect(result?.slug).toBe("visible");
    expect(result?.articles.map(({ slug }) => slug)).toEqual([
      "newest",
      "middle",
      "oldest",
    ]);
  });

  it("limits the number of articles", async () => {
    await createMixedArticles();

    const result = await getCategoryWithArticles("visible", 2);

    expect(result?.articles.map(({ slug }) => slug)).toEqual([
      "newest",
      "middle",
    ]);
  });

  it.each(["hidden", "unknown", "Visible", "../visible", ""])(
    "returns null for the unknown, inactive or malformed slug %j",
    async (slug) => {
      await createMixedArticles();

      expect(await getCategoryWithArticles(slug, 10)).toBeNull();
    },
  );
});

describe("getPublicArticleBySlug", () => {
  it("returns the article with paragraphs in ascending order", async () => {
    const category = await createCategory();
    const article = await createArticle(category.id, { slug: "ordered" });

    // Inserted out of order on purpose.
    for (const order of [3, 1, 2]) {
      await db.articleParagraph.create({
        data: {
          articleId: article.id,
          order,
          english: `English ${order}`,
          turkish: `Türkçe ${order}`,
        },
      });
    }

    const result = await getPublicArticleBySlug("ordered");

    expect(result?.paragraphs).toEqual([
      { order: 1, english: "English 1", turkish: "Türkçe 1" },
      { order: 2, english: "English 2", turkish: "Türkçe 2" },
      { order: 3, english: "English 3", turkish: "Türkçe 3" },
    ]);
    expect(result).toMatchObject({
      slug: "ordered",
      sourceUrl: article.sourceUrl,
      wordCount: article.wordCount,
    });
  });

  it.each([
    "draft",
    "archived",
    "in-hidden-category",
    "unknown",
    "Newest",
    "newest/",
  ])("returns null for %j", async (slug) => {
    await createMixedArticles();

    expect(await getPublicArticleBySlug(slug)).toBeNull();
  });
});

describe("queries against the seeded demo dataset", () => {
  beforeEach(async () => {
    await provisionReferenceData(db);
    await seedDemoArticles(db);
  });

  it("lists all six categories with one article each", async () => {
    const categories = await listCategoriesWithArticleCounts();

    expect(categories.map(({ slug }) => slug)).toEqual(
      REFERENCE_CATEGORIES.map(({ slug }) => slug),
    );
    expect(categories.every((c) => c.publicArticleCount >= 1)).toBe(true);
  });

  it("orders demo articles by site publication time, newest featured", async () => {
    const newest = DEMO_ARTICLES.toSorted(
      (a, b) => b.publishedOnSiteAt.getTime() - a.publishedOnSiteAt.getTime(),
    );

    const { featured, latest } = await getFeaturedAndLatestArticles(
      DEMO_ARTICLES.length,
    );

    expect([featured, ...latest].map((article) => article?.slug)).toEqual(
      newest.map(({ slug }) => slug),
    );
  });

  it("reaches every demo article through its category and its slug", async () => {
    for (const fixture of DEMO_ARTICLES) {
      const category = await getCategoryWithArticles(fixture.categorySlug, 20);
      const article = await getPublicArticleBySlug(fixture.slug);

      expect(category?.articles.map(({ slug }) => slug)).toContain(
        fixture.slug,
      );
      expect(
        article?.paragraphs.map(({ english, turkish }) => ({
          english,
          turkish,
        })),
      ).toEqual(fixture.paragraphs);
    }
  });
});
