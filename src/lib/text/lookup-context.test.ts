import { describe, expect, it } from "vitest";

import { buildLookupContext, MAX_CONTEXT_LENGTH } from "./lookup-context";

function contextFor(paragraph: string, word: string, occurrence = 0) {
  let start = -1;
  for (let found = 0; found <= occurrence; found += 1) {
    start = paragraph.indexOf(word, start + 1);
  }

  return buildLookupContext(paragraph, start, start + word.length);
}

describe("buildLookupContext", () => {
  const paragraph =
    "The phone did not live up to the hype. Critics say it will roll out slowly.";

  it("marks the word inside its own sentence", () => {
    expect(contextFor(paragraph, "roll")).toEqual({
      surfaceWord: "roll",
      normalizedWord: "roll",
      context: "Critics say it will ⟦roll⟧ out slowly.",
    });
  });

  it("keeps the surface form and normalizes the lookup form", () => {
    expect(contextFor("The Farmer’s market opened.", "Farmer’s")).toEqual({
      surfaceWord: "Farmer’s",
      normalizedWord: "farmer's",
      context: "The ⟦Farmer’s⟧ market opened.",
    });
  });

  it("marks the right occurrence of a repeated word", () => {
    expect(contextFor("I can can a can.", "can", 1)?.context).toBe(
      "I can ⟦can⟧ a can.",
    );
  });

  it("keeps titles such as Mr. inside the sentence", () => {
    expect(
      contextFor("It rained. Mr. Smith said costs will rise.", "rise")?.context,
    ).toBe("Mr. Smith said costs will ⟦rise⟧.");
  });

  it("collapses whitespace and removes stray marker characters", () => {
    expect(
      contextFor("Prices \u00a0 rose ⟦sharply⟧ in\tMarch.", "rose")?.context,
    ).toBe("Prices ⟦rose⟧ sharply in March.");
  });

  it.each([
    ["the middle of a word", 5, 7],
    ["two words", 4, 14],
    ["punctuation", 37, 38],
    ["an empty range", 4, 4],
    ["a range past the end", 200, 204],
  ])("returns null for %s", (_, start, end) => {
    expect(buildLookupContext(paragraph, start, end)).toBeNull();
  });

  it("does not treat numbers as words", () => {
    const text = "Sales rose in 2026.";

    expect(buildLookupContext(text, 14, 18)).toBeNull();
  });

  it("cuts very long sentences to whole words around the target", () => {
    const words = Array.from({ length: 150 }, (_, index) => `word${index}`);
    words[75] = "target";
    const long = `${words.join(" ")}.`;

    const result = contextFor(long, "target");
    const context = result?.context ?? "";

    expect(context.length).toBeLessThanOrEqual(MAX_CONTEXT_LENGTH + 4);
    expect(context).toMatch(/^…word\d+ /u);
    expect(context).toMatch(/ word\d+…$/u);
    expect(context).toContain("word74 ⟦target⟧ word76");

    const shown = context.replaceAll(/[…⟦⟧]/gu, "").split(" ");
    expect(shown.every((word) => words.includes(word))).toBe(true);
  });
});
