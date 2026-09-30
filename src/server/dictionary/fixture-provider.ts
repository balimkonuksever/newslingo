import "server-only";

import type { DictionaryProvider } from "@/server/dictionary/provider";

/**
 * A deterministic stand-in for tests, CI and development without an API key.
 * Its entries say plainly that they are fixtures, and its name keeps them in
 * a separate cache namespace from real lookups.
 */
export const fixtureDictionaryProvider: DictionaryProvider = {
  name: "fixture",
  version: "1",
  async lookup({ word }) {
    const lemma = word.toLocaleLowerCase("en");

    return {
      output: {
        lemma,
        partOfSpeech: "noun",
        englishDefinition: `Fixture definition of “${lemma}”.`,
        turkishMeaning: `“${lemma}” için örnek anlam`,
        exampleSentence: `This is a fixture example for “${lemma}”.`,
        ipa: "/ˈfɪkstʃə/",
      },
      usage: null,
    };
  },
};
