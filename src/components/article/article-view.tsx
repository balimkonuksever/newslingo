import Link from "next/link";
import type { ReactNode } from "react";

import { ArticleReader } from "@/components/article/article-reader";
import { ParagraphPair } from "@/components/article/paragraph-pair";
import { AboutThisArticle } from "@/components/article/about-this-article";
import { EXPRESSION_SOURCE_NOTE } from "@/components/learning/expression-details";
import { KeyVocabularyList } from "@/components/learning/key-vocabulary-list";
import { RealEnglishList } from "@/components/learning/real-english-list";
import { WordLookup } from "@/components/learning/word-lookup";
import { categoryAccent } from "@/components/news/category-accent";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { ExplainerBadge } from "@/components/shared/explainer-badge";
import { textLink } from "@/components/ui/styles";
import { formatArticleDate } from "@/lib/dates";
import { formatExpressionCount, formatWordCount } from "@/lib/format";
import type { ArticleDetail } from "@/server/articles/queries";

/**
 * An article as readers see it: the header, the bilingual reader, its key
 * vocabulary and Real English, and its credit: the source for news, the
 * references for an explainer. The public article
 * page and the admin preview both render this, so a draft looks exactly as
 * it will once published.
 */
export function ArticleView({
  article,
  children,
}: {
  article: ArticleDetail;
  /** Anything the page adds inside the article, such as structured data. */
  children?: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-reader px-4 py-8 sm:px-6 sm:py-12">
      {children}

      <header>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/category/${article.category.slug}`}
            className={`text-xs font-semibold tracking-wider uppercase hover:underline ${
              categoryAccent(article.category.slug).text
            }`}
          >
            {article.category.name}
          </Link>
          {article.kind === "EXPLAINER" && <ExplainerBadge />}
        </p>
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
            {article.kind === "EXPLAINER" ? "Written" : "Published"}{" "}
            <time dateTime={article.datedAt.toISOString()}>
              {formatArticleDate(article.datedAt)}
            </time>
          </span>
          {article.sourceName && <span>Source: {article.sourceName}</span>}
        </div>
      </header>

      <div className="mt-8">
        <ArticleReader>
          <WordLookup
            articleSlug={article.slug}
            expressions={article.expressionCards}
          >
            <p className="-mb-4 text-sm text-ink-muted">
              {article.expressionCards.length > 0
                ? "Select any English word, or an underlined phrase, to see what it means here."
                : "Select any English word to see what it means here."}
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

      {article.keyVocabulary.length > 0 && (
        <section aria-labelledby="key-vocabulary" className="mt-14">
          <h2
            id="key-vocabulary"
            className="font-serif text-2xl font-semibold tracking-tight text-ink"
          >
            Key vocabulary from this article
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {formatWordCount(article.keyVocabulary.length)} worth learning, in
            the order you meet them.
          </p>
          <div className="mt-4">
            <KeyVocabularyList words={article.keyVocabulary} />
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            Explained by AI for these sentences. It can make mistakes.
          </p>
        </section>
      )}

      {article.expressionCards.length > 0 && (
        <section aria-labelledby="real-english" className="mt-14">
          <h2
            id="real-english"
            className="font-serif text-2xl font-semibold tracking-tight text-ink"
          >
            Real English from this article
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {formatExpressionCount(article.expressionCards.length)}, in the
            order you meet them. Open one to see how it is used.
          </p>
          <div className="mt-4">
            <RealEnglishList cards={article.expressionCards} />
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            {EXPRESSION_SOURCE_NOTE}
          </p>
          <p className="mt-4 text-sm">
            <Link
              href={`/category/${article.category.slug}/expressions`}
              className={textLink}
            >
              {`All Real English for ${article.category.name}`}
            </Link>
          </p>
        </section>
      )}

      <AboutThisArticle article={article} />
    </article>
  );
}
