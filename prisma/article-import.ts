import {
  DICTIONARY_SCHEMA_VERSION,
  EDITORIAL_SOURCE,
} from "../src/domain/dictionary";
import type { Prisma, PrismaClient } from "../src/generated/prisma/client";
import type { ArticleStatus } from "../src/generated/prisma/enums";
import { EDITORIAL_OCCURRENCE_SOURCE } from "./expression-library";
import { diffEditorialEntries, writeEditorialEntries } from "./seeders";
import type { ResolvedWrittenArticle, VocabularyRow } from "./written-articles";

// Writes checked written articles (milestone W) as drafts: new ones are
// created, changed drafts are rewritten, and an article that is no longer a
// draft is never touched. `resolveWrittenArticles` checks the files first.

type Db = PrismaClient | Prisma.TransactionClient;

export class ArticleImportError extends Error {
  constructor(
    message: string,
    readonly problems: readonly string[] = [],
  ) {
    super(
      problems.length > 0 ? `${message}\n- ${problems.join("\n- ")}` : message,
    );
    this.name = "ArticleImportError";
  }
}

/** What the import does with one article. */
export type ImportStep =
  | { slug: string; action: "create" }
  | { slug: string; action: "update"; id: string; changed: string[] }
  | { slug: string; action: "unchanged" }
  | {
      slug: string;
      action: "refuse";
      status: ArticleStatus;
      changed: string[];
    };

export type ImportPlan = {
  steps: ImportStep[];
  /** Dictionary entries to add, and to rewrite after a correction. */
  entries: { added: number; changed: number };
  /** Why nothing can be written; empty when the import may go ahead. */
  problems: string[];
};

/** An article's content as the import compares it, by what readers call it. */
type Content = Record<string, unknown>;

const contentSelect = {
  id: true,
  slug: true,
  status: true,
  title: true,
  shortSummary: true,
  difficulty: true,
  kind: true,
  sourceName: true,
  sourceUrl: true,
  sourcePublishedAt: true,
  sourceLicence: true,
  datedAt: true,
  wordCount: true,
  readingTimeMinutes: true,
  category: { select: { slug: true } },
  paragraphs: {
    orderBy: { order: "asc" },
    select: { order: true, english: true, turkish: true },
  },
  references: {
    orderBy: { order: "asc" },
    select: {
      order: true,
      title: true,
      publisher: true,
      url: true,
      checkedAt: true,
    },
  },
  vocabulary: {
    orderBy: { displayOrder: "asc" },
    select: {
      displayOrder: true,
      sourceSentence: true,
      vocabularyEntry: { select: { normalizedWord: true, contextHash: true } },
    },
  },
  expressions: {
    orderBy: { displayOrder: "asc" },
    select: {
      displayOrder: true,
      startOffset: true,
      endOffset: true,
      surfaceText: true,
      sentence: true,
      paragraph: { select: { order: true } },
      expression: { select: { slug: true } },
    },
  },
} satisfies Prisma.ArticleSelect;

type StoredArticle = Prisma.ArticleGetPayload<{ select: typeof contentSelect }>;

const iso = (date: Date | null) => date?.toISOString() ?? null;

function fileContent({
  article,
  wordCount,
  readingTimeMinutes,
  datedAt,
  keyWords,
  marks,
}: ResolvedWrittenArticle): Content {
  const news = article.kind === "NEWS" ? article.source : null;

  return {
    title: article.title,
    summary: article.shortSummary,
    category: article.categorySlug,
    level: article.difficulty,
    kind: article.kind,
    source: news
      ? {
          name: news.name,
          url: news.url,
          publishedAt: iso(news.publishedAt),
          licence: news.licence,
        }
      : null,
    date: iso(datedAt),
    length: { wordCount, readingTimeMinutes },
    paragraphs: article.paragraphs.map(({ english, turkish }, index) => ({
      order: index + 1,
      english,
      turkish,
    })),
    references:
      article.kind === "EXPLAINER"
        ? article.references.map((reference, index) => ({
            order: index + 1,
            title: reference.title,
            publisher: reference.publisher,
            url: reference.url,
            checkedAt: iso(reference.checkedAt),
          }))
        : [],
    "key vocabulary": keyWords.map((word) => ({
      displayOrder: word.displayOrder,
      sourceSentence: word.sourceSentence,
      normalizedWord: word.normalizedWord,
      contextHash: word.contextHash,
    })),
    "Real English marks": marks.map((mark) => ({
      displayOrder: mark.displayOrder,
      startOffset: mark.start,
      endOffset: mark.end,
      surfaceText: mark.surfaceText,
      sentence: mark.sentence,
      paragraphOrder: mark.paragraphOrder,
      expression: mark.expressionSlug,
    })),
  };
}

function storedContent(stored: StoredArticle): Content {
  return {
    title: stored.title,
    summary: stored.shortSummary,
    category: stored.category.slug,
    level: stored.difficulty,
    kind: stored.kind,
    source:
      stored.sourceName === null
        ? null
        : {
            name: stored.sourceName,
            url: stored.sourceUrl,
            publishedAt: iso(stored.sourcePublishedAt),
            licence: stored.sourceLicence,
          },
    date: iso(stored.datedAt),
    length: {
      wordCount: stored.wordCount,
      readingTimeMinutes: stored.readingTimeMinutes,
    },
    paragraphs: stored.paragraphs,
    references: stored.references.map((reference) => ({
      ...reference,
      checkedAt: iso(reference.checkedAt),
    })),
    "key vocabulary": stored.vocabulary.map((word) => ({
      displayOrder: word.displayOrder,
      sourceSentence: word.sourceSentence,
      normalizedWord: word.vocabularyEntry.normalizedWord,
      contextHash: word.vocabularyEntry.contextHash,
    })),
    "Real English marks": stored.expressions.map((mark) => ({
      displayOrder: mark.displayOrder,
      startOffset: mark.startOffset,
      endOffset: mark.endOffset,
      surfaceText: mark.surfaceText,
      sentence: mark.sentence,
      paragraphOrder: mark.paragraph.order,
      expression: mark.expression.slug,
    })),
  };
}

/** The parts of an article whose stored version differs from its file. */
function changedParts(file: Content, stored: Content) {
  return Object.keys(file).filter(
    (part) => JSON.stringify(file[part]) !== JSON.stringify(stored[part]),
  );
}

/**
 * Works out, without writing anything, what importing `articles` would do:
 * each article's step, the dictionary entries to add or rewrite, and any
 * reason the import cannot run at all.
 */
export async function planArticleImport(
  db: Db,
  articles: readonly ResolvedWrittenArticle[],
  vocabularyRows: readonly VocabularyRow[],
): Promise<ImportPlan> {
  const problems: string[] = [];
  const slugs = articles.map(({ article }) => article.slug);
  const sourceUrls = articles.flatMap(({ article }) =>
    article.kind === "NEWS" ? [article.source.url] : [],
  );
  const categorySlugs = [
    ...new Set(articles.map(({ article }) => article.categorySlug)),
  ];
  const expressionSlugs = [
    ...new Set(
      articles.flatMap(({ marks }) => marks.map((mark) => mark.expressionSlug)),
    ),
  ];

  // One query at a time: inside the import's transaction they share a connection.
  const stored = await db.article.findMany({
    where: { slug: { in: slugs } },
    select: contentSelect,
  });
  const sameSource = await db.article.findMany({
    where: { sourceUrl: { in: sourceUrls }, slug: { notIn: slugs } },
    select: { slug: true, sourceUrl: true },
  });
  const categories = await db.category.findMany({
    where: { slug: { in: categorySlugs } },
    select: { slug: true },
  });
  const expressions = await db.expression.findMany({
    where: { slug: { in: expressionSlugs } },
    select: { slug: true },
  });
  const entries = await diffEditorialEntries(db, vocabularyRows);

  if (
    categories.length < categorySlugs.length ||
    expressions.length < expressionSlugs.length
  ) {
    problems.push(
      "The database is missing categories or Real English cards. Run pnpm db:seed:reference first.",
    );
  }

  for (const { slug, sourceUrl } of sameSource) {
    problems.push(
      `Article "${slug}" in the database is already adapted from ${sourceUrl}.`,
    );
  }

  const bySlug = new Map(stored.map((article) => [article.slug, article]));
  const steps = articles.map((resolved): ImportStep => {
    const { slug } = resolved.article;
    const existing = bySlug.get(slug);

    if (!existing) {
      return { slug, action: "create" };
    }

    const changed = changedParts(
      fileContent(resolved),
      storedContent(existing),
    );

    if (changed.length === 0) {
      return { slug, action: "unchanged" };
    }

    return existing.status === "DRAFT"
      ? { slug, action: "update", id: existing.id, changed }
      : { slug, action: "refuse", status: existing.status, changed };
  });

  for (const step of steps) {
    if (step.action === "refuse") {
      problems.push(
        `"${step.slug}" is ${step.status.toLowerCase()}, and its file differs in: ${step.changed.join(", ")}. The import only changes drafts: archive it, restore it to draft, then import again.`,
      );
    }
  }

  return {
    steps,
    entries: {
      added: entries.missing.length,
      changed: entries.changed.length,
    },
    problems,
  };
}

async function writeArticle(
  tx: Prisma.TransactionClient,
  step: Extract<ImportStep, { action: "create" | "update" }>,
  {
    article,
    wordCount,
    readingTimeMinutes,
    datedAt,
    keyWords,
    marks,
  }: ResolvedWrittenArticle,
  ids: {
    categories: ReadonlyMap<string, string>;
    expressions: ReadonlyMap<string, string>;
    entries: ReadonlyMap<string, string>;
  },
) {
  const news = article.kind === "NEWS" ? article.source : null;
  const data = {
    slug: article.slug,
    title: article.title,
    shortSummary: article.shortSummary,
    categoryId: ids.categories.get(article.categorySlug)!,
    difficulty: article.difficulty,
    kind: article.kind,
    sourceName: news?.name ?? null,
    sourceUrl: news?.url ?? null,
    sourcePublishedAt: news?.publishedAt ?? null,
    sourceLicence: news?.licence ?? null,
    datedAt,
    sourceImageUrl: null,
    imageAttribution: null,
    wordCount,
    readingTimeMinutes,
  };
  let articleId: string;

  if (step.action === "create") {
    ({ id: articleId } = await tx.article.create({
      data: { ...data, status: "DRAFT", publishedOnSiteAt: null },
      select: { id: true },
    }));
  } else {
    // Only a draft is rewritten, even if an admin publishes it meanwhile.
    const { count } = await tx.article.updateMany({
      where: { id: step.id, status: "DRAFT" },
      data,
    });

    if (count !== 1) {
      throw new ArticleImportError(
        `"${article.slug}" stopped being a draft during the import. Nothing was written.`,
      );
    }

    articleId = step.id;
    // Removing the paragraphs removes their marks too.
    await tx.articleParagraph.deleteMany({ where: { articleId } });
    await tx.articleReference.deleteMany({ where: { articleId } });
    await tx.articleVocabulary.deleteMany({ where: { articleId } });
  }

  await tx.articleParagraph.createMany({
    data: article.paragraphs.map(({ english, turkish }, index) => ({
      articleId,
      order: index + 1,
      english,
      turkish,
    })),
  });

  if (article.kind === "EXPLAINER") {
    await tx.articleReference.createMany({
      data: article.references.map((reference, index) => ({
        ...reference,
        articleId,
        order: index + 1,
      })),
    });
  }

  const paragraphIds = new Map(
    (
      await tx.articleParagraph.findMany({
        where: { articleId },
        select: { id: true, order: true },
      })
    ).map(({ id, order }) => [order, id]),
  );

  await tx.articleExpression.createMany({
    data: marks.map((mark) => ({
      articleId,
      expressionId: ids.expressions.get(mark.expressionSlug)!,
      paragraphId: paragraphIds.get(mark.paragraphOrder)!,
      surfaceText: mark.surfaceText,
      sentence: mark.sentence,
      startOffset: mark.start,
      endOffset: mark.end,
      displayOrder: mark.displayOrder,
      source: EDITORIAL_OCCURRENCE_SOURCE,
    })),
  });
  await tx.articleVocabulary.createMany({
    data: keyWords.map((word) => ({
      articleId,
      vocabularyEntryId: ids.entries.get(
        `${word.normalizedWord} ${word.contextHash}`,
      )!,
      sourceSentence: word.sourceSentence,
      displayOrder: word.displayOrder,
      source: EDITORIAL_SOURCE.provider,
    })),
  });
}

/**
 * Imports `articles` in one transaction: their dictionary entries first,
 * then each new or changed draft with its paragraphs, references, Real
 * English marks and key vocabulary. It writes nothing if any article it
 * would change is no longer a draft, and a second run changes nothing.
 */
export async function importArticles(
  db: PrismaClient,
  articles: readonly ResolvedWrittenArticle[],
  vocabularyRows: readonly VocabularyRow[],
) {
  return db.$transaction(
    async (tx) => {
      const plan = await planArticleImport(tx, articles, vocabularyRows);

      if (plan.problems.length > 0) {
        throw new ArticleImportError(
          "Nothing was imported, because:",
          plan.problems,
        );
      }

      const entries = await writeEditorialEntries(tx, vocabularyRows);
      const categories = await tx.category.findMany({
        select: { id: true, slug: true },
      });
      const expressions = await tx.expression.findMany({
        select: { id: true, slug: true },
      });
      const storedEntries = await tx.vocabularyEntry.findMany({
        where: {
          provider: EDITORIAL_SOURCE.provider,
          providerVersion: EDITORIAL_SOURCE.version,
          schemaVersion: DICTIONARY_SCHEMA_VERSION,
          contextHash: {
            in: articles.flatMap(({ keyWords }) =>
              keyWords.map(({ contextHash }) => contextHash),
            ),
          },
        },
        select: { id: true, normalizedWord: true, contextHash: true },
      });
      const ids = {
        categories: new Map(categories.map(({ id, slug }) => [slug, id])),
        expressions: new Map(expressions.map(({ id, slug }) => [slug, id])),
        entries: new Map(
          storedEntries.map(({ id, normalizedWord, contextHash }) => [
            `${normalizedWord} ${contextHash}`,
            id,
          ]),
        ),
      };

      for (const step of plan.steps) {
        if (step.action === "create" || step.action === "update") {
          await writeArticle(
            tx,
            step,
            articles.find(({ article }) => article.slug === step.slug)!,
            ids,
          );
        }
      }

      const count = (action: ImportStep["action"]) =>
        plan.steps.filter((step) => step.action === action).length;

      return {
        created: count("create"),
        updated: count("update"),
        unchanged: count("unchanged"),
        entries,
      };
    },
    // Thousands of dictionary entries can take longer than Prisma's default.
    { maxWait: 10_000, timeout: 5 * 60_000 },
  );
}
