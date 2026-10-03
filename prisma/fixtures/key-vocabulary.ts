/*
 * Key vocabulary for the demo articles, for development and tests only:
 * 6 to 8 words per article that are worth learning at its level, in the
 * order a reader meets them. Claude (Opus 5.5) chose them on 2026-10-03, and
 * the user looks over the choices. Each word points at its existing
 * editorial dictionary entry for that sentence (prisma/fixtures/dictionary),
 * so the list adds no new Turkish. Words inside a marked Real English
 * expression are avoided, because the reader cannot open them on their own.
 */
import type { KeyVocabulary } from "../key-vocabulary";

export const DEMO_KEY_VOCABULARY: KeyVocabulary = {
  "three-neighbouring-countries-sign-river-agreement": [
    { paragraph: 1, word: "acrimonious" },
    { paragraph: 1, word: "ratified" },
    { paragraph: 1, word: "droughts" },
    { paragraph: 2, word: "irrigates" },
    { paragraph: 3, word: "allocation" },
    { paragraph: 4, word: "transparency" },
    { paragraph: 5, word: "binding" },
    { paragraph: 5, word: "enforceable" },
  ],
  "farmers-turn-to-ai-weather-forecasts": [
    { paragraph: 1, word: "harvest" },
    { paragraph: 1, word: "predicting" },
    { paragraph: 2, word: "satellite" },
    { paragraph: 2, word: "humidity" },
    { paragraph: 4, word: "precision" },
    { paragraph: 4, word: "exposed" },
    { paragraph: 6, word: "resources" },
  ],
  "more-people-repair-their-phones": [
    { paragraph: 1, word: "cracked" },
    { paragraph: 1, word: "devices" },
    { paragraph: 1, word: "volunteers" },
    { paragraph: 4, word: "glued" },
    { paragraph: 4, word: "manufacturers" },
    { paragraph: 5, word: "atmosphere" },
    { paragraph: 6, word: "habits" },
  ],
  "bakery-delivers-bread-by-bicycle": [
    { paragraph: 1, word: "riders" },
    { paragraph: 1, word: "fresh" },
    { paragraph: 2, word: "neighbourhood" },
    { paragraph: 2, word: "delivery" },
    { paragraph: 4, word: "hired" },
    { paragraph: 5, word: "loaf" },
  ],
  "old-cinema-reopens-with-films-chosen-by-neighbours": [
    { paragraph: 1, word: "residents" },
    { paragraph: 1, word: "velvet" },
    { paragraph: 2, word: "audience" },
    { paragraph: 2, word: "donations" },
    { paragraph: 3, word: "subtitles" },
    { paragraph: 4, word: "retired" },
    { paragraph: 5, word: "screenings" },
  ],
  "skincare-routines-are-getting-shorter": [
    { paragraph: 1, word: "elaborate" },
    { paragraph: 1, word: "essentials" },
    { paragraph: 2, word: "irritation" },
    { paragraph: 2, word: "sensitive" },
    { paragraph: 3, word: "moisturiser" },
    { paragraph: 3, word: "ultraviolet" },
    { paragraph: 4, word: "targeted" },
  ],
};
