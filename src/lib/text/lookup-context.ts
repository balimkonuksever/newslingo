import { sentenceSpanAt } from "@/lib/text/segment";
import { normalizeWord, tokenize } from "@/lib/text/tokenize";

/** Marks the looked-up word inside its sentence, e.g. "costs will ⟦rise⟧". */
export const TARGET_OPEN = "⟦";
export const TARGET_CLOSE = "⟧";

/** The longest context sent to a provider, in UTF-16 code units. */
export const MAX_CONTEXT_LENGTH = 400;

export type LookupContext = {
  /** The word exactly as it appears in the paragraph. */
  surfaceWord: string;
  normalizedWord: string;
  /**
   * The sentence around the word with whitespace collapsed and the word
   * marked, so a word that appears twice in a sentence is still unambiguous.
   * Very long sentences are cut to a window around the word.
   */
  context: string;
};

const MARKERS = /[⟦⟧]/gu;
const WHITESPACE = /\s+/gu;

const clean = (text: string) =>
  text.replace(MARKERS, "").replace(WHITESPACE, " ");

/**
 * Builds the context for looking up the word at `[start, end)` in a
 * paragraph, or returns `null` unless that range is exactly one word token.
 */
export function buildLookupContext(
  paragraph: string,
  start: number,
  end: number,
): LookupContext | null {
  const isWord = tokenize(paragraph).some(
    (token) =>
      token.kind === "word" && token.start === start && token.end === end,
  );

  if (!isWord) {
    return null;
  }

  const sentence = sentenceSpanAt(paragraph, start) ?? { start, end };
  const window = contextWindow(paragraph, sentence, start, end);
  const surfaceWord = paragraph.slice(start, end);

  const context = [
    window.start > sentence.start ? "…" : "",
    clean(paragraph.slice(window.start, start)).trimStart(),
    TARGET_OPEN,
    surfaceWord,
    TARGET_CLOSE,
    clean(paragraph.slice(end, window.end)).trimEnd(),
    window.end < sentence.end ? "…" : "",
  ]
    .join("")
    .normalize("NFC");

  return { surfaceWord, normalizedWord: normalizeWord(surfaceWord), context };
}

/**
 * The part of the sentence to send: all of it when it fits, otherwise a
 * window around the word that starts and ends at whitespace.
 */
function contextWindow(
  text: string,
  sentence: { start: number; end: number },
  start: number,
  end: number,
) {
  if (sentence.end - sentence.start <= MAX_CONTEXT_LENGTH) {
    return sentence;
  }

  const room = MAX_CONTEXT_LENGTH - (end - start);
  let windowStart = Math.max(sentence.start, start - Math.floor(room / 2));
  const windowEnd = Math.min(sentence.end, windowStart + MAX_CONTEXT_LENGTH);
  windowStart = Math.max(sentence.start, windowEnd - MAX_CONTEXT_LENGTH);

  // Drop the partial words at each cut edge.
  const firstSpace = text.slice(windowStart, start).search(/\s/u);
  const lastSpace = text.slice(end, windowEnd).search(/\s\S*$/u);

  return {
    start:
      windowStart > sentence.start && firstSpace !== -1
        ? windowStart + firstSpace
        : windowStart,
    end:
      windowEnd < sentence.end && lastSpace !== -1
        ? end + lastSpace
        : windowEnd,
  };
}
