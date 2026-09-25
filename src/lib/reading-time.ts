/**
 * Assumed reading pace for English learners. Adult first-language readers
 * average about 238 words per minute on non-fiction (Brysbaert, 2019), and
 * learners reading at their own level are markedly slower. This is an
 * assumption, not a measurement: revisit it once real reading data exists.
 */
export const LEARNER_WORDS_PER_MINUTE = 150;

/**
 * Counts whitespace-separated tokens that contain a letter or digit, so
 * standalone punctuation such as a dash is not counted as a word.
 */
export function countWords(text: string): number {
  const words = text
    .split(/\s+/u)
    .filter((token) => /[\p{L}\p{N}]/u.test(token));

  return words.length;
}

/** Whole minutes needed to read `wordCount` English words, never below one. */
export function estimateReadingMinutes(wordCount: number): number {
  if (!Number.isInteger(wordCount) || wordCount < 0) {
    throw new RangeError(
      `Word count must be a non-negative integer, received ${wordCount}.`,
    );
  }

  return Math.max(1, Math.ceil(wordCount / LEARNER_WORDS_PER_MINUTE));
}
