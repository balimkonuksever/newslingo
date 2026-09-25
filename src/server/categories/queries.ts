import "server-only";

import { slugSchema } from "@/lib/slug";
import {
  articleSummarySelect,
  publicArticleWhere,
} from "@/server/articles/queries";
import { db } from "@/server/db/client";

/** Active categories in display order, each with its public article count. */
export async function listCategoriesWithArticleCounts() {
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
}

/**
 * An active category with up to `articleLimit` of its public articles, most
 * recent source publication first, or null when the slug is unknown or the
 * category is inactive.
 */
export async function getCategoryWithArticles(
  slug: string,
  articleLimit: number,
) {
  const parsedSlug = slugSchema.safeParse(slug);

  if (!parsedSlug.success) {
    return null;
  }

  return db.category.findUnique({
    where: { slug: parsedSlug.data, isActive: true },
    select: {
      slug: true,
      name: true,
      description: true,
      articles: {
        where: publicArticleWhere,
        orderBy: [{ sourcePublishedAt: "desc" }, { id: "asc" }],
        take: articleLimit,
        select: articleSummarySelect,
      },
    },
  });
}
