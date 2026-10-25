import {
  DICTIONARY_SCHEMA_VERSION,
  EDITORIAL_SOURCE,
} from "../src/domain/dictionary";
import type { PrismaClient } from "../src/generated/prisma/client";
import { countWords, estimateReadingMinutes } from "../src/lib/reading-time";
import { editorialVocabularyRows } from "./editorial-dictionary";
import {
  EDITORIAL_OCCURRENCE_SOURCE,
  referenceExpressionData,
  resolveExpressionOccurrences,
} from "./expression-library";
import {
  DEMO_ARTICLES,
  DEMO_SOURCE_NAME,
  demoSourceUrl,
} from "./fixtures/articles";
import { DEMO_DICTIONARY, DEMO_SENSE_CHOICES } from "./fixtures/dictionary";
import { DEMO_DRAFTS, type DemoDraft } from "./fixtures/drafts";
import { DEMO_EXPRESSION_OCCURRENCES } from "./fixtures/expression-occurrences";
import { DEMO_KEY_VOCABULARY } from "./fixtures/key-vocabulary";
import { resolveKeyVocabulary } from "./key-vocabulary";
import { REFERENCE_CATEGORIES } from "./reference/categories";
import { REFERENCE_EXPRESSIONS } from "./reference/expressions";

/**
 * Upserts the launch categories and the Real English cards by slug in one
 * transaction. Production-safe: it writes no articles and can be rerun at any
 * time. It refuses to write anything if a card is invalid or unreviewed.
 */
export async function provisionReferenceData(db: PrismaClient) {
  const expressions = referenceExpressionData(REFERENCE_EXPRESSIONS);

  await db.$transaction([
    ...REFERENCE_CATEGORIES.map((category) =>
      db.category.upsert({
        where: { slug: category.slug },
        create: category,
        update: category,
      }),
    ),
    // The library owns its cards' category links, so a card taken off a
    // category's page in the library also leaves it here.
    ...expressions.map(({ categories, ...expression }) => {
      const links = categories.map(({ slug, displayOrder }) => ({
        displayOrder,
        category: { connect: { slug } },
      }));

      return db.expression.upsert({
        where: { slug: expression.slug },
        create: { ...expression, categories: { create: links } },
        update: {
          ...expression,
          categories: { deleteMany: {}, create: links },
        },
      });
    }),
  ]);

  return {
    categories: REFERENCE_CATEGORIES.length,
    expressions: expressions.length,
  };
}

/**
 * Upserts the demo articles by slug and replaces their paragraphs, all in one
 * transaction, so reruns never duplicate anything. Requires the reference
 * categories. This function cannot tell which database it is writing to:
 * callers must pass `assertDemoSeedAllowed` first.
 */
export async function seedDemoArticles(db: PrismaClient) {
  return writeDemoArticles(db, DEMO_ARTICLES, "PUBLISHED");
}

/**
 * Writes the demo drafts (M5) as unpublished drafts, returning any that an
 * admin has published or archived to draft. The same caller rules as
 * `seedDemoArticles` apply.
 */
export async function seedDemoDrafts(db: PrismaClient) {
  const { articles, paragraphs } = await writeDemoArticles(
    db,
    DEMO_DRAFTS.map((draft) => ({ ...draft, publishedOnSiteAt: null })),
    "DRAFT",
  );

  return { drafts: articles, paragraphs };
}

async function writeDemoArticles(
  db: PrismaClient,
  fixtures: ReadonlyArray<DemoDraft & { publishedOnSiteAt: Date | null }>,
  status: "PUBLISHED" | "DRAFT",
) {
  const categories = await db.category.findMany({
    where: { slug: { in: fixtures.map((a) => a.categorySlug) } },
    select: { id: true, slug: true },
  });
  const categoryIds = new Map(categories.map(({ id, slug }) => [slug, id]));

  const articles = fixtures.map(({ categorySlug, paragraphs, ...article }) => {
    const categoryId = categoryIds.get(categorySlug);

    if (!categoryId) {
      throw new Error(
        `Category "${categorySlug}" does not exist. Run pnpm db:seed:reference before seeding demo articles.`,
      );
    }

    const wordCount = paragraphs.reduce(
      (total, { english }) => total + countWords(english),
      0,
    );

    return {
      data: {
        ...article,
        categoryId,
        status,
        sourceName: DEMO_SOURCE_NAME,
        sourceUrl: demoSourceUrl(article.slug),
        sourceImageUrl: null,
        imageAttribution: null,
        wordCount,
        readingTimeMinutes: estimateReadingMinutes(wordCount),
      },
      paragraphs: paragraphs.map(({ english, turkish }, index) => ({
        order: index + 1,
        english,
        turkish,
      })),
    };
  });

  await db.$transaction(async (tx) => {
    for (const { data, paragraphs } of articles) {
      const { id: articleId } = await tx.article.upsert({
        where: { slug: data.slug },
        create: data,
        update: data,
        select: { id: true },
      });

      // Replacing every paragraph keeps a rerun exact even when a fixture loses one.
      await tx.articleParagraph.deleteMany({ where: { articleId } });
      await tx.articleParagraph.createMany({
        data: paragraphs.map((paragraph) => ({ ...paragraph, articleId })),
      });
    }
  });

  return {
    articles: articles.length,
    paragraphs: articles.reduce((total, a) => total + a.paragraphs.length, 0),
  };
}

/**
 * Replaces the editorial dictionary entries with one for every word of every
 * demo article, keyed like live lookups so the reader finds them first. The
 * demo articles' key vocabulary is removed first, so that every entry is
 * rewritten from the fixtures; `seedDemoKeyVocabulary` restores it. Entries
 * that other articles' curated vocabulary points to are kept. The same caller
 * rules as `seedDemoArticles` apply.
 */
export async function seedDemoDictionary(db: PrismaClient) {
  const rows = editorialVocabularyRows(
    DEMO_ARTICLES,
    DEMO_DICTIONARY,
    DEMO_SENSE_CHOICES,
  );

  await db.$transaction([
    db.articleVocabulary.deleteMany({
      where: {
        article: { slug: { in: DEMO_ARTICLES.map(({ slug }) => slug) } },
      },
    }),
    db.vocabularyEntry.deleteMany({
      where: { provider: EDITORIAL_SOURCE.provider, articles: { none: {} } },
    }),
    db.vocabularyEntry.createMany({ data: rows, skipDuplicates: true }),
  ]);

  return { entries: rows.length, senses: DEMO_DICTIONARY.length };
}

/**
 * Replaces the Real English occurrences in the demo articles, finding each
 * one from its exact wording. Requires the reference cards and the demo
 * articles; the same caller rules as `seedDemoArticles` apply.
 */
export async function seedDemoExpressions(db: PrismaClient) {
  const occurrences = resolveExpressionOccurrences(
    DEMO_ARTICLES,
    REFERENCE_EXPRESSIONS,
    DEMO_EXPRESSION_OCCURRENCES,
  );

  const [articles, expressions] = await Promise.all([
    db.article.findMany({
      where: { slug: { in: DEMO_ARTICLES.map(({ slug }) => slug) } },
      select: {
        id: true,
        slug: true,
        paragraphs: { select: { id: true, order: true } },
      },
    }),
    db.expression.findMany({
      where: {
        slug: { in: occurrences.map(({ expressionSlug }) => expressionSlug) },
      },
      select: { id: true, slug: true },
    }),
  ]);
  const articleBySlug = new Map(
    articles.map((article) => [article.slug, article]),
  );
  const expressionIds = new Map(expressions.map(({ id, slug }) => [slug, id]));

  const rows = occurrences.map((occurrence) => {
    const article = articleBySlug.get(occurrence.articleSlug);
    const paragraph = article?.paragraphs.find(
      ({ order }) => order === occurrence.paragraphOrder,
    );
    const expressionId = expressionIds.get(occurrence.expressionSlug);

    if (!article || !paragraph) {
      throw new Error(
        `Demo article "${occurrence.articleSlug}" is missing. Seed the demo articles before their expressions.`,
      );
    }
    if (!expressionId) {
      throw new Error(
        `Expression "${occurrence.expressionSlug}" does not exist. Run pnpm db:seed:reference before seeding demo articles.`,
      );
    }

    return {
      articleId: article.id,
      expressionId,
      paragraphId: paragraph.id,
      surfaceText: occurrence.surfaceText,
      sentence: occurrence.sentence,
      startOffset: occurrence.start,
      endOffset: occurrence.end,
      displayOrder: occurrence.displayOrder,
      source: EDITORIAL_OCCURRENCE_SOURCE,
    };
  });

  await db.$transaction([
    db.articleExpression.deleteMany({
      where: { articleId: { in: articles.map(({ id }) => id) } },
    }),
    db.articleExpression.createMany({ data: rows }),
  ]);

  return { occurrences: rows.length };
}

/**
 * Replaces the demo articles' key vocabulary, linking each chosen word to
 * its editorial dictionary entry for that sentence. Requires the demo
 * articles and their dictionary entries; the same caller rules as
 * `seedDemoArticles` apply.
 */
export async function seedDemoKeyVocabulary(db: PrismaClient) {
  const words = resolveKeyVocabulary(DEMO_ARTICLES, DEMO_KEY_VOCABULARY);

  const [articles, entries] = await Promise.all([
    db.article.findMany({
      where: { slug: { in: DEMO_ARTICLES.map(({ slug }) => slug) } },
      select: { id: true, slug: true },
    }),
    db.vocabularyEntry.findMany({
      where: {
        provider: EDITORIAL_SOURCE.provider,
        providerVersion: EDITORIAL_SOURCE.version,
        schemaVersion: DICTIONARY_SCHEMA_VERSION,
        contextHash: { in: words.map(({ contextHash }) => contextHash) },
      },
      select: { id: true, normalizedWord: true, contextHash: true },
    }),
  ]);
  const articleIds = new Map(articles.map(({ id, slug }) => [slug, id]));
  const entryIds = new Map(
    entries.map(({ id, normalizedWord, contextHash }) => [
      `${normalizedWord} ${contextHash}`,
      id,
    ]),
  );

  const rows = words.map((word) => {
    const articleId = articleIds.get(word.articleSlug);
    const vocabularyEntryId = entryIds.get(
      `${word.normalizedWord} ${word.contextHash}`,
    );

    if (!articleId) {
      throw new Error(
        `Demo article "${word.articleSlug}" is missing. Seed the demo articles before their key vocabulary.`,
      );
    }
    if (!vocabularyEntryId) {
      throw new Error(
        `"${word.surfaceWord}" in "${word.articleSlug}" has no dictionary entry. Seed the demo dictionary before the key vocabulary.`,
      );
    }

    return {
      articleId,
      vocabularyEntryId,
      sourceSentence: word.sourceSentence,
      displayOrder: word.displayOrder,
      source: EDITORIAL_SOURCE.provider,
    };
  });

  await db.$transaction([
    db.articleVocabulary.deleteMany({
      where: { articleId: { in: articles.map(({ id }) => id) } },
    }),
    db.articleVocabulary.createMany({ data: rows }),
  ]);

  return { words: rows.length };
}
