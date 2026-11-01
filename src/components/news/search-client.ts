import {
  type SearchIndex,
  type SearchIndexArticle,
  searchIndexPath,
} from "@/domain/search-index";
import { createArticleSearch } from "@/lib/search";

/** An article in the index, with its date read back; an `ArticleSummary`. */
export type SearchResult = Omit<SearchIndexArticle, "datedAt"> & {
  datedAt: Date;
};

/** Finds the articles that match a query, best match first. */
export type ArticleSearch = (query: string) => SearchResult[];

// The index is fetched once, the first time it is needed. A failed fetch is
// forgotten, so the next search tries again.
let articleSearch: Promise<ArticleSearch> | null = null;

async function fetchArticleSearch(): Promise<ArticleSearch> {
  const response = await fetch(searchIndexPath());
  const body: unknown = response.ok
    ? await response.json().catch(() => null)
    : null;

  if (
    !body ||
    typeof body !== "object" ||
    !("articles" in body) ||
    !Array.isArray(body.articles)
  ) {
    throw new Error("The search index could not be read.");
  }

  return createArticleSearch(
    (body as SearchIndex).articles.map((article) => ({
      ...article,
      datedAt: new Date(article.datedAt),
    })),
  );
}

/** The search over the index, fetching the index the first time. */
export function loadArticleSearch() {
  if (!articleSearch) {
    articleSearch = fetchArticleSearch();
    articleSearch.catch(() => {
      articleSearch = null;
    });
  }

  return articleSearch;
}

/** Forgets the fetched index. For tests. */
export function clearArticleSearch() {
  articleSearch = null;
}
