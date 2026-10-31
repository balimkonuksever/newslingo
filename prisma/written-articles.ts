import { publicationProblems } from "../src/domain/moderation";
import type { Difficulty, SourceLicence } from "../src/generated/prisma/enums";
import { countWords, estimateReadingMinutes } from "../src/lib/reading-time";
import { slugSchema } from "../src/lib/slug";
import {
  EditorialDictionaryError,
  type EditorialSense,
  editorialVocabularyRows,
  type SenseChoices,
} from "./editorial-dictionary";
import {
  type ExpressionOccurrences,
  ExpressionLibraryError,
  type ReferenceExpression,
  type ResolvedOccurrence,
  resolveExpressionOccurrences,
} from "./expression-library";
import {
  type KeyVocabulary,
  KeyVocabularyError,
  type ResolvedKeyWord,
  resolveKeyVocabulary,
} from "./key-vocabulary";
import {
  REFERENCE_CATEGORIES,
  type ReferenceCategorySlug,
} from "./reference/categories";

// Articles written in Claude Code sessions (milestone W), one file per
// article in prisma/editorial/articles. `pnpm articles:import` checks them
// all with `resolveWrittenArticles` and writes new and changed ones as drafts
// for the user to review in the admin. Once the user approves a draft, its
// file is marked with the day it was published, and the import publishes it.

type WrittenArticleContent = {
  /** Permanent: the import finds the article by it, so never rename one. */
  slug: string;
  title: string;
  shortSummary: string;
  categorySlug: ReferenceCategorySlug;
  difficulty: Difficulty;
  /** In reading order. The English length must suit the level (TARGET_WORDS). */
  paragraphs: ReadonlyArray<{ english: string; turkish: string }>;
  /**
   * The sense of every spelling that has several in the editorial
   * dictionary: by paragraph number, each spelling's sense ids in the order
   * it occurs, as in prisma/fixtures/sense-choices.ts.
   */
  senseChoices?: SenseChoices[string];
  /** Six to eight words, each by its paragraph and its spelling there. */
  keyVocabulary: KeyVocabulary[string];
  /** Real English occurrences, by card slug and exact wording. */
  expressions: ExpressionOccurrences[string];
  /**
   * The publication mark: the day the user approved the article for the
   * site, a whole day such as new Date("2026-10-31"). The import publishes
   * an article with the mark and writes one without it as a draft.
   */
  publishedOnSite?: Date;
};

/** News adapted from one source, dated by the source's publication time. */
export type WrittenNews = WrittenArticleContent & {
  kind: "NEWS";
  source: {
    /** For a GOV.UK story, the lead department. */
    name: string;
    url: string;
    publishedAt: Date;
    /** Required when the source's licence must be credited, as GOV.UK's is. */
    licence: SourceLicence | null;
  };
};

/** An explainer written from general knowledge, dated the day it was written. */
export type WrittenExplainer = WrittenArticleContent & {
  kind: "EXPLAINER";
  writtenAt: Date;
  /** Where readers can check its facts: at least one. */
  references: ReadonlyArray<{
    title: string;
    publisher: string;
    url: string;
    /** A whole day, such as new Date("2026-10-27"). */
    checkedAt: Date;
  }>;
};

export type WrittenArticle = WrittenNews | WrittenExplainer;

/** English words per level, decided on 2026-10-27 (IMPLEMENTATION_PLAN.md §4). */
export const TARGET_WORDS: Record<Difficulty, { min: number; max: number }> = {
  A2: { min: 150, max: 250 },
  B1: { min: 250, max: 350 },
  B2: { min: 300, max: 450 },
  C1: { min: 450, max: 650 },
};

/** The fewest key words a written article lists; key-vocabulary.ts sets the most. */
export const MIN_KEY_WORDS = 6;

export class WrittenArticlesError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(
      `The written articles have ${problems.length} problem(s):\n- ${problems
        .slice(0, 100)
        .join("\n- ")}`,
    );
    this.name = "WrittenArticlesError";
  }
}

export type VocabularyRow = ReturnType<typeof editorialVocabularyRows>[number];

/** A checked article with everything the import writes for it. */
export type ResolvedWrittenArticle = {
  article: WrittenArticle;
  wordCount: number;
  readingTimeMinutes: number;
  /** The date readers see. */
  datedAt: Date;
  /** In reading order. */
  keyWords: ResolvedKeyWord[];
  /** In reading order. */
  marks: ResolvedOccurrence[];
};

export type WrittenArticleContext = {
  dictionary: readonly EditorialSense[];
  expressions: readonly ReferenceExpression[];
  /** Slugs and source addresses the written articles may not reuse. */
  demoArticles: ReadonlyArray<{ slug: string }>;
  demoSourceUrls: ReadonlySet<string>;
};

function isBlankOrPadded(text: string) {
  return !/\S/.test(text) || text !== text.trim();
}

function isValidDate(date: Date) {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function isWholeDay(date: Date) {
  return isValidDate(date) && date.toISOString().endsWith("T00:00:00.000Z");
}

/** Problems with one article's own fields, before anything is resolved. */
function fieldProblems(article: WrittenArticle) {
  const problems: string[] = [];
  const { slug } = article;

  if (!slugSchema.safeParse(slug).success) {
    problems.push(`${slug}: the slug is not valid`);
  }
  if (
    !REFERENCE_CATEGORIES.some(
      ({ slug: known }) => known === article.categorySlug,
    )
  ) {
    problems.push(`${slug}: there is no category "${article.categorySlug}"`);
  }
  if (isBlankOrPadded(article.title)) {
    problems.push(`${slug}: the title is blank or has spaces at an end`);
  }
  if (isBlankOrPadded(article.shortSummary)) {
    problems.push(`${slug}: the summary is blank or has spaces at an end`);
  }

  article.paragraphs.forEach(({ english, turkish }, index) => {
    if (isBlankOrPadded(english) || isBlankOrPadded(turkish)) {
      problems.push(
        `${slug} ¶${index + 1}: the English or Turkish is blank or has spaces at an end`,
      );
    }
  });

  if (article.kind === "NEWS") {
    if (!isValidDate(article.source.publishedAt)) {
      problems.push(`${slug}: the source's publication time is not a date`);
    }
  } else {
    if (!isValidDate(article.writtenAt)) {
      problems.push(`${slug}: the day it was written is not a date`);
    }
    article.references.forEach(({ checkedAt }, index) => {
      if (!isWholeDay(checkedAt)) {
        problems.push(
          `${slug}: reference ${index + 1} must be checked on a whole day, such as new Date("2026-10-27")`,
        );
      }
    });
  }

  const { publishedOnSite } = article;
  const datedAt =
    article.kind === "NEWS" ? article.source.publishedAt : article.writtenAt;

  if (publishedOnSite !== undefined) {
    if (!isWholeDay(publishedOnSite)) {
      problems.push(
        `${slug}: the publication mark must be a whole day, such as new Date("2026-10-31")`,
      );
    } else if (
      isValidDate(datedAt) &&
      publishedOnSite.toISOString().slice(0, 10) <
        datedAt.toISOString().slice(0, 10)
    ) {
      problems.push(
        `${slug}: the publication mark is earlier than the article's date`,
      );
    }
  }

  const words = article.paragraphs.reduce(
    (total, { english }) => total + countWords(english),
    0,
  );
  const target = TARGET_WORDS[article.difficulty];

  if (target && (words < target.min || words > target.max)) {
    problems.push(
      `${slug}: ${words} English words, outside ${target.min}–${target.max} for ${article.difficulty}`,
    );
  }

  const keyWords = article.keyVocabulary.length;

  if (keyWords < MIN_KEY_WORDS) {
    problems.push(
      `${slug}: ${keyWords} key words, fewer than ${MIN_KEY_WORDS}`,
    );
  }

  return problems;
}

/** Runs a resolver, turning the problems it throws into list items. */
function collect<T>(problems: string[], resolve: () => T): T | undefined {
  try {
    return resolve();
  } catch (error) {
    if (
      error instanceof EditorialDictionaryError ||
      error instanceof KeyVocabularyError ||
      error instanceof ExpressionLibraryError
    ) {
      problems.push(...error.problems);
      return undefined;
    }

    throw error;
  }
}

/**
 * Checks every written article and works out what the import writes for
 * it, reporting every problem at once: the fields, the target length, the
 * credit, a sense for every word, the key vocabulary and the Real English
 * marks. Any problem refuses the whole batch.
 */
export function resolveWrittenArticles(
  articles: readonly WrittenArticle[],
  context: WrittenArticleContext,
): { articles: ResolvedWrittenArticle[]; vocabularyRows: VocabularyRow[] } {
  const problems = articles.flatMap(fieldProblems);
  const demoSlugs = new Set(context.demoArticles.map(({ slug }) => slug));
  const seenSlugs = new Set<string>();
  const seenSources = new Set<string>();

  for (const article of articles) {
    if (demoSlugs.has(article.slug)) {
      problems.push(`${article.slug}: a demo article already has this slug`);
    }
    if (seenSlugs.has(article.slug)) {
      problems.push(`${article.slug}: two articles have this slug`);
    }
    seenSlugs.add(article.slug);

    if (article.kind === "NEWS") {
      const { url } = article.source;

      if (seenSources.has(url) || context.demoSourceUrls.has(url)) {
        problems.push(
          `${article.slug}: another article is adapted from ${url}`,
        );
      }
      seenSources.add(url);
    }
  }

  const choices: SenseChoices = Object.fromEntries(
    articles.map(({ slug, senseChoices }) => [slug, senseChoices ?? {}]),
  );
  const vocabularyRows =
    collect(problems, () =>
      editorialVocabularyRows(articles, context.dictionary, choices, {
        requireEveryEntryUsed: false,
      }),
    ) ?? [];
  const keyWords =
    collect(problems, () =>
      resolveKeyVocabulary(
        articles,
        Object.fromEntries(
          articles.map(({ slug, keyVocabulary }) => [slug, keyVocabulary]),
        ),
      ),
    ) ?? [];
  const marks =
    collect(problems, () =>
      resolveExpressionOccurrences(
        articles,
        context.expressions,
        Object.fromEntries(
          articles.map(({ slug, expressions }) => [slug, expressions]),
        ),
      ),
    ) ?? [];

  for (const word of keyWords) {
    const inside = marks.find(
      (mark) =>
        mark.articleSlug === word.articleSlug &&
        mark.paragraphOrder === word.paragraphOrder &&
        word.start < mark.end &&
        mark.start < word.end,
    );

    if (inside) {
      problems.push(
        `${word.articleSlug} ¶${word.paragraphOrder} "${word.surfaceWord}": a key word inside the marked expression "${inside.surfaceText}", which the reader cannot open on its own`,
      );
    }
  }

  const resolved = articles.map((article): ResolvedWrittenArticle => {
    const wordCount = article.paragraphs.reduce(
      (total, { english }) => total + countWords(english),
      0,
    );
    const readingTimeMinutes = estimateReadingMinutes(wordCount);
    const articleMarks = marks.filter(
      ({ articleSlug }) => articleSlug === article.slug,
    );
    const credit =
      article.kind === "NEWS"
        ? {
            sourceName: article.source.name,
            sourceUrl: article.source.url,
            sourceLicence: article.source.licence,
            references: [],
          }
        : {
            sourceName: null,
            sourceUrl: null,
            sourceLicence: null,
            references: article.references,
          };

    // The checks an admin's publish runs, so a file that imports can be published.
    for (const problem of publicationProblems({
      title: article.title,
      categoryIsActive: true,
      kind: article.kind,
      ...credit,
      wordCount,
      readingTimeMinutes,
      paragraphs: article.paragraphs.map((paragraph, index) => ({
        ...paragraph,
        order: index + 1,
      })),
      expressions: articleMarks.map((mark) => ({
        paragraphOrder: mark.paragraphOrder,
        startOffset: mark.start,
        endOffset: mark.end,
        surfaceText: mark.surfaceText,
      })),
    })) {
      problems.push(`${article.slug}: ${problem}`);
    }

    return {
      article,
      wordCount,
      readingTimeMinutes,
      datedAt:
        article.kind === "NEWS"
          ? article.source.publishedAt
          : article.writtenAt,
      keyWords: keyWords.filter(
        ({ articleSlug }) => articleSlug === article.slug,
      ),
      marks: articleMarks,
    };
  });

  if (problems.length > 0) {
    throw new WrittenArticlesError(problems);
  }

  return { articles: resolved, vocabularyRows };
}
