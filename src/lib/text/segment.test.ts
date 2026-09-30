import { describe, expect, it } from "vitest";

import { findPhraseOccurrences } from "./phrases";
import {
  type Segment,
  segmentParagraph,
  sentenceAt,
  sentenceSpanAt,
} from "./segment";

const text =
  "The phone did not live up to the hype. Critics say it will roll out slowly.";

function expressionsIn(paragraph: string, phrases: Record<string, string>) {
  return Object.entries(phrases).flatMap(([expressionId, phrase]) =>
    findPhraseOccurrences(paragraph, phrase).map(({ start, end }) => ({
      expressionId,
      start,
      end,
    })),
  );
}

const describeSegments = (segments: Segment[]) =>
  segments
    .filter(({ kind }) => kind !== "text")
    .map((segment) =>
      segment.kind === "expression" ? `[${segment.text}]` : segment.text,
    );

describe("segmentParagraph", () => {
  it("renders a known expression as one unit and the rest as words", () => {
    const segments = segmentParagraph(
      text,
      expressionsIn(text, { hype: "live up to the hype", rollOut: "roll out" }),
    );

    expect(describeSegments(segments)).toEqual([
      "The",
      "phone",
      "did",
      "not",
      "[live up to the hype]",
      "Critics",
      "say",
      "it",
      "will",
      "[roll out]",
      "slowly",
    ]);
  });

  it("lets the longest expression win and never nests word targets", () => {
    const segments = segmentParagraph(
      text,
      expressionsIn(text, {
        liveUpTo: "live up to",
        hype: "live up to the hype",
        theHype: "the hype",
      }),
    );

    const expressions = segments.filter(({ kind }) => kind === "expression");
    expect(expressions).toEqual([
      {
        kind: "expression",
        expressionId: "hype",
        text: "live up to the hype",
        start: 18,
        end: 37,
      },
    ]);
    expect(
      segments.some(
        ({ kind, start, end }) => kind === "word" && start >= 18 && end <= 37,
      ),
    ).toBe(false);
  });

  it("reproduces the paragraph exactly with offsets that match the text", () => {
    const segments = segmentParagraph(
      text,
      expressionsIn(text, { rollOut: "roll out" }),
    );

    expect(segments.map(({ text: part }) => part).join("")).toBe(text);
    for (const segment of segments) {
      expect(text.slice(segment.start, segment.end)).toBe(segment.text);
    }
  });

  it("works without any expressions", () => {
    expect(describeSegments(segmentParagraph("Hello, world.", []))).toEqual([
      "Hello",
      "world",
    ]);
  });
});

describe("sentenceAt", () => {
  it("returns the whole sentence around a position", () => {
    expect(sentenceAt(text, text.indexOf("roll"))).toBe(
      "Critics say it will roll out slowly.",
    );
    expect(sentenceAt(text, 0)).toBe("The phone did not live up to the hype.");
  });

  it("keeps titles and other abbreviations inside their sentence", () => {
    const withAbbreviations =
      "Mr. Smith met Dr. Jones in the U.S. at 9 a.m. today. He left.";

    for (const word of ["Smith", "Jones", "today"]) {
      expect(
        sentenceAt(withAbbreviations, withAbbreviations.indexOf(word)),
      ).toBe("Mr. Smith met Dr. Jones in the U.S. at 9 a.m. today.");
    }
    expect(
      sentenceAt(withAbbreviations, withAbbreviations.indexOf("left")),
    ).toBe("He left.");
  });

  it("returns an empty string past the end of the text", () => {
    expect(sentenceAt("One sentence.", 99)).toBe("");
  });
});

describe("sentenceSpanAt", () => {
  it("returns offsets of the trimmed sentence", () => {
    const span = sentenceSpanAt(text, text.indexOf("slowly"));

    expect(span).toEqual({ start: 39, end: text.length });
    expect(text.slice(span!.start, span!.end)).toBe(
      "Critics say it will roll out slowly.",
    );
  });

  it("excludes leading whitespace", () => {
    const padded = "  Hello there.";

    expect(sentenceSpanAt(padded, 5)).toEqual({ start: 2, end: 14 });
  });

  it("returns null past the end of the text", () => {
    expect(sentenceSpanAt("One sentence.", 99)).toBeNull();
  });
});
