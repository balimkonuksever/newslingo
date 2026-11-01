import type { SearchParams } from "@/lib/article-filters";

/** The longest query the search page reads; the rest is ignored. */
export const SEARCH_QUERY_MAX_LENGTH = 100;

/** More words than this are ignored, so a pasted paragraph stays cheap. */
const MAX_QUERY_TERMS = 10;

/** Shorter terms match whole words only, so "ai" does not find "aid". */
const MIN_PREFIX_LENGTH = 3;

/**
 * Folds text into search terms: lower case, without accents, with the
 * Turkish dotless ı as i, split at anything but a letter or digit. So
 * "Güzellik" and "guzellik" are the same term, and "K-pop" is "k" "pop".
 */
export function searchTerms(text: string): string[] {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .replaceAll("ı", "i")
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

/** Each search term of `texts` once, sorted, joined by spaces. */
export function uniqueSearchTerms(texts: readonly string[]) {
  return [...new Set(texts.flatMap(searchTerms))].sort().join(" ");
}

/**
 * Reads the search query from URL search parameters: the first `q`, with
 * its spaces collapsed, cut to `SEARCH_QUERY_MAX_LENGTH`. Empty when absent.
 */
export function parseSearchQuery(searchParams: SearchParams) {
  const value = searchParams.q;
  const query = Array.isArray(value) ? value[0] : value;

  return (query ?? "")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, SEARCH_QUERY_MAX_LENGTH)
    .trim();
}

/** The text of an article that search looks at. */
export type SearchableArticle = {
  title: string;
  shortSummary: string | null;
  category: { name: string };
  sourceName: string | null;
  referencePublishers: readonly string[];
  /** The English text's terms, as `uniqueSearchTerms` gives them. */
  english: string;
  /** The Turkish translation's terms, as `uniqueSearchTerms` gives them. */
  turkish: string;
};

type SearchField = {
  weight: number;
  terms: Set<string>;
  /** Every term, for prefix matches. */
  list: string[];
  /** The field's terms in order, for phrase matches, or null. */
  phrase: string | null;
};

/**
 * How much a match in each field counts. A title match outranks any number
 * of matches in the body, which every article has plenty of.
 */
export const SEARCH_FIELD_WEIGHTS = {
  title: 8,
  summary: 4,
  category: 3,
  source: 3,
  english: 1,
  turkish: 1,
} as const;

function field(weight: number, terms: string[], keepPhrase: boolean) {
  return {
    weight,
    terms: new Set(terms),
    list: terms,
    phrase: keepPhrase ? ` ${terms.join(" ")} ` : null,
  } satisfies SearchField;
}

function searchFields(article: SearchableArticle): SearchField[] {
  const body = (terms: string) => (terms === "" ? [] : terms.split(" "));

  return [
    field(SEARCH_FIELD_WEIGHTS.title, searchTerms(article.title), true),
    field(
      SEARCH_FIELD_WEIGHTS.summary,
      searchTerms(article.shortSummary ?? ""),
      true,
    ),
    field(
      SEARCH_FIELD_WEIGHTS.category,
      searchTerms(article.category.name),
      true,
    ),
    field(
      SEARCH_FIELD_WEIGHTS.source,
      [article.sourceName ?? "", ...article.referencePublishers].flatMap(
        searchTerms,
      ),
      true,
    ),
    field(SEARCH_FIELD_WEIGHTS.english, body(article.english), false),
    field(SEARCH_FIELD_WEIGHTS.turkish, body(article.turkish), false),
  ];
}

/**
 * A term's score in a field: the field's weight for a whole-word match, half
 * of it when the term only begins a word ("phone" in "phones"), else 0.
 */
function termScore(term: string, { weight, terms, list }: SearchField) {
  if (terms.has(term)) {
    return weight;
  }

  return term.length >= MIN_PREFIX_LENGTH &&
    list.some((word) => word.startsWith(term))
    ? weight / 2
    : 0;
}

/**
 * Prepares `articles` for searching and returns the search. It finds the
 * articles that contain every term of a query, best match first: each term
 * counts by the best field it appears in, and the whole query appearing as a
 * phrase adds that field's weight again. Equal matches keep their given
 * order. An empty query finds nothing.
 */
export function createArticleSearch<Article extends SearchableArticle>(
  articles: readonly Article[],
) {
  const documents = articles.map((article) => ({
    article,
    fields: searchFields(article),
  }));

  return function search(query: string): Article[] {
    const terms = [...new Set(searchTerms(query))].slice(0, MAX_QUERY_TERMS);

    if (terms.length === 0) {
      return [];
    }

    const phrase = terms.length > 1 ? ` ${terms.join(" ")} ` : null;
    const matches: Array<{ article: Article; score: number }> = [];

    for (const { article, fields } of documents) {
      let score = 0;

      for (const term of terms) {
        const best = Math.max(...fields.map((each) => termScore(term, each)));

        if (best === 0) {
          score = 0;
          break;
        }

        score += best;
      }

      if (score === 0) {
        continue;
      }

      if (phrase) {
        score += Math.max(
          0,
          ...fields
            .filter((each) => each.phrase?.includes(phrase))
            .map((each) => each.weight),
        );
      }

      matches.push({ article, score });
    }

    // Array sorting is stable, so equal scores keep the given order.
    return matches
      .sort((a, b) => b.score - a.score)
      .map(({ article }) => article);
  };
}
