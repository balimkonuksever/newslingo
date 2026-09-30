import { normalizeWord, tokenize } from "@/lib/text/tokenize";

/** Where a phrase occurs in a text, as UTF-16 offsets plus the exact surface text. */
export type PhraseOccurrence = { start: number; end: number; text: string };

const WHITESPACE_ONLY = /^\s+$/u;

function normalizedWords(phrase: string) {
  return tokenize(phrase)
    .filter(({ kind }) => kind === "word")
    .map(({ text: word }) => normalizeWord(word));
}

/**
 * The form an expression is stored and compared by: its normalized words
 * joined by single spaces, so "Sell  Out!" becomes "sell out".
 */
export function normalizeExpression(expression: string) {
  return normalizedWords(expression).join(" ");
}

/**
 * Finds every occurrence of `phrase` in `text`, ignoring case and apostrophe
 * style. The phrase's words must be separated only by whitespace in the text,
 * so "on the same page" matches across a line break but not across a comma.
 */
export function findPhraseOccurrences(
  text: string,
  phrase: string,
): PhraseOccurrence[] {
  const target = normalizedWords(phrase);

  if (target.length === 0) {
    return [];
  }

  const words = tokenize(text).filter(({ kind }) => kind === "word");
  const occurrences: PhraseOccurrence[] = [];

  for (let first = 0; first + target.length <= words.length; first += 1) {
    const candidate = words.slice(first, first + target.length);

    const wordsMatch = candidate.every(
      (word, index) => normalizeWord(word.text) === target[index],
    );
    const gapsAreWhitespace = candidate
      .slice(1)
      .every((word, index) =>
        WHITESPACE_ONLY.test(text.slice(candidate[index].end, word.start)),
      );

    if (wordsMatch && gapsAreWhitespace) {
      const start = candidate[0].start;
      const end = candidate[candidate.length - 1].end;

      occurrences.push({ start, end, text: text.slice(start, end) });
    }
  }

  return occurrences;
}

/**
 * Chooses non-overlapping occurrences, preferring the longest when candidates
 * overlap and the earliest when lengths tie. The result is in text order.
 */
export function selectOccurrences<T extends { start: number; end: number }>(
  candidates: readonly T[],
): T[] {
  const byPreference = [...candidates].sort(
    (a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start,
  );
  const selected: T[] = [];

  for (const candidate of byPreference) {
    const overlaps = selected.some(
      (chosen) => candidate.start < chosen.end && chosen.start < candidate.end,
    );

    if (!overlaps) {
      selected.push(candidate);
    }
  }

  return selected.sort((a, b) => a.start - b.start);
}
