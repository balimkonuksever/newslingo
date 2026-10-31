import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleView } from "@/components/article/article-view";
import { env } from "@/lib/env";
import {
  type ArticleDetail,
  getPublicArticleBySlug,
  listPublicArticleSlugs,
} from "@/server/articles/queries";
import { staticParams } from "@/server/render-mode";

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

export function generateStaticParams() {
  return staticParams(listPublicArticleSlugs);
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
    isBasedOn: article.sourceUrl ?? undefined,
    publisher: { "@type": "Organization", name: "Newslingo" },
    mainEntityOfPage: new URL(
      `/article/${article.slug}`,
      env.NEXT_PUBLIC_SITE_URL,
    ).toString(),
  };

  return (
    <ArticleView article={article}>
      <script
        type="application/ld+json"
        // Escaping "<" keeps article text from closing the script element.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
    </ArticleView>
  );
}
