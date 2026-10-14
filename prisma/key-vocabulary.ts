import { hashContext } from "../src/lib/text/context-hash";
import { buildLookupContext } from "../src/lib/text/lookup-context";
import { sentenceAt } from "../src/lib/text/segment";
import { normalizeWord, tokenize } from "../src/lib/text/tokenize";

/**
 * Key vocabulary chosen for articles, by article slug: each word by its
 * paragraph number and its spelling there.
 */
export type KeyVocabulary = Readonly<
  Record<string, ReadonlyArray<{ paragraph: number; word: string }>>
>;

/** The most key words one article lists. */
export const MAX_KEY_WORDS = 8;

export class KeyVocabularyError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(
      `The key vocabulary has ${problems.length} problem(s):\n- ${problems
        .slice(0, 100)
        .join("\n- ")}`,
    );
    this.name = "KeyVocabularyError";
  }
}

export type ResolvedKeyWord = {
  articleSlug: string;
  paragraphOrder: number;
  surfaceWord: string;
  /** With `contextHash`, the key of the word's dictionary entry here. */
  normalizedWord: string;
  contextHash: string;
  sourceSentence: string;
  /** The word's place in the article's list, in reading order. */
  displayOrder: number;
};

type Articles = ReadonlyArray<{
  slug: string;
  paragraphs: ReadonlyArray<{ english: string }>;
}>;

/**
 * Finds every chosen word in its paragraph, keyed exactly as a lookup of it
 * would be, and reports every problem at once: unknown articles and
 * paragraphs, words that are missing or repeated in their paragraph, a word
 * chosen twice for one article, and articles with too many words.
 */
export function resolveKeyVocabulary(
  articles: Articles,
  chosen: KeyVocabulary,
): ResolvedKeyWord[] {
  const problems: string[] = [];
  const resolved: ResolvedKeyWord[] = [];

  for (const [articleSlug, words] of Object.entries(chosen)) {
    const article = articles.find(({ slug }) => slug === articleSlug);

    if (!article) {
      problems.push(`key vocabulary for a missing article: ${articleSlug}`);
      continue;
    }
    if (words.length > MAX_KEY_WORDS) {
      problems.push(
        `${articleSlug}: ${words.length} key words, more than ${MAX_KEY_WORDS}`,
      );
    }

    const seen = new Set<string>();
    const found: Array<{
      start: number;
      word: Omit<ResolvedKeyWord, "displayOrder">;
    }> = [];

    for (const { paragraph, word } of words) {
      const where = `${articleSlug} ¶${paragraph} "${word}"`;
      const english = article.paragraphs[paragraph - 1]?.english;
      const target = normalizeWord(word);

      if (seen.has(target)) {
        problems.push(`${where}: chosen twice for this article`);
      }
      seen.add(target);

      if (english === undefined) {
        problems.push(`${where}: there is no such paragraph`);
        continue;
      }

      const matches = tokenize(english).filter(
        (token) =>
          token.kind === "word" && normalizeWord(token.text) === target,
      );

      if (matches.length !== 1) {
        problems.push(
          matches.length === 0
            ? `${where}: the paragraph does not contain this word`
            : `${where}: the paragraph contains this word ${matches.length} times`,
        );
        continue;
      }

      const [{ start, end }] = matches;
      const lookup = buildLookupContext(english, start, end)!;

      found.push({
        start,
        word: {
          articleSlug,
          paragraphOrder: paragraph,
          surfaceWord: lookup.surfaceWord,
          normalizedWord: lookup.normalizedWord,
          contextHash: hashContext(lookup.context),
          sourceSentence: sentenceAt(english, start),
        },
      });
    }

    found
      .sort(
        (a, b) =>
          a.word.paragraphOrder - b.word.paragraphOrder || a.start - b.start,
      )
      .forEach(({ word }, index) =>
        resolved.push({ ...word, displayOrder: index + 1 }),
      );
  }

  if (problems.length > 0) {
    throw new KeyVocabularyError(problems);
  }

  return resolved;
}
