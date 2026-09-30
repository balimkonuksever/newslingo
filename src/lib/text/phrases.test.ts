import { describe, expect, it } from "vitest";

import { findPhraseOccurrences, selectOccurrences } from "./phrases";

describe("findPhraseOccurrences", () => {
  it("finds a phrase regardless of case and apostrophe style", () => {
    const text = "It didn’t Live Up To the hype. Nothing lives up to it.";

    expect(findPhraseOccurrences(text, "live up to")).toEqual([
      { start: 10, end: 20, text: "Live Up To" },
    ]);
    expect(findPhraseOccurrences(text, "didn't live")).toEqual([
      { start: 3, end: 14, text: "didn’t Live" },
    ]);
  });

  it("finds every occurrence of a repeated phrase", () => {
    expect(
      findPhraseOccurrences("Roll out, then roll out again.", "roll out").map(
        ({ start }) => start,
      ),
    ).toEqual([0, 15]);
  });

  it("matches across any whitespace but not across punctuation", () => {
    expect(
      findPhraseOccurrences("on the\nsame  page", "on the same page"),
    ).toHaveLength(1);
    expect(
      findPhraseOccurrences("on the same, page", "on the same page"),
    ).toEqual([]);
  });

  it("matches whole words only", () => {
    expect(findPhraseOccurrences("They rolled outward.", "rolled out")).toEqual(
      [],
    );
    expect(findPhraseOccurrences("a go-to product", "go-to product")).toEqual([
      { start: 2, end: 15, text: "go-to product" },
    ]);
  });

  it("returns nothing for a phrase without words", () => {
    expect(findPhraseOccurrences("Anything.", " — ")).toEqual([]);
  });
});

describe("selectOccurrences", () => {
  it("prefers the longest of overlapping occurrences", () => {
    const shorter = { id: "live up to", start: 16, end: 26 };
    const longer = { id: "live up to the hype", start: 16, end: 35 };
    const separate = { id: "roll out", start: 40, end: 48 };

    expect(selectOccurrences([shorter, separate, longer])).toEqual([
      longer,
      separate,
    ]);
  });

  it("keeps the earliest of equally long overlapping occurrences", () => {
    const first = { id: "a", start: 0, end: 10 };
    const second = { id: "b", start: 5, end: 15 };

    expect(selectOccurrences([second, first])).toEqual([first]);
  });

  it("keeps touching but non-overlapping occurrences", () => {
    const first = { id: "a", start: 0, end: 5 };
    const second = { id: "b", start: 5, end: 9 };

    expect(selectOccurrences([second, first])).toEqual([first, second]);
  });
});
