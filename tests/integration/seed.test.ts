import { beforeEach, describe, expect, it } from "vitest";

import { countWords, estimateReadingMinutes } from "@/lib/reading-time";
import { db } from "@/server/db/client";

import {
  DEMO_ARTICLES,
  DEMO_SOURCE_NAME,
  demoDatedAt,
  demoSourceUrl,
} from "../../prisma/fixtures/articles";
import { REFERENCE_CATEGORIES } from "../../prisma/reference/categories";
import { REFERENCE_EXPRESSIONS } from "../../prisma/reference/expressions";
import { editorialVocabularyRows } from "../../prisma/editorial-dictionary";
import {
  referenceExpressionData,
  resolveExpressionOccurrences,
} from "../../prisma/expression-library";
import {
  DEMO_DICTIONARY,
  DEMO_SENSE_CHOICES,
} from "../../prisma/fixtures/dictionary";
import { DEMO_DRAFTS } from "../../prisma/fixtures/drafts";
import { DEMO_EXPRESSION_OCCURRENCES } from "../../prisma/fixtures/expression-occurrences";
import { DEMO_KEY_VOCABULARY } from "../../prisma/fixtures/key-vocabulary";
import { resolveKeyVocabulary } from "../../prisma/key-vocabulary";
import {
  provisionReferenceData,
  seedDemoArticles,
  seedDemoDictionary,
  seedDemoDrafts,
  seedDemoExpressions,
  seedDemoKeyVocabulary,
} from "../../prisma/seeders";
import { publicationProblems } from "@/domain/moderation";
import { publicArticleWhere } from "@/server/articles/queries";
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

function snapshotExpressions() {
  return db.expression.findMany({
    orderBy: { slug: "asc" },
    omit: { createdAt: true, updatedAt: true },
    include: {
      categories: {
        orderBy: { categoryId: "asc" },
        select: { categoryId: true, displayOrder: true, isFeatured: true },
      },
    },
  });
}

/** The expression slugs on a category's page, in display order. */
async function categoryPage(slug: string) {
  const links = await db.categoryExpression.findMany({
    where: { category: { slug } },
    orderBy: { displayOrder: "asc" },
    select: { displayOrder: true, expression: { select: { slug: true } } },
  });

  expect(links.map(({ displayOrder }) => displayOrder)).toEqual(
    links.map((_, index) => index + 1),
  );

  return links.map(({ expression }) => expression.slug);
}

beforeEach(resetDatabase);

describe("reference provisioning", () => {
  it("creates the six launch categories and no demo content", async () => {
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
    expect(await db.articleExpression.count()).toBe(0);
  });

  it("stores every Real English card and each category's page in library order", async () => {
    await provisionReferenceData(db);

    const expected = referenceExpressionData(REFERENCE_EXPRESSIONS);
    const stored = await db.expression.findMany({
      include: {
        categories: {
          select: { displayOrder: true, category: { select: { slug: true } } },
        },
      },
    });
    const bySlug = (a: { slug: string }, b: { slug: string }) =>
      a.slug.localeCompare(b.slug);

    expect(stored).toHaveLength(expected.length);
    for (const { categories, ...card } of expected) {
      const row = stored.find(({ slug }) => slug === card.slug);

      expect(row, card.slug).toMatchObject(card);
      expect(
        row?.categories
          .map(({ category, displayOrder }) => ({
            slug: category.slug,
            displayOrder,
          }))
          .sort(bySlug),
        card.slug,
      ).toEqual([...categories].sort(bySlug));
    }

    for (const { slug } of REFERENCE_CATEGORIES) {
      expect(await categoryPage(slug), slug).toEqual(
        REFERENCE_EXPRESSIONS.filter(({ categories }) =>
          categories.includes(slug),
        ).map((card) => card.slug),
      );
    }
  });

  it("is idempotent and keeps category and expression ids stable", async () => {
    await provisionReferenceData(db);
    const categories = await snapshotCategories();
    const expressions = await snapshotExpressions();

    await provisionReferenceData(db);

    expect(await snapshotCategories()).toEqual(categories);
    expect(await snapshotExpressions()).toEqual(expressions);
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

  it("restores cards and category links that were changed in the database", async () => {
    await provisionReferenceData(db);
    const expected = await snapshotExpressions();
    const [first, second] = await categoryPage("entertainment");
    const ai = await db.category.findUniqueOrThrow({ where: { slug: "ai" } });

    await db.expression.update({
      where: { slug: first },
      data: { turkishMeaning: "Edited", literalWarning: null },
    });
    await db.categoryExpression.deleteMany({
      where: { expression: { slug: second } },
    });
    await db.categoryExpression.create({
      data: {
        categoryId: ai.id,
        expressionId: expected.find(({ slug }) => slug === first)!.id,
        displayOrder: 1,
        isFeatured: true,
      },
    });

    await provisionReferenceData(db);

    expect(await snapshotExpressions()).toEqual(expected);
  });
});

describe("demo seed", () => {
  it("refuses to run before the reference categories exist", async () => {
    await expect(seedDemoArticles(db)).rejects.toThrow(
      "Run pnpm db:seed:reference",
    );
    expect(await db.article.count()).toBe(0);
  });

  it("seeds every fixture as a published, credited article with ordered paragraph pairs", async () => {
    await provisionReferenceData(db);
    await seedDemoArticles(db);

    const articles = await db.article.findMany({
      include: {
        category: { select: { slug: true } },
        paragraphs: { orderBy: { order: "asc" } },
        references: { orderBy: { order: "asc" } },
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
        kind: fixture.kind,
        ...(fixture.kind === "NEWS"
          ? {
              sourceName: DEMO_SOURCE_NAME,
              sourceUrl: demoSourceUrl(fixture.slug),
              sourcePublishedAt: fixture.sourcePublishedAt,
            }
          : { sourceName: null, sourceUrl: null, sourcePublishedAt: null }),
        sourceLicence: null,
        sourceImageUrl: null,
        datedAt: demoDatedAt(fixture),
        publishedOnSiteAt: fixture.publishedOnSiteAt,
        wordCount,
        readingTimeMinutes: estimateReadingMinutes(wordCount),
      });
      expect(
        article?.references.map(
          ({ order, title, publisher, url, checkedAt }) => ({
            order,
            title,
            publisher,
            url,
            checkedAt,
          }),
        ),
      ).toEqual(
        fixture.kind === "EXPLAINER"
          ? fixture.references.map((reference, index) => ({
              order: index + 1,
              ...reference,
            }))
          : [],
      );
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
    expect(await db.articleReference.count()).toBe(
      DEMO_ARTICLES.reduce(
        (total, fixture) =>
          total +
          (fixture.kind === "EXPLAINER" ? fixture.references.length : 0),
        0,
      ),
    );
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

describe("demo draft seeding", () => {
  beforeEach(resetDatabase);

  it("writes each demo draft unpublished, out of public view, and ready to publish", async () => {
    await provisionReferenceData(db);

    await expect(seedDemoDrafts(db)).resolves.toMatchObject({
      drafts: DEMO_DRAFTS.length,
    });

    for (const fixture of DEMO_DRAFTS) {
      const draft = await db.article.findUniqueOrThrow({
        where: { slug: fixture.slug },
        include: {
          category: { select: { isActive: true } },
          paragraphs: { orderBy: { order: "asc" } },
          references: true,
        },
      });

      expect(draft).toMatchObject({
        status: "DRAFT",
        publishedOnSiteAt: null,
        sourceName: DEMO_SOURCE_NAME,
        sourceUrl: demoSourceUrl(fixture.slug),
      });
      expect(
        await db.article.count({
          where: { id: draft.id, ...publicArticleWhere },
        }),
      ).toBe(0);
      expect(
        publicationProblems({
          ...draft,
          categoryIsActive: draft.category.isActive,
          expressions: [],
        }),
      ).toEqual([]);
    }
  });

  it("makes a published demo draft a draft again", async () => {
    await provisionReferenceData(db);
    await seedDemoDrafts(db);
    const [fixture] = DEMO_DRAFTS;
    await db.article.update({
      where: { slug: fixture?.slug },
      data: { status: "PUBLISHED", publishedOnSiteAt: new Date() },
    });

    await seedDemoDrafts(db);

    expect(
      await db.article.findUniqueOrThrow({ where: { slug: fixture?.slug } }),
    ).toMatchObject({ status: "DRAFT", publishedOnSiteAt: null });
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

describe("demo expression seeding", () => {
  const expected = resolveExpressionOccurrences(
    DEMO_ARTICLES,
    REFERENCE_EXPRESSIONS,
    DEMO_EXPRESSION_OCCURRENCES,
  );

  async function seedEverything() {
    await provisionReferenceData(db);
    await seedDemoArticles(db);
    return seedDemoExpressions(db);
  }

  async function storedOccurrences() {
    const rows = await db.articleExpression.findMany({
      select: {
        surfaceText: true,
        sentence: true,
        startOffset: true,
        endOffset: true,
        displayOrder: true,
        source: true,
        article: { select: { slug: true } },
        expression: { select: { slug: true } },
        paragraph: { select: { order: true, english: true } },
      },
    });

    return rows
      .map((row) => ({
        articleSlug: row.article.slug,
        paragraphOrder: row.paragraph.order,
        expressionSlug: row.expression.slug,
        start: row.startOffset,
        end: row.endOffset,
        surfaceText: row.surfaceText,
        sentence: row.sentence,
        displayOrder: row.displayOrder,
        source: row.source,
        textAtOffsets: row.paragraph.english.slice(
          row.startOffset,
          row.endOffset,
        ),
      }))
      .sort(
        (a, b) =>
          a.articleSlug.localeCompare(b.articleSlug) ||
          a.displayOrder - b.displayOrder,
      );
  }

  it("marks each listed occurrence at its exact place in the article", async () => {
    await expect(seedEverything()).resolves.toEqual({
      occurrences: expected.length,
    });

    const stored = await storedOccurrences();

    expect(stored).toHaveLength(expected.length);
    for (const occurrence of stored) {
      expect(occurrence.textAtOffsets).toBe(occurrence.surfaceText);
      expect(occurrence.source).toBe("editorial");
      expect(
        expected.find(
          ({ articleSlug, displayOrder }) =>
            articleSlug === occurrence.articleSlug &&
            displayOrder === occurrence.displayOrder,
        ),
      ).toEqual({
        articleSlug: occurrence.articleSlug,
        paragraphOrder: occurrence.paragraphOrder,
        expressionSlug: occurrence.expressionSlug,
        start: occurrence.start,
        end: occurrence.end,
        surfaceText: occurrence.surfaceText,
        sentence: occurrence.sentence,
        displayOrder: occurrence.displayOrder,
      });
    }
  });

  it("can run again, including after the demo articles are reseeded", async () => {
    await seedEverything();
    const first = await storedOccurrences();

    await seedDemoExpressions(db);
    expect(await storedOccurrences()).toEqual(first);

    // Reseeding the articles replaces their paragraphs, which removes the
    // occurrences with them; the next expression seed puts them back.
    await seedDemoArticles(db);
    expect(await db.articleExpression.count()).toBe(0);
    await seedDemoExpressions(db);
    expect(await storedOccurrences()).toEqual(first);
  });

  it("refuses to run before the reference expressions exist", async () => {
    await provisionReferenceData(db);
    await seedDemoArticles(db);
    await db.expression.deleteMany();

    await expect(seedDemoExpressions(db)).rejects.toThrow(
      "Run pnpm db:seed:reference",
    );
  });
});

describe("demo key vocabulary seeding", () => {
  const expected = resolveKeyVocabulary(DEMO_ARTICLES, DEMO_KEY_VOCABULARY);

  async function seedEverything() {
    await provisionReferenceData(db);
    await seedDemoArticles(db);
    await seedDemoDictionary(db);
    return seedDemoKeyVocabulary(db);
  }

  it("links each chosen word to its entry for that sentence, in reading order", async () => {
    await expect(seedEverything()).resolves.toEqual({ words: expected.length });

    const rows = await db.articleVocabulary.findMany({
      select: {
        displayOrder: true,
        sourceSentence: true,
        source: true,
        article: { select: { slug: true } },
        vocabularyEntry: {
          select: {
            surfaceWord: true,
            normalizedWord: true,
            contextHash: true,
            provider: true,
          },
        },
      },
    });

    expect(rows).toHaveLength(expected.length);
    for (const word of expected) {
      expect(
        rows.find(
          (row) =>
            row.article.slug === word.articleSlug &&
            row.displayOrder === word.displayOrder,
        ),
        word.surfaceWord,
      ).toEqual({
        displayOrder: word.displayOrder,
        sourceSentence: word.sourceSentence,
        source: "editorial",
        article: { slug: word.articleSlug },
        vocabularyEntry: {
          surfaceWord: word.surfaceWord,
          normalizedWord: word.normalizedWord,
          contextHash: word.contextHash,
          provider: "editorial",
        },
      });
    }
  });

  it("lets a reseeded dictionary rewrite the entries it points at", async () => {
    await seedEverything();
    const [word] = expected;
    const key = {
      normalizedWord: word.normalizedWord,
      contextHash: word.contextHash,
    };
    const { turkishMeaning } = await db.vocabularyEntry.findFirstOrThrow({
      where: key,
    });
    await db.vocabularyEntry.updateMany({
      where: key,
      data: { turkishMeaning: "Outdated" },
    });

    await seedDemoDictionary(db);
    await seedDemoKeyVocabulary(db);

    await expect(
      db.vocabularyEntry.findFirstOrThrow({ where: key }),
    ).resolves.toMatchObject({ turkishMeaning });
    expect(await db.articleVocabulary.count()).toBe(expected.length);
  });

  it("refuses to run before the dictionary is seeded", async () => {
    await provisionReferenceData(db);
    await seedDemoArticles(db);

    await expect(seedDemoKeyVocabulary(db)).rejects.toThrow(
      "Seed the demo dictionary before the key vocabulary",
    );
  });
});
