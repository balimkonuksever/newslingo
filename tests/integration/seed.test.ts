import { beforeEach, describe, expect, it } from "vitest";

import { countWords, estimateReadingMinutes } from "@/lib/reading-time";
import { db } from "@/server/db/client";

import {
  DEMO_ARTICLES,
  DEMO_SOURCE_NAME,
  demoSourceUrl,
} from "../../prisma/fixtures/articles";
import { REFERENCE_CATEGORIES } from "../../prisma/reference/categories";
import { editorialVocabularyRows } from "../../prisma/editorial-dictionary";
import {
  DEMO_DICTIONARY,
  DEMO_SENSE_CHOICES,
} from "../../prisma/fixtures/dictionary";
import {
  provisionReferenceData,
  seedDemoArticles,
  seedDemoDictionary,
} from "../../prisma/seeders";
import { lookupWord } from "@/server/dictionary/lookup";
import { resetDatabase } from "./database";

const demoParagraphCount = DEMO_ARTICLES.reduce(
  (total, article) => total + article.paragraphs.length,
  0,
);

function snapshotCategories() {
  return db.category.findMany({
    orderBy: { slug: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      displayOrder: true,
      isActive: true,
    },
  });
}

function snapshotArticles() {
  return db.article.findMany({
    orderBy: { slug: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      wordCount: true,
      paragraphs: {
        orderBy: { order: "asc" },
        select: { order: true, english: true, turkish: true },
      },
    },
  });
}

beforeEach(resetDatabase);

describe("reference provisioning", () => {
  it("creates the six launch categories and nothing else", async () => {
    await provisionReferenceData(db);

    const categories = await db.category.findMany({
      orderBy: { displayOrder: "asc" },
      select: {
        slug: true,
        name: true,
        description: true,
        displayOrder: true,
        isActive: true,
      },
    });

    expect(categories).toEqual(REFERENCE_CATEGORIES);
    expect(await db.article.count()).toBe(0);
    expect(await db.articleParagraph.count()).toBe(0);
  });

  it("is idempotent and keeps category ids stable", async () => {
    await provisionReferenceData(db);
    const first = await snapshotCategories();

    await provisionReferenceData(db);

    expect(await snapshotCategories()).toEqual(first);
  });

  it("restores reference fields that were changed in the database", async () => {
    await provisionReferenceData(db);
    await db.category.update({
      where: { slug: "ai" },
      data: { name: "Renamed", displayOrder: 99, isActive: false },
    });

    await provisionReferenceData(db);

    expect(
      await db.category.findUniqueOrThrow({
        where: { slug: "ai" },
        select: { name: true, displayOrder: true, isActive: true },
      }),
    ).toEqual({ name: "AI", displayOrder: 1, isActive: true });
  });
});

describe("demo seed", () => {
  it("refuses to run before the reference categories exist", async () => {
    await expect(seedDemoArticles(db)).rejects.toThrow(
      "Run pnpm db:seed:reference",
    );
    expect(await db.article.count()).toBe(0);
  });

  it("seeds every fixture as a published, attributed article with ordered paragraph pairs", async () => {
    await provisionReferenceData(db);
    await seedDemoArticles(db);

    const articles = await db.article.findMany({
      include: {
        category: { select: { slug: true } },
        paragraphs: { orderBy: { order: "asc" } },
      },
    });

    expect(articles).toHaveLength(DEMO_ARTICLES.length);

    for (const fixture of DEMO_ARTICLES) {
      const article = articles.find(({ slug }) => slug === fixture.slug);
      const wordCount = fixture.paragraphs.reduce(
        (total, { english }) => total + countWords(english),
        0,
      );

      expect(article, fixture.slug).toMatchObject({
        title: fixture.title,
        shortSummary: fixture.shortSummary,
        difficulty: fixture.difficulty,
        status: "PUBLISHED",
        category: { slug: fixture.categorySlug },
        sourceName: DEMO_SOURCE_NAME,
        sourceUrl: demoSourceUrl(fixture.slug),
        sourceImageUrl: null,
        sourcePublishedAt: fixture.sourcePublishedAt,
        publishedOnSiteAt: fixture.publishedOnSiteAt,
        wordCount,
        readingTimeMinutes: estimateReadingMinutes(wordCount),
      });
      expect(
        article?.paragraphs.map(({ order, english, turkish }) => ({
          order,
          english,
          turkish,
        })),
      ).toEqual(
        fixture.paragraphs.map((paragraph, index) => ({
          order: index + 1,
          ...paragraph,
        })),
      );
    }
  });

  it("is idempotent", async () => {
    await provisionReferenceData(db);
    await seedDemoArticles(db);
    const first = await snapshotArticles();

    await seedDemoArticles(db);

    const second = await snapshotArticles();
    expect(second).toEqual(first);
    expect(await db.articleParagraph.count()).toBe(demoParagraphCount);
  });

  it("restores a demo article that was edited in the database", async () => {
    await provisionReferenceData(db);
    await seedDemoArticles(db);
    const expected = await snapshotArticles();
    const [fixture] = DEMO_ARTICLES;
    const article = await db.article.update({
      where: { slug: fixture.slug },
      data: { title: "Edited", status: "ARCHIVED" },
    });
    await db.articleParagraph.deleteMany({
      where: { articleId: article.id, order: 1 },
    });

    await seedDemoArticles(db);

    expect(await snapshotArticles()).toEqual(expected);
  });
});

describe("demo dictionary seeding", () => {
  const expectedRows = editorialVocabularyRows(
    DEMO_ARTICLES,
    DEMO_DICTIONARY,
    DEMO_SENSE_CHOICES,
  ).length;

  async function seedEverything() {
    await provisionReferenceData(db);
    await seedDemoArticles(db);
    return seedDemoDictionary(db);
  }

  it("stores an editorial entry for every word and can run twice", async () => {
    await expect(seedEverything()).resolves.toEqual({
      entries: expectedRows,
      senses: DEMO_DICTIONARY.length,
    });
    await seedDemoDictionary(db);

    await expect(
      db.vocabularyEntry.count({ where: { provider: "editorial" } }),
    ).resolves.toBe(expectedRows);
  });

  it("answers a reader's lookup without any provider", async () => {
    await seedEverything();
    const [river] = DEMO_ARTICLES;
    const english = river.paragraphs[0].english;
    const start = english.indexOf("agreement");

    await expect(
      lookupWord(
        {
          articleSlug: river.slug,
          paragraphOrder: 1,
          start,
          end: start + "agreement".length,
        },
        { provider: null, log: () => {} },
      ),
    ).resolves.toEqual({
      entry: expect.objectContaining({
        word: "agreement",
        lemma: "agreement",
        turkishMeaning: "anlaşma",
      }),
    });
  });
});
