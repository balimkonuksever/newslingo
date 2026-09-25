import type { PrismaClient } from "../src/generated/prisma/client";
import { countWords, estimateReadingMinutes } from "../src/lib/reading-time";
import {
  DEMO_ARTICLES,
  DEMO_SOURCE_NAME,
  demoSourceUrl,
} from "./fixtures/articles";
import { REFERENCE_CATEGORIES } from "./reference/categories";

/**
 * Upserts the launch categories by slug in one transaction. Production-safe:
 * it writes no articles and can be rerun at any time.
 */
export async function provisionReferenceData(db: PrismaClient) {
  await db.$transaction(
    REFERENCE_CATEGORIES.map((category) =>
      db.category.upsert({
        where: { slug: category.slug },
        create: category,
        update: category,
      }),
    ),
  );

  return { categories: REFERENCE_CATEGORIES.length };
}

/**
 * Upserts the demo articles by slug and replaces their paragraphs, all in one
 * transaction, so reruns never duplicate anything. Requires the reference
 * categories. This function cannot tell which database it is writing to:
 * callers must pass `assertDemoSeedAllowed` first.
 */
export async function seedDemoArticles(db: PrismaClient) {
  const categories = await db.category.findMany({
    where: { slug: { in: DEMO_ARTICLES.map((a) => a.categorySlug) } },
    select: { id: true, slug: true },
  });
  const categoryIds = new Map(categories.map(({ id, slug }) => [slug, id]));

  const articles = DEMO_ARTICLES.map(
    ({ categorySlug, paragraphs, ...article }) => {
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
          status: "PUBLISHED" as const,
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
    },
  );

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
