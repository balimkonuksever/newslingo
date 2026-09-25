import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleCard } from "@/components/news/article-card";
import { categoryAccent } from "@/components/news/category-accent";
import { EmptyState } from "@/components/shared/empty-state";
import { textLink } from "@/components/ui/styles";
import { formatArticleCount } from "@/lib/format";
import { getCategoryWithArticles } from "@/server/categories/queries";

const CATEGORY_ARTICLE_LIMIT = 24;

export async function generateMetadata(
  props: PageProps<"/category/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const category = await getCategoryWithArticles(slug, CATEGORY_ARTICLE_LIMIT);

  // Throwing here too keeps the 404 page's title once metadata streams in.
  if (!category) {
    notFound();
  }

  return {
    title: category.name,
    description:
      category.description ??
      `${category.name} news written for English learners.`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

export default async function CategoryPage(
  props: PageProps<"/category/[slug]">,
) {
  const { slug } = await props.params;
  const category = await getCategoryWithArticles(slug, CATEGORY_ARTICLE_LIMIT);

  if (!category) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-page px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-3xl">
        <p
          className={`text-xs font-semibold tracking-wider uppercase ${
            categoryAccent(category.slug).text
          }`}
        >
          Category
        </p>
        <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-3 text-lg text-ink-muted">{category.description}</p>
        )}
        {category.articles.length > 0 && (
          <p className="mt-2 text-sm text-ink-muted">
            {formatArticleCount(category.articles.length)}, most recent first
          </p>
        )}
      </header>

      {category.articles.length === 0 ? (
        <div className="mt-8">
          <EmptyState title={`No ${category.name} articles yet`}>
            <p>
              New stories appear here as soon as they are published.{" "}
              <Link href="/" className={textLink}>
                See the latest news
              </Link>
            </p>
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {category.articles.map((article) => (
            <li key={article.slug}>
              <ArticleCard article={article} headingLevel="h2" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
