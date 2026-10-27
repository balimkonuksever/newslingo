import "server-only";

import { cache } from "react";

import type { ExpressionCard } from "@/domain/expressions";
import { slugSchema } from "@/lib/slug";
import {
  articleSummarySelect,
  expressionCardSelect,
  publicArticleWhere,
} from "@/server/articles/queries";
import { db } from "@/server/db/client";

/**
 * Active categories in display order, each with its public article count.
 * Memoized per request because the site header and pages both need it.
 */
export const listCategoriesWithArticleCounts = cache(async () => {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { slug: "asc" }],
    select: {
      slug: true,
      name: true,
      description: true,
      _count: { select: { articles: { where: publicArticleWhere } } },
    },
  });

  return categories.map(({ _count, ...category }) => ({
    ...category,
    publicArticleCount: _count.articles,
  }));
});

/**
 * An active category with up to `articleLimit` of its public articles,
 * newest `datedAt` first, and the number of Real English
 * expressions on its page, or null when the slug is unknown or the category
 * is inactive. Memoized per request for metadata and the page.
 */
export const getCategoryWithArticles = cache(
  async (slug: string, articleLimit: number) => {
    const parsedSlug = slugSchema.safeParse(slug);

    if (!parsedSlug.success) {
      return null;
    }

    const category = await db.category.findUnique({
      where: { slug: parsedSlug.data, isActive: true },
      select: {
        slug: true,
        name: true,
        description: true,
        articles: {
          where: publicArticleWhere,
          orderBy: [{ datedAt: "desc" }, { id: "asc" }],
          take: articleLimit,
          select: articleSummarySelect,
        },
        _count: { select: { expressions: true } },
      },
    });

    if (!category) {
      return null;
    }

    const { _count, ...rest } = category;

    return { ...rest, expressionCount: _count.expressions };
  },
);

export type CategoryExpressions = {
  slug: string;
  name: string;
  description: string | null;
  /** The category's Real English page, in display order. */
  expressions: ExpressionCard[];
};

/**
 * An active category with the Real English expressions on its page, in
 * display order, or null when the slug is unknown or the category is
 * inactive. Memoized per request for metadata and the page.
 */
export const getCategoryExpressions = cache(
  async (slug: string): Promise<CategoryExpressions | null> => {
    const parsedSlug = slugSchema.safeParse(slug);

    if (!parsedSlug.success) {
      return null;
    }

    const category = await db.category.findUnique({
      where: { slug: parsedSlug.data, isActive: true },
      select: {
        slug: true,
        name: true,
        description: true,
        expressions: {
          orderBy: [{ displayOrder: "asc" }, { expressionId: "asc" }],
          select: { expression: { select: expressionCardSelect } },
        },
      },
    });

    if (!category) {
      return null;
    }

    return {
      ...category,
      expressions: category.expressions.map(({ expression }) => expression),
    };
  },
);
