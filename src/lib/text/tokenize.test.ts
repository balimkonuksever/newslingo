import { describe, expect, it } from "vitest";

import { DEMO_ARTICLES } from "../../../prisma/fixtures/articles";
import { normalizeWord, tokenize } from "./tokenize";

const words = (text: string) =>
  tokenize(text)
    .filter(({ kind }) => kind === "word")
    .map(({ text: word }) => word);

describe("tokenize", () => {
  it("reproduces every demo paragraph exactly", () => {
    for (const { paragraphs } of DEMO_ARTICLES) {
      for (const { english } of paragraphs) {
        const tokens = tokenize(english);

        expect(tokens.map(({ text }) => text).join("")).toBe(english);
        for (const { text, start, end } of tokens) {
          expect(english.slice(start, end)).toBe(text);
        }
      }
    }
  });

  it("keeps contractions, possessives and hyphenated words whole", () => {
    expect(
      words("It doesn’t matter: the farmer's long-term plan isn't COVID-19."),
    ).toEqual([
      "It",
      "doesn’t",
      "matter",
      "the",
      "farmer's",
      "long-term",
      "plan",
      "isn't",
      "COVID-19",
    ]);
  });

  it("preserves capitalization, quotation marks, dashes and spacing", () => {
    const text = "  “Skin minimalism” — a trend,\tnot a rule.  ";
    const tokens = tokenize(text);

    expect(words(text)).toEqual([
      "Skin",
      "minimalism",
      "a",
      "trend",
      "not",
      "a",
      "rule",
    ]);
    expect(tokens[0]).toEqual({ kind: "other", text: "  “", start: 0, end: 3 });
    expect(tokens.at(-1)).toMatchObject({ kind: "other", text: ".  " });
  });

  it("treats numbers as plain text but keeps words that contain digits", () => {
    expect(words("In 2026, prices rose 3.5% since the 1950s.")).toEqual([
      "In",
      "prices",
      "rose",
      "since",
      "the",
      "1950s",
    ]);
  });

  it("handles accented and non-Latin letters", () => {
    expect(words("A café in İstanbul served crème brûlée.")).toEqual([
      "A",
      "café",
      "in",
      "İstanbul",
      "served",
      "crème",
      "brûlée",
    ]);
  });

  it("does not join words across a dash with spaces or a trailing apostrophe", () => {
    expect(words("well - known farmers' market")).toEqual([
      "well",
      "known",
      "farmers",
      "market",
    ]);
  });

  it("returns a single plain-text token for text without words", () => {
    expect(tokenize(" — 42 … ")).toEqual([
      { kind: "other", text: " — 42 … ", start: 0, end: 8 },
    ]);
    expect(tokenize("")).toEqual([]);
  });
});

describe("normalizeWord", () => {
  it("lowercases and unifies apostrophes and hyphens", () => {
    expect(normalizeWord("Doesn’t")).toBe("doesn't");
    expect(normalizeWord("Long‑Term")).toBe("long-term");
  });

  it("lowercases I the English way, not the Turkish way", () => {
    expect(normalizeWord("IT")).toBe("it");
  });
});
