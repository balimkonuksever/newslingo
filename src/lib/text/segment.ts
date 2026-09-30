import { selectOccurrences } from "@/lib/text/phrases";
import { tokenize } from "@/lib/text/tokenize";

/** A piece of a paragraph as the reader renders it. */
export type Segment =
  | {
      kind: "expression";
      expressionId: string;
      text: string;
      start: number;
      end: number;
    }
  | { kind: "word"; text: string; start: number; end: number }
  | { kind: "text"; text: string; start: number; end: number };

/**
 * Splits a paragraph into expression, word and plain-text segments. Known
 * expressions come first and win overlaps by length, and the words inside an
 * expression never become separate word segments. Concatenating the segments'
 * `text` reproduces the paragraph exactly.
 */
export function segmentParagraph(
  text: string,
  expressions: ReadonlyArray<{
    expressionId: string;
    start: number;
    end: number;
  }>,
): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  const addPlainText = (end: number) => {
    for (const token of tokenize(text.slice(cursor, end))) {
      segments.push({
        kind: token.kind === "word" ? "word" : "text",
        text: token.text,
        start: cursor + token.start,
        end: cursor + token.end,
      });
    }

    cursor = end;
  };

  for (const { expressionId, start, end } of selectOccurrences(expressions)) {
    addPlainText(start);
    segments.push({
      kind: "expression",
      expressionId,
      text: text.slice(start, end),
      start,
      end,
    });
    cursor = end;
  }

  addPlainText(text.length);

  return segments;
}

const sentenceSegmenter = new Intl.Segmenter("en", { granularity: "sentence" });

// ICU breaks after a title such as "Mr." because a capitalized name follows,
// and V8 ignores ICU's abbreviation suppressions, so such pieces are rejoined.
const ENDS_WITH_TITLE =
  /(?:^|[\s(“"])(?:Mr|Mrs|Ms|Mx|Dr|Prof|Rev|Gen|Gov|Sen|Rep|Lt|Col|Capt|Sgt)\.\s*$/;

function sentences(text: string) {
  const result: Array<{ start: number; text: string }> = [];

  for (const { segment, index } of sentenceSegmenter.segment(text)) {
    const previous = result.at(-1);

    if (previous && ENDS_WITH_TITLE.test(previous.text)) {
      previous.text += segment;
    } else {
      result.push({ start: index, text: segment });
    }
  }

  return result;
}

/**
 * The offsets of the whole sentence containing the character at `index`,
 * without its surrounding whitespace, or `null` past the end of the text.
 */
export function sentenceSpanAt(
  text: string,
  index: number,
): { start: number; end: number } | null {
  for (const { start, text: sentence } of sentences(text)) {
    if (index < start + sentence.length) {
      const end = start + sentence.trimEnd().length;
      const leading = sentence.length - sentence.trimStart().length;

      return { start: Math.min(start + leading, end), end };
    }
  }

  return null;
}

/** The whole sentence containing the character at `index`, trimmed. */
export function sentenceAt(text: string, index: number): string {
  const span = sentenceSpanAt(text, index);

  return span ? text.slice(span.start, span.end) : "";
}
