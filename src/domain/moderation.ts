import { requiredLicence, SOURCE_LICENCE_NAMES } from "@/domain/sources";
import type {
  ArticleKind,
  ArticleStatus,
  ModerationAction,
  SourceLicence,
} from "@/generated/prisma/enums";
import { countWords, estimateReadingMinutes } from "@/lib/reading-time";

// What an admin may do to an article, and what an article needs before it
// can be published (M5). The server enforces these rules; admin pages use
// them only to decide which actions to offer.

type Rule = {
  /** The statuses the action starts from. */
  from: readonly ArticleStatus[];
  /** The status it leaves, or `null` when the status stays the same. */
  to: ArticleStatus | null;
  reasonRequired: boolean;
};

const EDITABLE: readonly ArticleStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

/**
 * Fetched, processing and failed articles belong to the generation pipeline
 * (M6, M7), so no admin action starts from them.
 */
export const MODERATION_RULES: Record<ModerationAction, Rule> = {
  PUBLISH: { from: ["DRAFT"], to: "PUBLISHED", reasonRequired: false },
  // Archiving a draft is how it is rejected.
  ARCHIVE: {
    from: ["DRAFT", "PUBLISHED"],
    to: "ARCHIVED",
    reasonRequired: true,
  },
  RESTORE: { from: ["ARCHIVED"], to: "DRAFT", reasonRequired: true },
  CHANGE_CATEGORY: { from: EDITABLE, to: null, reasonRequired: true },
  CHANGE_DIFFICULTY: { from: EDITABLE, to: null, reasonRequired: true },
};

export function canModerate(action: ModerationAction, status: ArticleStatus) {
  return MODERATION_RULES[action].from.includes(status);
}

/** The longest reason or note an admin can give, in characters. */
export const MAX_REASON_LENGTH = 500;

/** Every status, in the order admin pages list them: the review queue first. */
export const ARTICLE_STATUSES: readonly ArticleStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
  "FETCHED",
  "PROCESSING",
  "FAILED",
];

/** A status's name on its own, as in a list or a badge. */
export const ARTICLE_STATUS_NAMES: Record<ArticleStatus, string> = {
  FETCHED: "Fetched",
  PROCESSING: "Processing",
  DRAFT: "Draft",
  PUBLISHED: "Published",
  FAILED: "Failed",
  ARCHIVED: "Archived",
};

export const MODERATION_ACTION_LABELS: Record<ModerationAction, string> = {
  PUBLISH: "Publishing",
  ARCHIVE: "Archiving",
  RESTORE: "Restoring to draft",
  CHANGE_CATEGORY: "Changing the category",
  CHANGE_DIFFICULTY: "Changing the level",
};

/** A status as it reads after "an article that is". */
export const ARTICLE_STATUS_LABELS: Record<ArticleStatus, string> = {
  FETCHED: "fetched",
  PROCESSING: "being processed",
  DRAFT: "a draft",
  PUBLISHED: "published",
  FAILED: "failed",
  ARCHIVED: "archived",
};

/** The parts of an article that publication depends on. */
export type PublicationCandidate = {
  title: string;
  categoryIsActive: boolean;
  kind: ArticleKind;
  /** News only, like the licence. */
  sourceName: string | null;
  sourceUrl: string | null;
  sourceLicence: SourceLicence | null;
  /** An explainer's. */
  references: ReadonlyArray<{ title: string; publisher: string; url: string }>;
  wordCount: number;
  readingTimeMinutes: number;
  paragraphs: ReadonlyArray<{
    order: number;
    english: string;
    turkish: string;
  }>;
  expressions: ReadonlyArray<{
    paragraphOrder: number;
    startOffset: number;
    endOffset: number;
    surfaceText: string;
  }>;
};

function isBlank(text: string) {
  return !/\S/.test(text);
}

/** Whether `value` is an http or https address, safe to link to. */
export function isWebAddress(value: string) {
  try {
    const { protocol } = new URL(value);

    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * What is missing from the article's credit: news credits its source, and
 * the licence when the source requires it; an explainer lists references
 * that readers can check its facts in.
 */
function creditProblems({
  kind,
  sourceName,
  sourceUrl,
  sourceLicence,
  references,
}: PublicationCandidate) {
  if (kind === "EXPLAINER") {
    if (references.length === 0) {
      return ["It is an explainer with no references."];
    }

    return references.some(
      ({ title, publisher, url }) =>
        isBlank(title) || isBlank(publisher) || !isWebAddress(url),
    )
      ? ["A reference is missing its title, its publisher or a web address."]
      : [];
  }

  if (
    !sourceName ||
    isBlank(sourceName) ||
    !sourceUrl ||
    !isWebAddress(sourceUrl)
  ) {
    return ["Its source attribution is incomplete."];
  }

  const licence = requiredLicence(sourceUrl);

  return licence && sourceLicence !== licence
    ? [
        `Its source is published under ${SOURCE_LICENCE_NAMES[licence]}, which the article does not record.`,
      ]
    : [];
}

/**
 * Why an article may not be published yet; an empty list when it may. The
 * database already refuses blank paragraphs and missing columns, so these
 * checks cover what it cannot see.
 */
export function publicationProblems(article: PublicationCandidate) {
  const problems: string[] = [];
  const { paragraphs } = article;

  if (isBlank(article.title)) {
    problems.push("It has no title.");
  }

  if (!article.categoryIsActive) {
    problems.push(
      "Its category is switched off, so readers could not reach it.",
    );
  }

  problems.push(...creditProblems(article));

  if (paragraphs.length === 0) {
    problems.push("It has no paragraphs.");
  }

  const orders = paragraphs.map(({ order }) => order).sort((a, b) => a - b);

  if (orders.some((order, index) => order !== index + 1)) {
    problems.push("Its paragraphs are not numbered 1, 2, 3 and so on.");
  }

  if (
    paragraphs.some(
      ({ english, turkish }) => isBlank(english) || isBlank(turkish),
    )
  ) {
    problems.push("A paragraph is missing its English or its Turkish.");
  }

  const wordCount = paragraphs.reduce(
    (total, { english }) => total + countWords(english),
    0,
  );

  if (
    article.wordCount !== wordCount ||
    article.readingTimeMinutes !== estimateReadingMinutes(wordCount)
  ) {
    problems.push("Its word count or reading time does not match its English.");
  }

  const english = new Map(
    paragraphs.map(({ order, english }) => [order, english]),
  );

  if (
    article.expressions.some(
      ({ paragraphOrder, startOffset, endOffset, surfaceText }) =>
        english.get(paragraphOrder)?.slice(startOffset, endOffset) !==
        surfaceText,
    )
  ) {
    problems.push(
      "A marked expression no longer matches the words in its paragraph.",
    );
  }

  return problems;
}
