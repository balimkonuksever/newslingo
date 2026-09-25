import { beforeEach, describe, expect, it } from "vitest";

import {
  getFeaturedAndLatestArticles,
  getPublicArticleBySlug,
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
