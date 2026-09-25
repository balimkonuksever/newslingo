import "server-only";

import type { Prisma } from "@/generated/prisma/client";
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
  sourceUrl: true,
  sourceImageUrl: true,
  imageAttribution: true,
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

/** A public article with its paragraph pairs in reading order, or null. */
export async function getPublicArticleBySlug(
  slug: string,
): Promise<ArticleDetail | null> {
  const parsedSlug = slugSchema.safeParse(slug);

  if (!parsedSlug.success) {
    return null;
  }

  return db.article.findUnique({
    where: { slug: parsedSlug.data, ...publicArticleWhere },
    select: articleDetailSelect,
  });
}
