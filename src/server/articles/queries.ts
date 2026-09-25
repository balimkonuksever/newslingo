import "server-only";

import { cache } from "react";

import type { Prisma } from "@/generated/prisma/client";
import { type ArticleFilters, sourceDateRange } from "@/lib/article-filters";
import { READING_TIME_BANDS } from "@/lib/reading-time";
import { slugSchema } from "@/lib/slug";
import { db } from "@/server/db/client";

/**
 * An article is public when it is published and its category is active. Every
 * public query filters through this, so drafts, archived articles and hidden
 * categories never reach a reader.
 */
export const publicArticleWhere = {
  status: "PUBLISHED",
  category: { isActive: true },
} satisfies Prisma.ArticleWhereInput;

/** The fields an article card shows. */
export const articleSummarySelect = {
  slug: true,
  title: true,
  shortSummary: true,
  difficulty: true,
  sourceName: true,
  sourcePublishedAt: true,
  readingTimeMinutes: true,
  category: { select: { slug: true, name: true } },
} satisfies Prisma.ArticleSelect;

export type ArticleSummary = Prisma.ArticleGetPayload<{
  select: typeof articleSummarySelect;
}>;

const articleDetailSelect = {
  ...articleSummarySelect,
  publishedOnSiteAt: true,
  sourceUrl: true,
  wordCount: true,
  paragraphs: {
    orderBy: { order: "asc" },
    select: { order: true, english: true, turkish: true },
  },
} satisfies Prisma.ArticleSelect;

export type ArticleDetail = Prisma.ArticleGetPayload<{
  select: typeof articleDetailSelect;
}>;

/**
 * The featured story is the most recently published article. Up to
 * `latestLimit` further articles follow it, newest first.
 */
export async function getFeaturedAndLatestArticles(latestLimit: number) {
  const [featured = null, ...latest] = await db.article.findMany({
    where: publicArticleWhere,
    orderBy: [{ publishedOnSiteAt: "desc" }, { id: "asc" }],
    take: latestLimit + 1,
    select: articleSummarySelect,
  });

  return { featured, latest };
}

/**
 * Public articles matching the homepage filters, most recent source
 * publication first.
 */
export async function listPublicArticles(
  filters: ArticleFilters,
  limit: number,
) {
  const band = filters.length ? READING_TIME_BANDS[filters.length] : null;

  return db.article.findMany({
    where: {
      ...publicArticleWhere,
      category: { ...publicArticleWhere.category, slug: filters.category },
      difficulty: filters.level,
      readingTimeMinutes: band
        ? { gte: band.minMinutes, lte: band.maxMinutes ?? undefined }
        : undefined,
      sourcePublishedAt: sourceDateRange(filters),
    },
    orderBy: [{ sourcePublishedAt: "desc" }, { id: "asc" }],
    take: limit,
    select: articleSummarySelect,
  });
}

/**
 * A public article with its paragraph pairs in reading order, or null.
 * Memoized per request, so metadata and the page share one database read.
 */
export const getPublicArticleBySlug = cache(
  async (slug: string): Promise<ArticleDetail | null> => {
    const parsedSlug = slugSchema.safeParse(slug);

    if (!parsedSlug.success) {
      return null;
    }

    return db.article.findUnique({
      where: { slug: parsedSlug.data, ...publicArticleWhere },
      select: articleDetailSelect,
    });
  },
);
