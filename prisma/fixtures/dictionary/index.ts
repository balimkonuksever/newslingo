/*
 * Editorial dictionary entries for the demo articles, for development and
 * tests only. Claude (Opus 5.5) wrote them in a Claude Code session on
 * 2026-09-26, meaning by meaning for the sentences they appear in, and the
 * user, a native Turkish speaker, reviews samples of the Turkish. Like the
 * articles themselves, they are not evaluation data.
 *
 * Each entry is one meaning of a word. A spelling with several meanings in
 * these articles, such as "screen" on a phone and in a cinema, has one entry
 * per meaning, and choices.ts records the meaning of each occurrence.
 * Function words such as "on" or "as" have one entry that explains the uses
 * found in the articles. The seed turns every word of every article into a
 * cache entry that lookups read first.
 */
import type { EditorialSense } from "../../editorial-dictionary";
import { WORDS_A_C } from "./words-a-c";
import { WORDS_D_G } from "./words-d-g";
import { WORDS_H_O } from "./words-h-o";
import { WORDS_P_S } from "./words-p-s";
import { WORDS_T_Z } from "./words-t-z";

export const DEMO_DICTIONARY: readonly EditorialSense[] = [
  ...WORDS_A_C,
  ...WORDS_D_G,
  ...WORDS_H_O,
  ...WORDS_P_S,
  ...WORDS_T_Z,
];

export { DEMO_SENSE_CHOICES } from "./choices";
