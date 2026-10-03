import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { KeyWord } from "@/domain/dictionary";

import { KeyVocabularyList } from "./key-vocabulary-list";

const ratified: KeyWord = {
  word: "ratified",
  lemma: "ratify",
  partOfSpeech: "verb",
  ipa: "/ˈrætɪfaɪ/",
  englishDefinition: "To make an agreement official.",
  turkishMeaning: "(resmen) onaylamak",
  exampleSentence: "Parliament ratified the treaty.",
  sentence: "The accord must still be ratified.",
};

describe("KeyVocabularyList", () => {
  it("names each word by its dictionary form, with the article's spelling", () => {
    const { container } = render(
      <KeyVocabularyList
        words={[
          ratified,
          {
            ...ratified,
            word: "Velvet",
            lemma: "velvet",
            partOfSpeech: null,
            ipa: null,
            exampleSentence: null,
          },
        ]}
      />,
    );
    const rows = [
      ...container.querySelectorAll<HTMLDetailsElement>("li > details"),
    ];

    expect(rows.map((row) => row.open)).toEqual([false, false]);
    expect(rows[0].querySelector("summary")).toHaveTextContent(
      "ratify" + "verb · /ˈrætɪfaɪ/ · here: “ratified”" + "(resmen) onaylamak",
    );
    expect(rows[1].querySelector("summary")).toHaveTextContent(
      "velvet" + "(resmen) onaylamak",
    );
    expect(rows[1].querySelector("summary")).not.toHaveTextContent("here:");
  });

  it("opens to the definition, the article's sentence and an example", () => {
    const { container } = render(<KeyVocabularyList words={[ratified]} />);
    const row = container.querySelector("details")!;

    expect(row).toHaveTextContent("To make an agreement official.");
    expect(row).toHaveTextContent(
      "In this article" + "The accord must still be ratified.",
    );
    expect(row).toHaveTextContent(
      "Another example" + "Parliament ratified the treaty.",
    );
  });
});
