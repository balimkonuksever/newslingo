/*
 * Where Real English expressions occur in the demo articles, for development
 * and tests only. Each entry names a card from prisma/reference/expressions
 * and its wording exactly as the paragraph has it, such as "sold out" for
 * "sell out", because the phrase matcher does not inflect words. The seed
 * finds each one and refuses wording that is missing, repeated in its
 * paragraph or overlapping another. Phrasal verbs split by their object, such
 * as "cutting their routines down", are not marked: one clickable unit would
 * swallow the words in between.
 */
import type { ExpressionOccurrences } from "../expression-library";

export const DEMO_EXPRESSION_OCCURRENCES: ExpressionOccurrences = {
  "old-cinema-reopens-with-films-chosen-by-neighbours": [
    { expression: "open-its-doors", paragraph: 1, text: "opened its doors" },
    { expression: "thanks-to", paragraph: 1, text: "thanks to" },
    { expression: "sell-out", paragraph: 4, text: "sold out" },
  ],
};
