import type { Difficulty, ExpressionType } from "@/generated/prisma/enums";

/** How the reader names each expression type. */
export const EXPRESSION_TYPE_LABELS: Record<ExpressionType, string> = {
  IDIOM: "idiom",
  PHRASAL_VERB: "phrasal verb",
  COLLOCATION: "collocation",
  COMMON_EXPRESSION: "common expression",
  SLANG: "slang",
  NEWS_ENGLISH: "news English",
};

/** What a Real English card shows: one expression, ready for the reader. */
export type ExpressionCard = {
  slug: string;
  /** The phrase as the card names it, e.g. "sell out". */
  expression: string;
  type: ExpressionType;
  difficulty: Difficulty | null;
  englishMeaning: string;
  turkishMeaning: string;
  exampleEnglish: string | null;
  exampleTurkish: string | null;
  usageNote: string | null;
  literalWarning: string | null;
};

/**
 * Where a card's expression occurs in a paragraph: UTF-16 offsets into the
 * paragraph's English text, whose words there may differ from the card's,
 * as "sold out" does from "sell out".
 */
export type ExpressionMark = { slug: string; start: number; end: number };
