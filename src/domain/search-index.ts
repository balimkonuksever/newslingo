import type { SearchableArticle } from "@/lib/search";
import type { ArticleSummary } from "@/server/articles/queries";

/**
 * The search index: every public article's card and the text search looks
 * at, fetched the first time a reader searches, so search needs no server
 * (IMPLEMENTATION_PLAN.md M9). The local server and the static site serve it
 * at `/search-index.json`.
 */
export type SearchIndex = {
  /** Newest `datedAt` first. */
  articles: SearchIndexArticle[];
};

export type SearchIndexArticle = Omit<ArticleSummary, "datedAt"> &
  SearchableArticle & {
    /** ISO 8601. */
    datedAt: string;
  };

/** The search index's address under the site's base path. */
export function searchIndexPath() {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/search-index.json`;
}
