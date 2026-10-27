import type { Prisma } from "@/generated/prisma/client";
import { requireTestDatabaseUrl } from "@/lib/database-env";
import { db } from "@/server/db/client";

import { emptyDatabase } from "../support/empty-database";

/**
 * Empties every application table, leaving the migration history intact.
 * Refuses to run unless DATABASE_URL names a test database.
 */
export async function resetDatabase() {
  requireTestDatabaseUrl("DATABASE_URL", process.env.DATABASE_URL);

  await emptyDatabase(db);
}

let sequence = 0;

export function createCategory(
  data: Partial<Prisma.CategoryUncheckedCreateInput> = {},
) {
  sequence += 1;

  return db.category.create({
    data: {
      slug: `category-${sequence}`,
      name: `Category ${sequence}`,
      displayOrder: sequence,
      ...data,
    },
  });
}

/**
 * Creates a published news article with valid defaults; override any field.
 * It is dated by its source, as the database requires of news.
 */
export function createArticle(
  categoryId: string,
  data: Partial<Prisma.ArticleUncheckedCreateInput> = {},
) {
  sequence += 1;
  const sourcePublishedAt =
    data.sourcePublishedAt ?? new Date("2026-09-01T09:00:00Z");

  return db.article.create({
    data: {
      slug: `article-${sequence}`,
      title: `Article ${sequence}`,
      categoryId,
      difficulty: "B1",
      status: "PUBLISHED",
      sourceName: "Integration test source",
      sourceUrl: `https://test.newslingo.example/articles/${sequence}`,
      sourcePublishedAt,
      datedAt: sourcePublishedAt,
      publishedOnSiteAt: new Date("2026-09-01T12:00:00Z"),
      wordCount: 120,
      readingTimeMinutes: 1,
      ...data,
    },
  });
}

/** Creates a published explainer, with no source; override any field. */
export function createExplainer(
  categoryId: string,
  data: Partial<Prisma.ArticleUncheckedCreateInput> = {},
) {
  return createArticle(categoryId, {
    kind: "EXPLAINER",
    sourceName: null,
    sourceUrl: null,
    sourcePublishedAt: null,
    datedAt: new Date("2026-09-01T09:00:00Z"),
    ...data,
  });
}

export function createExpression(
  data: Partial<Prisma.ExpressionUncheckedCreateInput> = {},
) {
  sequence += 1;

  return db.expression.create({
    data: {
      slug: `expression-${sequence}`,
      expression: `roll out ${sequence}`,
      normalizedExpression: `roll out ${sequence}`,
      type: "PHRASAL_VERB",
      englishMeaning: "to introduce something new",
      turkishMeaning: "kullanıma sunmak",
      ...data,
    },
  });
}

export function createVocabularyEntry(
  data: Partial<Prisma.VocabularyEntryUncheckedCreateInput> = {},
) {
  sequence += 1;

  return db.vocabularyEntry.create({
    data: {
      surfaceWord: "Harvest",
      normalizedWord: `harvest-${sequence}`,
      englishDefinition: "to gather crops",
      turkishMeaning: "hasat etmek",
      contextSentence: "Farmers decide when to harvest.",
      contextHash: "a".repeat(64),
      provider: "fixture",
      providerVersion: "1",
      schemaVersion: 1,
      ...data,
    },
  });
}
