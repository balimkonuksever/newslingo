/*
 * The editorial dictionary: production content, shared by the demo articles
 * and the written articles in prisma/editorial/articles (milestone W).
 * Claude (Opus 5.5) wrote the first entries in a Claude Code session on
 * 2026-09-26, meaning by meaning for the sentences of the demo articles, and
 * adds entries for the new words of each written article. The user, a
 * native Turkish speaker, reviews samples of the Turkish. Entries are not
 * evaluation data.
 *
 * Each entry is one meaning of a word. A spelling with several meanings,
 * such as "screen" on a phone and in a cinema, has one entry per meaning,
 * and each article records the meaning of every occurrence: the demo
 * articles in prisma/fixtures/sense-choices.ts, a written article in its own
 * file. Function words such as "on" or "as" have one entry that explains the
 * uses found in the articles. The demo seed and the article import turn
 * every word of their articles into a cache entry that lookups read first.
 */
import type { EditorialSense } from "../../editorial-dictionary";
import { WORDS_A_C } from "./words-a-c";
import { WORDS_D_G } from "./words-d-g";
import { WORDS_H_O } from "./words-h-o";
import { WORDS_P_S } from "./words-p-s";
import { WORDS_T_Z } from "./words-t-z";

export const EDITORIAL_DICTIONARY: readonly EditorialSense[] = [
  ...WORDS_A_C,
  ...WORDS_D_G,
  ...WORDS_H_O,
  ...WORDS_P_S,
  ...WORDS_T_Z,
];
