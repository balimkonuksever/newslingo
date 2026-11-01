import { gzipSync } from "node:zlib";

import { beforeEach, describe, expect, it } from "vitest";

import { createArticleSearch } from "@/lib/search";
import { buildSearchIndex } from "@/server/articles/search-index";
import { db } from "@/server/db/client";

import { DEMO_ARTICLES } from "../../prisma/fixtures/articles";
import { provisionReferenceData, seedDemoArticles } from "../../prisma/seeders";
import {
  createArticle,
  createCategory,
  createExplainer,
  resetDatabase,
} from "./database";

// The search index (M9): every public article's card and the text search
// looks at, so the static site searches without a server.

beforeEach(resetDatabase);

const at = (day: number) => new Date(Date.UTC(2026, 8, day, 12));

describe("buildSearchIndex", () => {
  it("holds every public article, newest first, and nothing else", async () => {
    const category = await createCategory();
    const hidden = await createCategory({ isActive: false });

    await createArticle(category.id, {
      slug: "older",
      sourcePublishedAt: at(1),
    });
    await createArticle(category.id, {
      slug: "newer",
      sourcePublishedAt: at(2),
    });
    await createArticle(category.id, {
      slug: "draft",
      status: "DRAFT",
      publishedOnSiteAt: null,
    });
    await createArticle(category.id, { slug: "archived", status: "ARCHIVED" });
    await createArticle(hidden.id, { slug: "in-hidden-category" });

    const { articles } = await buildSearchIndex();

    expect(articles.map(({ slug }) => slug)).toEqual(["newer", "older"]);
  });

  it("keeps the card, the reference publishers and each text's terms once", async () => {
    const category = await createCategory({ slug: "beauty", name: "Beauty" });
    const explainer = await createExplainer(category.id, {
      slug: "how-perfume-is-made",
      title: "How Perfume Is Made",
      shortSummary: "Flowers, oils and time.",
      datedAt: at(5),
    });

    await db.articleParagraph.createMany({
      data: [
        {
          articleId: explainer.id,
          order: 1,
          english: "Perfume starts with flowers.",
          turkish: "Parfüm çiçeklerle başlar.",
        },
        {
          articleId: explainer.id,
          order: 2,
          english: "Flowers give oils.",
          turkish: "Çiçekler yağ verir.",
        },
      ],
    });
    await db.articleReference.createMany({
      data: [1, 2, 3].map((order) => ({
        articleId: explainer.id,
        order,
        title: `Reference ${order}`,
        publisher: order === 3 ? "Britannica" : "BBC",
        url: `https://test.newslingo.example/references/${order}`,
        checkedAt: at(5),
      })),
    });

    const { articles } = await buildSearchIndex();

    expect(articles).toEqual([
      {
        slug: "how-perfume-is-made",
        title: "How Perfume Is Made",
        shortSummary: "Flowers, oils and time.",
        difficulty: "B1",
        kind: "EXPLAINER",
        sourceName: null,
        datedAt: at(5).toISOString(),
        readingTimeMinutes: 1,
        category: { slug: "beauty", name: "Beauty" },
        referencePublishers: ["BBC", "Britannica"],
        english: "flowers give oils perfume starts with",
        turkish: "baslar cicekler ciceklerle parfum verir yag",
      },
    ]);
  });
});

describe("searching the demo articles", () => {
  beforeEach(async () => {
    await provisionReferenceData(db);
    await seedDemoArticles(db);
  });

  const slug = (title: string) =>
    DEMO_ARTICLES.find((article) => article.title.includes(title))!.slug;

  it.each([
    ["skincare", "Skincare Routines"],
    ["Bicycle", "by Bicycle"],
    ["repair phones", "Repairing Their Phones"],
    ["cinema", "Old Cinema"],
    ["sinema", "Old Cinema"],
    ["bisiklet", "by Bicycle"],
    ["AI weather", "AI Weather Forecasts"],
  ])("finds the article about %s first", async (query, title) => {
    const search = createArticleSearch((await buildSearchIndex()).articles);

    expect(search(query)[0]?.slug).toBe(slug(title));
  });

  it("finds a category's articles by its name", async () => {
    const search = createArticleSearch((await buildSearchIndex()).articles);
    const beauty = DEMO_ARTICLES.filter(
      ({ categorySlug }) => categorySlug === "beauty",
    ).map((article) => article.slug);

    expect(search("beauty").map((article) => article.slug)).toEqual(
      expect.arrayContaining(beauty),
    );
  });

  it("stays within the page budget at 15 articles per category", async () => {
    const index = await buildSearchIndex();
    const compressed = gzipSync(JSON.stringify(index)).length;
    const perArticle = compressed / index.articles.length;

    // 175 KB is the page budget's script download (IMPLEMENTATION_PLAN.md §17).
    expect(perArticle * 15 * 6).toBeLessThan(175 * 1024);
  });
});
