import Link from "next/link";

import { categoryAccent } from "@/components/news/category-accent";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { formatArticleDate } from "@/lib/dates";
import type { ArticleSummary } from "@/server/articles/queries";

type ArticleCardProps = {
  article: ArticleSummary;
  headingLevel?: "h2" | "h3";
  featured?: boolean;
};

/**
 * An article teaser. The title is the card's only link; its stretched hit
 * area makes the whole card clickable without nesting interactive elements.
 */
export function ArticleCard({
  article,
  headingLevel: Heading = "h3",
  featured = false,
}: ArticleCardProps) {
  return (
    <article
      className={`relative flex h-full flex-col rounded-xl border border-rule bg-surface p-5 transition-shadow hover:shadow-md has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus sm:p-6 ${
        featured ? "lg:p-8" : ""
      }`}
    >
      <p
        className={`text-xs font-semibold tracking-wider uppercase ${
          categoryAccent(article.category.slug).text
        }`}
      >
        {article.category.name}
      </p>
      <Heading
        className={`mt-2 font-serif font-semibold wrap-break-word text-ink ${
          featured
            ? "text-2xl leading-tight sm:text-3xl lg:text-4xl"
            : "text-xl leading-snug"
        }`}
      >
        <Link
          href={`/article/${article.slug}`}
          className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
        >
          {article.title}
        </Link>
      </Heading>
      {article.shortSummary && (
        <p
          className={`mt-3 text-ink-muted ${
            featured ? "max-w-3xl text-lg" : "line-clamp-3"
          }`}
        >
          {article.shortSummary}
        </p>
      )}
      <div className="mt-auto flex flex-col gap-1.5 pt-5 text-sm text-ink-muted">
        <p className="flex items-center gap-2">
          <DifficultyBadge level={article.difficulty} />
          <span>{article.readingTimeMinutes} min read</span>
        </p>
        <p>
          {article.sourceName}
          <span aria-hidden="true"> · </span>
          <time dateTime={article.sourcePublishedAt.toISOString()}>
            {formatArticleDate(article.sourcePublishedAt)}
          </time>
        </p>
      </div>
    </article>
  );
}
