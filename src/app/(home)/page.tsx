import type { Metadata } from "next";
import Link from "next/link";

import { ArticleCard } from "@/components/news/article-card";
import { ArticleFiltersForm } from "@/components/news/article-filters-form";
import { CategoryCard } from "@/components/news/category-card";
import { EmptyState } from "@/components/shared/empty-state";
import { eyebrow, sectionHeading, textLink } from "@/components/ui/styles";
import { hasActiveFilters, parseArticleFilters } from "@/lib/article-filters";
import { formatArticleCount } from "@/lib/format";
import {
  getFeaturedAndLatestArticles,
  listPublicArticles,
} from "@/server/articles/queries";
import { listCategoriesWithArticleCounts } from "@/server/categories/queries";

const LATEST_ARTICLE_LIMIT = 9;
const FILTERED_ARTICLE_LIMIT = 48;

export async function generateMetadata(
  props: PageProps<"/">,
): Promise<Metadata> {
  const searchParams = await props.searchParams;

  return {
    alternates: { canonical: "/" },
    // Filtered views repeat the homepage's content, so keep them out of search results.
    ...(Object.keys(searchParams).length > 0 && {
      robots: { index: false, follow: true },
    }),
  };
}

export default async function HomePage(props: PageProps<"/">) {
  const [searchParams, categories] = await Promise.all([
    props.searchParams,
    listCategoriesWithArticleCounts(),
  ]);
  const filters = parseArticleFilters(
    searchParams,
    categories.map(({ slug }) => slug),
  );
  const isFiltered = hasActiveFilters(filters);

  const [frontPage, filteredArticles] = await Promise.all([
    isFiltered ? null : getFeaturedAndLatestArticles(LATEST_ARTICLE_LIMIT),
    isFiltered ? listPublicArticles(filters, FILTERED_ARTICLE_LIMIT) : null,
  ]);

  return (
    <div className="mx-auto max-w-page px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="max-w-3xl font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        Learn English with today’s news
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-muted">
        Every story is written for one English level, from A2 to C1, with a
        Turkish translation under each paragraph.
      </p>

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
          `${formatArticleCount(filteredArticles.length)} match your filters.`}
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

      {frontPage && !frontPage.featured && (
        <div className="mt-10">
          <EmptyState title="No articles yet">
            New stories appear here as soon as they are published.
          </EmptyState>
        </div>
      )}

      {frontPage?.featured && (
        <section aria-labelledby="featured-heading" className="mt-10">
          <h2 id="featured-heading" className={eyebrow}>
            Featured story
          </h2>
          <div className="mt-3">
            <ArticleCard article={frontPage.featured} featured />
          </div>
        </section>
      )}

      {frontPage && frontPage.latest.length > 0 && (
        <section aria-labelledby="latest-heading" className="mt-12">
          <h2 id="latest-heading" className={sectionHeading}>
            Latest news
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {frontPage.latest.map((article) => (
              <li key={article.slug}>
                <ArticleCard article={article} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="categories-heading" className="mt-16">
        <h2 id="categories-heading" className={sectionHeading}>
          Browse by category
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.slug}>
              <CategoryCard category={category} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
