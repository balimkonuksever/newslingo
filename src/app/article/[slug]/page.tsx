import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleReader } from "@/components/article/article-reader";
import { ParagraphPair } from "@/components/article/paragraph-pair";
import { SourceAttribution } from "@/components/article/source-attribution";
import { WordLookup } from "@/components/learning/word-lookup";
import { categoryAccent } from "@/components/news/category-accent";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { formatArticleDate } from "@/lib/dates";
import { env } from "@/lib/env";
import {
  type ArticleDetail,
  getPublicArticleBySlug,
} from "@/server/articles/queries";

const DESCRIPTION_LENGTH = 160;

function describe(article: ArticleDetail) {
  if (article.shortSummary) {
    return article.shortSummary;
  }

  const text = article.paragraphs[0]?.english ?? article.title;

  return text.length <= DESCRIPTION_LENGTH
    ? text
    : `${text.slice(0, DESCRIPTION_LENGTH - 1).trimEnd()}…`;
}

export async function generateMetadata(
  props: PageProps<"/article/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const article = await getPublicArticleBySlug(slug);

  // Throwing here too keeps the 404 page's title once metadata streams in.
  if (!article) {
    notFound();
  }

  const path = `/article/${article.slug}`;
  const description = describe(article);

  return {
    title: article.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title: article.title,
      description,
      section: article.category.name,
      publishedTime: article.publishedOnSiteAt?.toISOString(),
    },
    twitter: { card: "summary", title: article.title, description },
  };
}

export default async function ArticlePage(props: PageProps<"/article/[slug]">) {
  const { slug } = await props.params;
  const article = await getPublicArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: describe(article),
    inLanguage: "en",
    educationalLevel: article.difficulty,
    articleSection: article.category.name,
    wordCount: article.wordCount,
    datePublished: article.publishedOnSiteAt?.toISOString(),
    isBasedOn: article.sourceUrl,
    publisher: { "@type": "Organization", name: "Newslingo" },
    mainEntityOfPage: new URL(
      `/article/${article.slug}`,
      env.NEXT_PUBLIC_SITE_URL,
    ).toString(),
  };

  return (
    <article className="mx-auto max-w-reader px-4 py-8 sm:px-6 sm:py-12">
      <script
        type="application/ld+json"
        // Escaping "<" keeps article text from closing the script element.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <header>
        <Link
          href={`/category/${article.category.slug}`}
          className={`text-xs font-semibold tracking-wider uppercase hover:underline ${
            categoryAccent(article.category.slug).text
          }`}
        >
          {article.category.name}
        </Link>
        <h1 className="mt-2 font-serif text-4xl leading-tight font-semibold tracking-tight wrap-break-word text-ink sm:text-5xl">
          {article.title}
        </h1>
        {article.shortSummary && (
          <p className="mt-4 text-xl leading-relaxed text-ink-muted">
            {article.shortSummary}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule pt-4 text-sm text-ink-muted">
          <DifficultyBadge level={article.difficulty} showLabel />
          <span>{article.readingTimeMinutes} min read</span>
          <span>
            Published{" "}
            <time dateTime={article.sourcePublishedAt.toISOString()}>
              {formatArticleDate(article.sourcePublishedAt)}
            </time>
          </span>
          <span>Source: {article.sourceName}</span>
        </div>
      </header>

      <div className="mt-8">
        <ArticleReader>
          <WordLookup articleSlug={article.slug}>
            <p className="-mb-4 text-sm text-ink-muted">
              Select any English word to see what it means here.
              <span className="sr-only">
                {" "}
                With a keyboard, tab to a paragraph, choose a word with the
                arrow keys and press Enter.
              </span>
            </p>
            {article.paragraphs.map((paragraph) => (
              <ParagraphPair key={paragraph.order} {...paragraph} />
            ))}
          </WordLookup>
        </ArticleReader>
      </div>

      <SourceAttribution
        sourceName={article.sourceName}
        sourceUrl={article.sourceUrl}
      />
    </article>
  );
}
