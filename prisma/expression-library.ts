import { z } from "zod";

import { Difficulty, ExpressionType } from "../src/generated/prisma/enums";
import { slugSchema } from "../src/lib/slug";
import {
  findPhraseOccurrences,
  normalizeExpression,
} from "../src/lib/text/phrases";
import { sentenceAt } from "../src/lib/text/segment";
import {
  REFERENCE_CATEGORIES,
  type ReferenceCategorySlug,
} from "./reference/categories";

/** One Real English card, written ahead of time and checked by a native speaker. */
export type ReferenceExpression = {
  /** Permanent identifier: provisioning upserts by it, so never rename one. */
  slug: string;
  /** The phrase as the card shows it, e.g. "sell out". */
  expression: string;
  type: ExpressionType;
  /** An editorial estimate, not a verified label. */
  level: Difficulty;
  /** The meaning in plain English. */
  en: string;
  /** The natural Turkish meaning. */
  tr: string;
  example: { en: string; tr: string };
  usage?: string;
  /** What a word-for-word Turkish translation gets wrong, when it does. */
  warning?: string;
  /** The categories whose expression page lists it; empty for general phrases. */
  categories: readonly ReferenceCategorySlug[];
  /** The day the user checked the Turkish, as YYYY-MM-DD; unset until then. */
  reviewed?: string;
};

/**
 * Where cards occur in articles, by article slug: the card, the paragraph
 * number and the card's wording exactly as the paragraph has it, such as
 * "sold out" for "sell out".
 */
export type ExpressionOccurrences = Readonly<
  Record<
    string,
    ReadonlyArray<{ expression: string; paragraph: number; text: string }>
  >
>;

/** The `source` of occurrences marked by hand rather than generated. */
export const EDITORIAL_OCCURRENCE_SOURCE = "editorial";

export class ExpressionLibraryError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(
      `The expression library has ${problems.length} problem(s):\n- ${problems
        .slice(0, 100)
        .join("\n- ")}`,
    );
    this.name = "ExpressionLibraryError";
  }
}

const text = (max: number) => z.string().trim().min(1).max(max);

const cardSchema = z.object({
  slug: slugSchema,
  expression: text(64),
  type: z.enum(ExpressionType),
  level: z.enum(Difficulty),
  en: text(300),
  tr: text(200),
  example: z.object({ en: text(300), tr: text(300) }),
  usage: text(300).optional(),
  warning: text(300).optional(),
  reviewed: z.iso.date().optional(),
});

const CATEGORY_SLUGS = new Set<string>(
  REFERENCE_CATEGORIES.map(({ slug }) => slug),
);

function checkCards(cards: readonly ReferenceExpression[]) {
  const problems: string[] = [];
  const slugs = new Set<string>();
  const expressions = new Set<string>();

  for (const card of cards) {
    const label = `"${card.slug}"`;
    const fields = cardSchema.safeParse(card);
    const normalized = normalizeExpression(card.expression);

    if (!fields.success) {
      for (const issue of fields.error.issues) {
        problems.push(`${label}: ${issue.path.join(".")} ${issue.message}`);
      }
    }
    if (card.reviewed === undefined) {
      problems.push(`${label}: the Turkish has not been reviewed`);
    }
    if (normalized.split(" ").length < 2) {
      problems.push(
        `${label}: an expression has at least two words; single words belong in the dictionary`,
      );
    }
    if (slugs.has(card.slug)) {
      problems.push(`${label}: the slug is used twice`);
    }
    if (expressions.has(normalized)) {
      problems.push(`${label}: "${normalized}" already has a card`);
    }
    slugs.add(card.slug);
    expressions.add(normalized);

    card.categories.forEach((category, index) => {
      if (!CATEGORY_SLUGS.has(category)) {
        problems.push(`${label}: "${category}" is not a launch category`);
      }
      if (card.categories.indexOf(category) !== index) {
        problems.push(`${label}: "${category}" is listed twice`);
      }
    });
  }

  if (problems.length > 0) {
    throw new ExpressionLibraryError(problems);
  }
}

/**
 * The Expression rows for the cards, each with the categories that list it
 * and its place on each of those pages, which follows the cards' order.
 * Refuses the whole library, listing every problem, if any card is invalid
 * or not yet reviewed, so unreviewed Turkish never reaches a database.
 */
export function referenceExpressionData(cards: readonly ReferenceExpression[]) {
  checkCards(cards);

  const pageLengths = new Map<string, number>();

  return cards.map((card) => ({
    slug: card.slug,
    expression: card.expression,
    normalizedExpression: normalizeExpression(card.expression),
    type: card.type,
    difficulty: card.level,
    englishMeaning: card.en,
    turkishMeaning: card.tr,
    exampleEnglish: card.example.en,
    exampleTurkish: card.example.tr,
    usageNote: card.usage ?? null,
    literalWarning: card.warning ?? null,
    pronunciation: null,
    categories: card.categories.map((slug) => {
      const displayOrder = (pageLengths.get(slug) ?? 0) + 1;
      pageLengths.set(slug, displayOrder);

      return { slug, displayOrder };
    }),
  }));
}

type Articles = ReadonlyArray<{
  slug: string;
  paragraphs: ReadonlyArray<{ english: string }>;
}>;

export type ResolvedOccurrence = {
  articleSlug: string;
  paragraphOrder: number;
  expressionSlug: string;
  /** UTF-16 offsets into the paragraph's English text. */
  start: number;
  end: number;
  /** The words exactly as the paragraph has them. */
  surfaceText: string;
  sentence: string;
  /** The occurrence's place in its article, in reading order. */
  displayOrder: number;
};

/**
 * Finds every listed occurrence in its paragraph, and reports every problem
 * at once: unknown articles, paragraphs and cards, and wording that is
 * missing, repeated in its paragraph or overlapping another occurrence.
 */
export function resolveExpressionOccurrences(
  articles: Articles,
  cards: readonly ReferenceExpression[],
  occurrences: ExpressionOccurrences,
): ResolvedOccurrence[] {
  const problems: string[] = [];
  const cardSlugs = new Set(cards.map(({ slug }) => slug));
  const resolved: ResolvedOccurrence[] = [];

  for (const [articleSlug, listed] of Object.entries(occurrences)) {
    const article = articles.find(({ slug }) => slug === articleSlug);

    if (!article) {
      problems.push(`occurrences for a missing article: ${articleSlug}`);
      continue;
    }

    const found: Array<Omit<ResolvedOccurrence, "displayOrder">> = [];

    for (const { expression, paragraph, text } of listed) {
      const where = `${articleSlug} ¶${paragraph} "${text}"`;
      const english = article.paragraphs[paragraph - 1]?.english;

      if (!cardSlugs.has(expression)) {
        problems.push(`${where}: there is no card "${expression}"`);
      }
      if (english === undefined) {
        problems.push(`${where}: there is no such paragraph`);
        continue;
      }

      const matches = findPhraseOccurrences(english, text);

      if (matches.length !== 1) {
        problems.push(
          matches.length === 0
            ? `${where}: the paragraph does not contain this wording`
            : `${where}: the paragraph contains this wording ${matches.length} times`,
        );
        continue;
      }

      const [{ start, end, text: surfaceText }] = matches;
      const overlapping = found.find(
        (other) =>
          other.paragraphOrder === paragraph &&
          start < other.end &&
          other.start < end,
      );

      if (overlapping) {
        problems.push(`${where}: overlaps "${overlapping.surfaceText}"`);
        continue;
      }

      found.push({
        articleSlug,
        paragraphOrder: paragraph,
        expressionSlug: expression,
        start,
        end,
        surfaceText,
        sentence: sentenceAt(english, start),
      });
    }

    found
      .sort((a, b) => a.paragraphOrder - b.paragraphOrder || a.start - b.start)
      .forEach((occurrence, index) =>
        resolved.push({ ...occurrence, displayOrder: index + 1 }),
      );
  }

  if (problems.length > 0) {
    throw new ExpressionLibraryError(problems);
  }

  return resolved;
}
