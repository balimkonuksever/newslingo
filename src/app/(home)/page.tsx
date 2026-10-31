import type { Metadata } from "next";

import { CategoryCard } from "@/components/news/category-card";
import { HomeArticles } from "@/components/news/home-articles";
import { sectionHeading } from "@/components/ui/styles";
import {
  getFeaturedAndLatestArticles,
  listPublicArticles,
} from "@/server/articles/queries";
import { listCategoriesWithArticleCounts } from "@/server/categories/queries";

const LATEST_ARTICLE_LIMIT = 9;
/** More than the site will hold for a long time; the filters see them all. */
const FILTERABLE_ARTICLE_LIMIT = 1000;

// Filtered views are the homepage filtered in the browser, so they share
// its canonical address.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [categories, frontPage, articles] = await Promise.all([
    listCategoriesWithArticleCounts(),
    getFeaturedAndLatestArticles(LATEST_ARTICLE_LIMIT),
    listPublicArticles({}, FILTERABLE_ARTICLE_LIMIT),
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

      <HomeArticles
        categories={categories.map(({ slug, name }) => ({ slug, name }))}
        featured={frontPage.featured}
        latest={frontPage.latest}
        articles={articles}
      />

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
