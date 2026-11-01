"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { ArticleCard } from "@/components/news/article-card";
import { ArticleFiltersForm } from "@/components/news/article-filters-form";
import { EmptyState } from "@/components/shared/empty-state";
import { eyebrow, sectionHeading, textLink } from "@/components/ui/styles";
import {
  filterArticles,
  hasActiveFilters,
  parseArticleFilters,
  type SearchParams,
  searchParamsRecord,
} from "@/lib/article-filters";
import { formatArticleCount } from "@/lib/format";
import type { ArticleSummary } from "@/server/articles/queries";

const FILTERED_ARTICLE_LIMIT = 48;

type HomeArticlesProps = {
  categories: Array<{ slug: string; name: string }>;
  featured: ArticleSummary | null;
  latest: ArticleSummary[];
  /** Every public article, newest `datedAt` first, for the filters. */
  articles: ArticleSummary[];
};

/**
 * The homepage's stories: the featured and latest ones, or the articles that
 * match the filters in the URL. The filters apply in the browser, so the
 * static site needs no server; the page's HTML holds the unfiltered view.
 */
export function HomeArticles(props: HomeArticlesProps) {
  return (
    <Suspense fallback={<HomeArticlesView {...props} searchParams={{}} />}>
      <HomeArticlesFromUrl {...props} />
    </Suspense>
  );
}

function HomeArticlesFromUrl(props: HomeArticlesProps) {
  const searchParams = useSearchParams();

  return (
    <HomeArticlesView
      {...props}
      searchParams={searchParamsRecord(searchParams)}
    />
  );
}

function HomeArticlesView({
  categories,
  featured,
  latest,
  articles,
  searchParams,
}: HomeArticlesProps & { searchParams: SearchParams }) {
  const filters = parseArticleFilters(
    searchParams,
    categories.map(({ slug }) => slug),
  );
  const isFiltered = hasActiveFilters(filters);
  const filteredArticles = isFiltered
    ? filterArticles(articles, filters).slice(0, FILTERED_ARTICLE_LIMIT)
    : null;

  return (
    <>
      <details
        open={isFiltered}
        className="group mt-8 rounded-xl border border-rule bg-surface"
      >
        <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl px-5 font-medium text-ink">
          Filter by category, level, length or date
          <span
            aria-hidden="true"
            className="text-ink-muted transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </summary>
        <div className="border-t border-rule px-5 py-5">
          <ArticleFiltersForm
            // Remounting resets the form fields whenever the URL's filters change.
            key={JSON.stringify(filters)}
            categories={categories}
            filters={filters}
            isFiltered={isFiltered}
          />
        </div>
      </details>

      {/* Announces the result count after the filters change without a page load. */}
      <p aria-live="polite" className="sr-only">
        {filteredArticles &&
          `${formatArticleCount(filteredArticles.length)} ${filteredArticles.length === 1 ? "matches" : "match"} your filters.`}
      </p>

      {filteredArticles && (
        <section aria-labelledby="results-heading" className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 id="results-heading" className={sectionHeading}>
              Matching articles
            </h2>
            <Link href="/" scroll={false} className={textLink}>
              Clear filters
            </Link>
          </div>
          {filteredArticles.length === 0 ? (
            <div className="mt-6">
              <EmptyState title="No articles match these filters">
                Try another level or date range, or clear the filters.
              </EmptyState>
            </div>
          ) : (
            <>
              <p className="mt-1 text-ink-muted">
                {formatArticleCount(filteredArticles.length)}, most recent first
              </p>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredArticles.map((article) => (
                  <li key={article.slug}>
                    <ArticleCard article={article} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {!isFiltered && !featured && (
        <div className="mt-10">
          <EmptyState title="No articles yet">
            New stories appear here as soon as they are published.
          </EmptyState>
        </div>
      )}

      {!isFiltered && featured && (
        <section aria-labelledby="featured-heading" className="mt-10">
          <h2 id="featured-heading" className={eyebrow}>
            Featured story
          </h2>
          <div className="mt-3">
            <ArticleCard article={featured} featured />
          </div>
        </section>
      )}

      {!isFiltered && latest.length > 0 && (
        <section aria-labelledby="latest-heading" className="mt-12">
          <h2 id="latest-heading" className={sectionHeading}>
            Latest news
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((article) => (
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
