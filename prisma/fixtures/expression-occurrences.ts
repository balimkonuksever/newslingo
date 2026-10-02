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
  "farmers-turn-to-ai-weather-forecasts": [
    {
      expression: "a-growing-number-of",
      paragraph: 1,
      text: "a growing number of",
    },
    {
      expression: "make-a-difference",
      paragraph: 4,
      text: "make a real difference",
    },
    { expression: "far-from-perfect", paragraph: 5, text: "far from perfect" },
    {
      expression: "confidently-wrong",
      paragraph: 5,
      text: "confidently wrong",
    },
    { expression: "for-now", paragraph: 7, text: "For now" },
  ],
  "more-people-repair-their-phones": [
    { expression: "for-free", paragraph: 1, text: "for free" },
    { expression: "good-enough", paragraph: 2, text: "good enough" },
    { expression: "spare-parts", paragraph: 2, text: "Spare parts" },
    { expression: "end-up", paragraph: 3, text: "end up" },
    { expression: "run-down", paragraph: 6, text: "run down" },
    {
      expression: "from-time-to-time",
      paragraph: 6,
      text: "from time to time",
    },
  ],
  "old-cinema-reopens-with-films-chosen-by-neighbours": [
    { expression: "open-its-doors", paragraph: 1, text: "opened its doors" },
    { expression: "thanks-to", paragraph: 1, text: "thanks to" },
    { expression: "sell-out", paragraph: 4, text: "sold out" },
  ],
};
