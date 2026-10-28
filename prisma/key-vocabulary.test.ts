import { describe, expect, it } from "vitest";

import { hashContext } from "../src/lib/text/context-hash";
import { editorialVocabularyRows } from "./editorial-dictionary";
import { resolveExpressionOccurrences } from "./expression-library";
import { DEMO_ARTICLES } from "./fixtures/articles";
import { EDITORIAL_DICTIONARY } from "./editorial/dictionary";
import { DEMO_SENSE_CHOICES } from "./fixtures/sense-choices";
import { DEMO_EXPRESSION_OCCURRENCES } from "./fixtures/expression-occurrences";
import { DEMO_KEY_VOCABULARY } from "./fixtures/key-vocabulary";
import {
  type KeyVocabulary,
  KeyVocabularyError,
  MAX_KEY_WORDS,
  resolveKeyVocabulary,
} from "./key-vocabulary";
import { REFERENCE_EXPRESSIONS } from "./reference/expressions";

const articles = [
  {
    slug: "river",
    paragraphs: [
      { english: "The deal was ratified. Farmers welcomed it." },
      { english: "Farmers want water, and farmers want rain." },
    ],
  },
];

function problemsOf(chosen: KeyVocabulary) {
  try {
    resolveKeyVocabulary(articles, chosen);
  } catch (error) {
    if (error instanceof KeyVocabularyError) {
      return error.problems;
    }
    throw error;
  }
  return [];
}

describe("resolveKeyVocabulary", () => {
  it("keys each word like a lookup of it, in reading order", () => {
    const words = resolveKeyVocabulary(articles, {
      river: [
        { paragraph: 2, word: "water" },
        { paragraph: 1, word: "Ratified" },
      ],
    });

    expect(words).toEqual([
      {
        articleSlug: "river",
        paragraphOrder: 1,
        start: 13,
        end: 21,
        surfaceWord: "ratified",
        normalizedWord: "ratified",
        contextHash: hashContext("The deal was ⟦ratified⟧."),
        sourceSentence: "The deal was ratified.",
        displayOrder: 1,
      },
      expect.objectContaining({
        paragraphOrder: 2,
        surfaceWord: "water",
        sourceSentence: "Farmers want water, and farmers want rain.",
        displayOrder: 2,
      }),
    ]);
  });

  it("reports every problem at once", () => {
    expect(
      problemsOf({
        river: [
          { paragraph: 1, word: "deal" },
          { paragraph: 1, word: "Deal" },
          { paragraph: 1, word: "river" },
          { paragraph: 2, word: "farmers" },
          { paragraph: 3, word: "rain" },
        ],
        elsewhere: [{ paragraph: 1, word: "deal" }],
      }),
    ).toEqual([
      'river ¶1 "Deal": chosen twice for this article',
      'river ¶1 "river": the paragraph does not contain this word',
      'river ¶2 "farmers": the paragraph contains this word 2 times',
      'river ¶3 "rain": there is no such paragraph',
      "key vocabulary for a missing article: elsewhere",
    ]);
  });

  it(`refuses more than ${MAX_KEY_WORDS} words for one article`, () => {
    const many = Array.from({ length: MAX_KEY_WORDS + 1 }, () => ({
      paragraph: 1,
      word: "deal",
    }));

    expect(problemsOf({ river: many })[0]).toBe(
      `river: ${MAX_KEY_WORDS + 1} key words, more than ${MAX_KEY_WORDS}`,
    );
  });
});

describe("the demo key vocabulary", () => {
  const words = resolveKeyVocabulary(DEMO_ARTICLES, DEMO_KEY_VOCABULARY);

  it("gives every demo article 6 to 8 words", () => {
    for (const { slug } of DEMO_ARTICLES) {
      const count = words.filter((word) => word.articleSlug === slug).length;

      expect(count, slug).toBeGreaterThanOrEqual(6);
      expect(count, slug).toBeLessThanOrEqual(MAX_KEY_WORDS);
    }
  });

  it("points every word at an editorial dictionary entry", () => {
    const keys = new Set(
      editorialVocabularyRows(
        DEMO_ARTICLES,
        EDITORIAL_DICTIONARY,
        DEMO_SENSE_CHOICES,
        // Written articles use the rest of the dictionary.
        { requireEveryEntryUsed: false },
      ).map(
        ({ normalizedWord, contextHash }) => `${normalizedWord} ${contextHash}`,
      ),
    );

    for (const word of words) {
      expect(
        keys.has(`${word.normalizedWord} ${word.contextHash}`),
        word.surfaceWord,
      ).toBe(true);
    }
  });

  it("chooses no word inside a marked expression", () => {
    const marks = resolveExpressionOccurrences(
      DEMO_ARTICLES,
      REFERENCE_EXPRESSIONS,
      DEMO_EXPRESSION_OCCURRENCES,
    );

    for (const word of words) {
      const overlapping = marks.filter(
        (mark) =>
          mark.articleSlug === word.articleSlug &&
          mark.paragraphOrder === word.paragraphOrder &&
          word.start < mark.end &&
          mark.start < word.end,
      );

      expect(overlapping, word.surfaceWord).toEqual([]);
    }
  });
});
