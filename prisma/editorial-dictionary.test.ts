import { describe, expect, it } from "vitest";

import { hashContext } from "../src/lib/text/context-hash";
import {
  EditorialDictionaryError,
  editorialVocabularyRows,
  type EditorialSense,
  resolveEditorialSenses,
  type SenseChoices,
} from "./editorial-dictionary";
import { DEMO_ARTICLES } from "./fixtures/articles";
import { WRITTEN_ARTICLES } from "./editorial/articles";
import { EDITORIAL_DICTIONARY } from "./editorial/dictionary";
import { DEMO_SENSE_CHOICES } from "./fixtures/sense-choices";

const sense = (
  lemma: string,
  extra: Partial<EditorialSense> = {},
): EditorialSense => ({
  lemma,
  pos: "noun",
  ipa: "/test/",
  tr: `${lemma} (tr)`,
  en: `The meaning of ${lemma}.`,
  example: `An example with ${lemma}.`,
  ...extra,
});

const articles = [
  {
    slug: "screens",
    paragraphs: [
      { english: "The screen broke. The cinema screen is big." },
      { english: "The screen broke." },
    ],
  },
];

const senses = [
  sense("the", { pos: "determiner" }),
  sense("screen", { id: "screen-device" }),
  sense("screen", { id: "screen-cinema" }),
  sense("break", { pos: "verb", forms: ["broke"] }),
  sense("cinema"),
  sense("be", { pos: "verb", forms: ["is"] }),
  sense("big", { pos: "adjective" }),
];

const choices: SenseChoices = {
  screens: {
    1: { screen: ["screen-device", "screen-cinema"] },
    2: { screen: ["screen-device"] },
  },
};

function problemsOf(
  data: readonly EditorialSense[],
  chosen: SenseChoices = choices,
  texts = articles,
) {
  try {
    resolveEditorialSenses(texts, data, chosen);
  } catch (error) {
    if (error instanceof EditorialDictionaryError) {
      return error.problems;
    }
    throw error;
  }
  return [];
}

describe("resolveEditorialSenses", () => {
  it("gives every word its sense, choosing where a spelling has several", () => {
    const occurrences = resolveEditorialSenses(articles, senses, choices);

    expect(
      occurrences
        .filter(({ paragraphOrder }) => paragraphOrder === 1)
        .map(({ sense: { id, lemma } }) => id ?? lemma),
    ).toEqual([
      "the",
      "screen-device",
      "break",
      "the",
      "cinema",
      "screen-cinema",
      "be",
      "big",
    ]);
    expect(occurrences).toHaveLength(11);
    expect(occurrences[1]).toMatchObject({ start: 4, end: 10 });
  });

  it("reports every gap at once", () => {
    expect(
      problemsOf(
        [
          ...senses.filter(({ lemma }) => lemma !== "big"),
          sense("unused"),
          sense("Mixed", { forms: ["Mixed"] }),
        ],
        { screens: { 1: { screen: ["screen-device", "screen-tv"] }, 3: {} } },
      ),
    ).toEqual([
      '"Mixed": "Mixed" is not a normalized spelling',
      'screens ¶1 "screen": choose one of screen-device, screen-cinema (got "screen-tv")',
      'screens ¶1 "big": no entry',
      'screens ¶2 "screen": choose one of screen-device, screen-cinema',
      "choices for a missing paragraph: screens ¶3",
      '"screen-cinema" is never used',
      '"unused" is never used',
      '"Mixed" is never used',
    ]);
  });

  it("reports leftover choices", () => {
    expect(
      problemsOf(senses, {
        screens: {
          1: { screen: ["screen-device", "screen-cinema", "screen-device"] },
          2: { screen: ["screen-device"] },
        },
      }),
    ).toEqual([
      'screens ¶1: 3 choice(s) for "screen", which has 2 occurrence(s) needing one',
    ]);
  });

  it("checks the entries themselves", () => {
    expect(
      problemsOf([
        ...senses.filter(({ lemma }) => lemma !== "cinema"),
        sense("cinema", { ipa: "ˈsɪnəmə", tr: " ", id: "big" }),
        sense("the", { pos: "determiner" }),
      ]),
    ).toEqual([
      '"big": turkishMeaning Too small: expected string to have >=1 characters',
      '"big": the IPA must be between slashes',
      '"the" has 2 senses, so each of them needs an id',
      'screens ¶1 "The": choose one of (missing id), (missing id)',
      'screens ¶1 "The": choose one of (missing id), (missing id)',
      'screens ¶2 "The": choose one of (missing id), (missing id)',
      '"the" is never used',
      '"the" is never used',
    ]);
  });
});

describe("editorialVocabularyRows", () => {
  it("keys each word exactly as a live lookup of it would be keyed", () => {
    const rows = editorialVocabularyRows(articles, senses, choices);
    const cinemaScreen = rows.find(
      ({ contextSentence }) =>
        contextSentence === "The cinema ⟦screen⟧ is big.",
    );

    expect(cinemaScreen).toEqual({
      surfaceWord: "screen",
      normalizedWord: "screen",
      lemma: "screen",
      partOfSpeech: "noun",
      englishDefinition: "The meaning of screen.",
      turkishMeaning: "screen (tr)",
      exampleSentence: "An example with screen.",
      ipa: "/test/",
      contextSentence: "The cinema ⟦screen⟧ is big.",
      contextHash: hashContext("The cinema ⟦screen⟧ is big."),
      provider: "editorial",
      providerVersion: "1",
      schemaVersion: 1,
    });
  });

  it("stores a word in an identical sentence once", () => {
    // Paragraph 2 repeats the first sentence of paragraph 1.
    expect(editorialVocabularyRows(articles, senses, choices)).toHaveLength(8);
  });

  it("refuses two senses for the same word in the same sentence", () => {
    expect(() =>
      editorialVocabularyRows(articles, senses, {
        screens: {
          1: { screen: ["screen-device", "screen-cinema"] },
          2: { screen: ["screen-cinema"] },
        },
      }),
    ).toThrow('"screen" has two senses in the same sentence');
  });
});

describe("the editorial dictionary", () => {
  it("has a checked sense for every word of the demo and written articles, and no unused entry", () => {
    const rows = editorialVocabularyRows(
      [...DEMO_ARTICLES, ...WRITTEN_ARTICLES],
      EDITORIAL_DICTIONARY,
      {
        ...DEMO_SENSE_CHOICES,
        ...Object.fromEntries(
          WRITTEN_ARTICLES.map(({ slug, senseChoices }) => [
            slug,
            senseChoices ?? {},
          ]),
        ),
      },
    );

    expect(rows.length).toBeGreaterThan(0);
  });
});
