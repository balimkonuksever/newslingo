import { describe, expect, it } from "vitest";

import {
  countWords,
  estimateReadingMinutes,
  LEARNER_WORDS_PER_MINUTE,
} from "./reading-time";

describe("countWords", () => {
  it("counts words separated by any whitespace", () => {
    expect(countWords("  One two\tthree\nfour  ")).toBe(4);
  });

  it("treats contractions, hyphenated words and numbers as single words", () => {
    expect(countWords("It's a long-term plan for 2026.")).toBe(6);
  });

  it("ignores standalone punctuation", () => {
    expect(countWords("Prices rose — again … by 3.5% !")).toBe(5);
  });

  it("returns zero for empty or whitespace-only text", () => {
    expect(countWords("")).toBe(0);
    expect(countWords(" \n\t ")).toBe(0);
  });
});

describe("estimateReadingMinutes", () => {
  it("rounds partial minutes up", () => {
    expect(estimateReadingMinutes(LEARNER_WORDS_PER_MINUTE)).toBe(1);
    expect(estimateReadingMinutes(LEARNER_WORDS_PER_MINUTE + 1)).toBe(2);
  });

  it("never returns less than one minute", () => {
    expect(estimateReadingMinutes(0)).toBe(1);
    expect(estimateReadingMinutes(1)).toBe(1);
  });

  it("rejects counts that are not non-negative integers", () => {
    expect(() => estimateReadingMinutes(-1)).toThrow(RangeError);
    expect(() => estimateReadingMinutes(2.5)).toThrow(RangeError);
    expect(() => estimateReadingMinutes(Number.NaN)).toThrow(RangeError);
  });
});
