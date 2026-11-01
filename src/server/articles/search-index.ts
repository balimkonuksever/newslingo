import "server-only";

import type { SearchIndex } from "@/domain/search-index";
import { uniqueSearchTerms } from "@/lib/search";
import {
  articleSummarySelect,
  publicArticleWhere,
} from "@/server/articles/queries";
import { db } from "@/server/db/client";

/**
 * The search index of every public article, newest first. The body and its
 * translation are kept as their terms, each once, which is all search needs
 * and smaller than the text.
 */
export async function buildSearchIndex(): Promise<SearchIndex> {
  const articles = await db.article.findMany({
    where: publicArticleWhere,
    orderBy: [{ datedAt: "desc" }, { id: "asc" }],
    select: {
      ...articleSummarySelect,
      references: { orderBy: { order: "asc" }, select: { publisher: true } },
      paragraphs: {
        orderBy: { order: "asc" },
        select: { english: true, turkish: true },
      },
    },
  });

  return {
    articles: articles.map(({ datedAt, references, paragraphs, ...card }) => ({
      ...card,
      datedAt: datedAt.toISOString(),
      referencePublishers: [
        ...new Set(references.map(({ publisher }) => publisher)),
      ],
      english: uniqueSearchTerms(paragraphs.map(({ english }) => english)),
      turkish: uniqueSearchTerms(paragraphs.map(({ turkish }) => turkish)),
    })),
  };
}
