"use client";

import Form from "next/form";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { ArticleCard } from "@/components/news/article-card";
import {
  type ArticleSearch,
  loadArticleSearch,
} from "@/components/news/search-client";
import { EmptyState } from "@/components/shared/empty-state";
import {
  primaryButton,
  secondaryButton,
  sectionHeading,
  textLink,
} from "@/components/ui/styles";
import { searchParamsRecord } from "@/lib/article-filters";
import { formatArticleCount } from "@/lib/format";
import { parseSearchQuery, SEARCH_QUERY_MAX_LENGTH } from "@/lib/search";

const SEARCH_RESULT_LIMIT = 30;

/**
 * The search form and the results for the query in the URL. Search runs in
 * the browser over the search index, which is fetched the first time the
 * reader focuses the field or opens a search, so the static site needs no
 * server; the page's HTML holds the empty form.
 */
export function SearchArticles() {
  return (
    <>
      <Suspense fallback={<SearchArticlesView query="" />}>
        <SearchArticlesFromUrl />
      </Suspense>
      <noscript>
        <p className="mt-6 text-ink-muted">
          Search needs JavaScript. The categories above list every story.
        </p>
      </noscript>
    </>
  );
}

function SearchArticlesFromUrl() {
  const searchParams = useSearchParams();

  return (
    <SearchArticlesView
      query={parseSearchQuery(searchParamsRecord(searchParams))}
    />
  );
}

function SearchArticlesView({ query }: { query: string }) {
  const [value, setValue] = useState(query);
  const [shownQuery, setShownQuery] = useState(query);
  const [search, setSearch] = useState<ArticleSearch | null>(null);
  const [failed, setFailed] = useState(false);

  // A new query in the URL, from a search or the history, refills the field
  // and lets a failed index load try again.
  if (query !== shownQuery) {
    setShownQuery(query);
    setValue(query);
    setFailed(false);
  }

  useEffect(() => {
    if (!query || search || failed) {
      return;
    }

    let current = true;

    loadArticleSearch().then(
      // A function passed to a state setter would be called as an updater.
      (loaded) => current && setSearch(() => loaded),
      () => current && setFailed(true),
    );

    return () => {
      current = false;
    };
  }, [query, search, failed]);

  const results = useMemo(
    () => (search && query ? search(query) : null),
    [search, query],
  );

  return (
    <>
      <Form
        action="/search"
        role="search"
        className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-ink">
          Topic, name or word
          <input
            type="search"
            name="q"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onFocus={() => void loadArticleSearch()}
            maxLength={SEARCH_QUERY_MAX_LENGTH}
            enterKeyHint="search"
            // The page exists to search, so an empty one starts in the field.
            autoFocus={!query}
            className="min-h-11 w-full rounded-lg border border-rule-strong bg-surface px-3 text-base text-ink"
          />
        </label>
        <button type="submit" className={primaryButton}>
          Search
        </button>
      </Form>

      {/* Announces the results once they appear, without a page load. */}
      <p aria-live="polite" className="sr-only">
        {results &&
          (results.length === 0
            ? `No articles match “${query}”.`
            : `${formatArticleCount(results.length)} ${results.length === 1 ? "matches" : "match"} “${query}”.`)}
        {failed && "Search could not load."}
      </p>

      {query && !results && !failed && (
        <p className="mt-10 text-ink-muted">Searching…</p>
      )}

      {failed && (
        <div className="mt-10">
          <EmptyState title="Search could not load">
            <p>Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => setFailed(false)}
              className={`mt-4 ${secondaryButton}`}
            >
              Try again
            </button>
          </EmptyState>
        </div>
      )}

      {results && results.length === 0 && (
        <div className="mt-10">
          <EmptyState title={`No articles match “${query}”`}>
            Check the spelling or try fewer words, or{" "}
            <Link href="/" className={textLink}>
              read the latest news
            </Link>
            .
          </EmptyState>
        </div>
      )}

      {results && results.length > 0 && (
        <section aria-labelledby="results-heading" className="mt-10">
          <h2 id="results-heading" className={sectionHeading}>
            Results for “{query}”
          </h2>
          <p className="mt-1 text-ink-muted">
            {results.length > SEARCH_RESULT_LIMIT
              ? `The best ${SEARCH_RESULT_LIMIT} of ${formatArticleCount(results.length)}. Add a word to narrow the search.`
              : `${formatArticleCount(results.length)}, best match first`}
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.slice(0, SEARCH_RESULT_LIMIT).map((article) => (
              <li key={article.slug}>
                <ArticleCard article={article} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
