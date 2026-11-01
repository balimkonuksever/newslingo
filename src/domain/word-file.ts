import type { DictionaryEntry } from "@/domain/dictionary";

/**
 * An article's word file: the editorial entry of every English word in it,
 * fetched the first time a reader opens a word, so lookups need no server
 * (IMPLEMENTATION_PLAN.md M9). The local server and the static site serve it
 * at `/words/<slug>.json`.
 */
export type WordFile = {
  /** Each entry once; `words` points into this list. */
  entries: Array<Omit<DictionaryEntry, "word">>;
  /**
   * Every word token, by `wordFileKey`: its entry's index in `entries`, or
   * null when it has none, and the word as it appears in the article.
   */
  words: Record<string, [entry: number | null, word: string]>;
};

/** A word's key in `WordFile.words`: its paragraph and its start offset. */
export function wordFileKey(paragraphOrder: number, start: number) {
  return `${paragraphOrder}:${start}`;
}

/** The word file's address under the site's base path. */
export function wordFilePath(articleSlug: string) {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/words/${articleSlug}.json`;
}
