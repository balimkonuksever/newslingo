/**
 * A span of English text. Concatenating the `text` of every token returned by
 * `tokenize` reproduces the input exactly, spacing and punctuation included.
 */
export type Token = {
  kind: "word" | "other";
  text: string;
  /** UTF-16 offsets into the tokenized text. */
  start: number;
  end: number;
};

// Letters, marks or digits, optionally joined by single apostrophes or hyphens,
// so "don't", "farmer’s", "long-term" and "COVID-19" each stay one token.
const WORD_PATTERN = /[\p{L}\p{M}\p{N}]+(?:['’‑-][\p{L}\p{M}\p{N}]+)*/gu;

const LETTER = /\p{L}/u;

/**
 * Splits text into words and the text between them. Only runs that contain a
 * letter count as words; numbers such as "2026" stay in the surrounding text.
 */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;

  const pushOther = (end: number) => {
    if (end > cursor) {
      tokens.push({
        kind: "other",
        text: text.slice(cursor, end),
        start: cursor,
        end,
      });
      cursor = end;
    }
  };

  for (const match of text.matchAll(WORD_PATTERN)) {
    const start = match.index;
    const end = start + match[0].length;

    if (!LETTER.test(match[0])) {
      continue;
    }

    pushOther(start);
    tokens.push({ kind: "word", text: match[0], start, end });
    cursor = end;
  }

  pushOther(text.length);

  return tokens;
}

/**
 * The form a word is compared and looked up by: Unicode-normalized, lower
 * case, with typographic apostrophes and non-breaking hyphens made plain.
 */
export function normalizeWord(word: string) {
  return word
    .normalize("NFC")
    .replaceAll("’", "'")
    .replaceAll("‑", "-")
    .toLocaleLowerCase("en");
}
