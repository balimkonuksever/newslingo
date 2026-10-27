import "server-only";

import { cache } from "react";

import type { KeyWord } from "@/domain/dictionary";
import type { ExpressionCard, ExpressionMark } from "@/domain/expressions";
import type { Prisma } from "@/generated/prisma/client";
import { type ArticleFilters, datedAtRange } from "@/lib/article-filters";
import { READING_TIME_BANDS } from "@/lib/reading-time";
import { slugSchema } from "@/lib/slug";
import { db } from "@/server/db/client";

/**
 * An article is public when it is published and its category is active. Every
 * public query filters through this, so drafts, archived articles and hidden
 * categories never reach a reader.
 */
export const publicArticleWhere = {
  status: "PUBLISHED",
  category: { isActive: true },
} satisfies Prisma.ArticleWhereInput;

/** The fields an article card shows. */
export const articleSummarySelect = {
  slug: true,
  title: true,
  shortSummary: true,
  difficulty: true,
  kind: true,
  sourceName: true,
  datedAt: true,
  readingTimeMinutes: true,
  category: { select: { slug: true, name: true } },
} satisfies Prisma.ArticleSelect;

export type ArticleSummary = Prisma.ArticleGetPayload<{
  select: typeof articleSummarySelect;
}>;

/** The fields a Real English card shows. */
export const expressionCardSelect = {
  slug: true,
  expression: true,
  type: true,
  difficulty: true,
  englishMeaning: true,
  turkishMeaning: true,
  exampleEnglish: true,
  exampleTurkish: true,
  usageNote: true,
  literalWarning: true,
} satisfies Prisma.ExpressionSelect;

/**
 * What the reader shows of an article. The admin preview loads the same
 * fields, so a draft looks exactly as it will once published.
 */
export const articleDetailSelect = {
  ...articleSummarySelect,
  publishedOnSiteAt: true,
  sourceUrl: true,
  wordCount: true,
  paragraphs: {
    orderBy: { order: "asc" },
    select: { order: true, english: true, turkish: true },
  },
  expressions: {
    orderBy: { displayOrder: "asc" },
    select: {
      startOffset: true,
      endOffset: true,
      paragraph: { select: { order: true } },
      expression: { select: expressionCardSelect },
    },
  },
  vocabulary: {
    orderBy: { displayOrder: "asc" },
    select: {
      sourceSentence: true,
      vocabularyEntry: {
        select: {
          surfaceWord: true,
          lemma: true,
          partOfSpeech: true,
          englishDefinition: true,
          turkishMeaning: true,
          exampleSentence: true,
          ipa: true,
        },
      },
    },
  },
} satisfies Prisma.ArticleSelect;

type ArticleDetailRecord = Prisma.ArticleGetPayload<{
  select: typeof articleDetailSelect;
}>;

/**
 * An article as the reader shows it: each paragraph with the Real English
 * expressions marked in it, one card for every expression that occurs, and
 * its key vocabulary.
 */
export type ArticleDetail = Omit<
  ArticleDetailRecord,
  "paragraphs" | "expressions" | "vocabulary"
> & {
  paragraphs: Array<
    ArticleDetailRecord["paragraphs"][number] & {
      expressions: ExpressionMark[];
    }
  >;
  /** In the article's display order, each expression once. */
  expressionCards: ExpressionCard[];
  /** In display order. */
  keyVocabulary: KeyWord[];
};

export function toArticleDetail({
  paragraphs,
  expressions,
  vocabulary,
  ...article
}: ArticleDetailRecord): ArticleDetail {
  const cards = new Map<string, ExpressionCard>();

  for (const { expression } of expressions) {
    if (!cards.has(expression.slug)) {
      cards.set(expression.slug, expression);
    }
  }

  return {
    ...article,
    paragraphs: paragraphs.map((paragraph) => ({
      ...paragraph,
      expressions: expressions
        .filter((mark) => mark.paragraph.order === paragraph.order)
        .map(({ expression, startOffset, endOffset }) => ({
          slug: expression.slug,
          start: startOffset,
          end: endOffset,
        }))
        .sort((a, b) => a.start - b.start),
    })),
    expressionCards: [...cards.values()],
    keyVocabulary: vocabulary.map(
      ({ sourceSentence, vocabularyEntry: { surfaceWord, ...entry } }) => ({
        word: surfaceWord,
        ...entry,
        sentence: sourceSentence,
      }),
    ),
  };
}

/**
 * The featured story is the most recently published article. Up to
 * `latestLimit` further articles follow it, newest first.
 */
export async function getFeaturedAndLatestArticles(latestLimit: number) {
  const [featured = null, ...latest] = await db.article.findMany({
    where: publicArticleWhere,
    orderBy: [{ publishedOnSiteAt: "desc" }, { id: "asc" }],
    take: latestLimit + 1,
    select: articleSummarySelect,
  });

  return { featured, latest };
}

/**
 * Public articles matching the homepage filters, newest `datedAt` first.
 */
export async function listPublicArticles(
  filters: ArticleFilters,
  limit: number,
) {
  const band = filters.length ? READING_TIME_BANDS[filters.length] : null;

  return db.article.findMany({
    where: {
      ...publicArticleWhere,
      category: { ...publicArticleWhere.category, slug: filters.category },
      difficulty: filters.level,
      readingTimeMinutes: band
        ? { gte: band.minMinutes, lte: band.maxMinutes ?? undefined }
        : undefined,
      datedAt: datedAtRange(filters),
    },
    orderBy: [{ datedAt: "desc" }, { id: "asc" }],
    take: limit,
    select: articleSummarySelect,
  });
}

/**
 * A public article with its paragraph pairs in reading order and its Real
 * English expressions, or null. Memoized per request, so metadata and the
 * page share one database read.
 */
export const getPublicArticleBySlug = cache(
  async (slug: string): Promise<ArticleDetail | null> => {
    const parsedSlug = slugSchema.safeParse(slug);

    if (!parsedSlug.success) {
      return null;
    }

    const article = await db.article.findUnique({
      where: { slug: parsedSlug.data, ...publicArticleWhere },
      select: articleDetailSelect,
    });

    return article && toArticleDetail(article);
  },
);
