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

/** Creates a published article with valid defaults; override any field. */
export function createArticle(
  categoryId: string,
  data: Partial<Prisma.ArticleUncheckedCreateInput> = {},
) {
  sequence += 1;

  return db.article.create({
    data: {
      slug: `article-${sequence}`,
      title: `Article ${sequence}`,
      categoryId,
      difficulty: "B1",
      status: "PUBLISHED",
      sourceName: "Integration test source",
      sourceUrl: `https://test.newslingo.example/articles/${sequence}`,
      sourcePublishedAt: new Date("2026-09-01T09:00:00Z"),
      publishedOnSiteAt: new Date("2026-09-01T12:00:00Z"),
      wordCount: 120,
      readingTimeMinutes: 1,
      ...data,
    },
  });
}
