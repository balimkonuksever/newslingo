import { describe, expect, it } from "vitest";

import type { ArticleStatus, ModerationAction } from "@/generated/prisma/enums";
import { estimateReadingMinutes } from "@/lib/reading-time";

import {
  canModerate,
  type PublicationCandidate,
  publicationProblems,
} from "./moderation";

const STATUSES: ArticleStatus[] = [
  "FETCHED",
  "PROCESSING",
  "DRAFT",
  "PUBLISHED",
  "FAILED",
  "ARCHIVED",
];

describe("canModerate", () => {
  it.each<[ModerationAction, ArticleStatus[]]>([
    ["PUBLISH", ["DRAFT"]],
    ["ARCHIVE", ["DRAFT", "PUBLISHED"]],
    ["RESTORE", ["ARCHIVED"]],
    ["CHANGE_CATEGORY", ["DRAFT", "PUBLISHED", "ARCHIVED"]],
    ["CHANGE_DIFFICULTY", ["DRAFT", "PUBLISHED", "ARCHIVED"]],
  ])("allows %s only from %j", (action, allowed) => {
    for (const status of STATUSES) {
      expect(canModerate(action, status), status).toBe(
        allowed.includes(status),
      );
    }
  });
});

function candidate(
  overrides: Partial<PublicationCandidate> = {},
): PublicationCandidate {
  const english = "The library lends tools. Readers like it.";

  return {
    title: "A Town Library Lends Tools",
    categoryIsActive: true,
    kind: "NEWS",
    sourceName: "Newslingo demo fixture",
    sourceUrl: "https://demo.newslingo.example/articles/library",
    sourceLicence: null,
    references: [],
    wordCount: 7,
    readingTimeMinutes: estimateReadingMinutes(7),
    paragraphs: [
      { order: 1, english, turkish: "Kütüphane alet ödünç veriyor." },
    ],
    expressions: [
      {
        paragraphOrder: 1,
        startOffset: 4,
        endOffset: 11,
        surfaceText: "library",
      },
    ],
    ...overrides,
  };
}

const REFERENCE = {
  title: "Tool libraries",
  publisher: "Example Encyclopedia",
  url: "https://www.example.org/libraries",
};

/** An explainer has no source, and lists references instead. */
const EXPLAINER = {
  kind: "EXPLAINER",
  sourceName: null,
  sourceUrl: null,
  sourceLicence: null,
  references: [REFERENCE],
} satisfies Partial<PublicationCandidate>;

describe("publicationProblems", () => {
  it("finds nothing wrong with a complete article", () => {
    expect(publicationProblems(candidate())).toEqual([]);
  });

  it("finds nothing wrong with a GOV.UK story that records its licence", () => {
    expect(
      publicationProblems(
        candidate({
          sourceUrl: "https://www.gov.uk/government/news/library-tools",
          sourceLicence: "OGL_3_0",
        }),
      ),
    ).toEqual([]);
  });

  it("finds nothing wrong with an explainer that lists its references", () => {
    expect(publicationProblems(candidate(EXPLAINER))).toEqual([]);
  });

  it.each<[string, Partial<PublicationCandidate>, string]>([
    ["a blank title", { title: "  " }, "It has no title."],
    [
      "a switched-off category",
      { categoryIsActive: false },
      "Its category is switched off, so readers could not reach it.",
    ],
    [
      "a source that is not a web address",
      { sourceUrl: "demo.newslingo.example" },
      "Its source attribution is incomplete.",
    ],
    [
      "news without a source",
      { sourceName: null, sourceUrl: null },
      "Its source attribution is incomplete.",
    ],
    [
      "a GOV.UK story without its licence",
      { sourceUrl: "https://www.gov.uk/government/news/library-tools" },
      "Its source is published under the Open Government Licence v3.0, which the article does not record.",
    ],
    [
      "an explainer without references",
      { ...EXPLAINER, references: [] },
      "It is an explainer with no references.",
    ],
    [
      "an explainer reference without a web address",
      {
        ...EXPLAINER,
        references: [{ ...REFERENCE, url: "www.example.org/libraries" }],
      },
      "A reference is missing its title, its publisher or a web address.",
    ],
    [
      "an explainer reference without a publisher",
      { ...EXPLAINER, references: [{ ...REFERENCE, publisher: " " }] },
      "A reference is missing its title, its publisher or a web address.",
    ],
    [
      "a paragraph gap",
      {
        paragraphs: [
          { order: 1, english: "The library lends tools.", turkish: "Bir." },
          { order: 3, english: "Readers like it.", turkish: "İki." },
        ],
      },
      "Its paragraphs are not numbered 1, 2, 3 and so on.",
    ],
    [
      "a stale word count",
      { wordCount: 70 },
      "Its word count or reading time does not match its English.",
    ],
    [
      "a mark that misses its words",
      {
        expressions: [
          {
            paragraphOrder: 1,
            startOffset: 0,
            endOffset: 7,
            surfaceText: "library",
          },
        ],
      },
      "A marked expression no longer matches the words in its paragraph.",
    ],
  ])("reports %s", (_name, overrides, problem) => {
    expect(publicationProblems(candidate(overrides))).toContain(problem);
  });

  it("reports an article without paragraphs", () => {
    expect(
      publicationProblems(
        candidate({
          paragraphs: [],
          expressions: [],
          wordCount: 0,
          readingTimeMinutes: estimateReadingMinutes(0),
        }),
      ),
    ).toEqual(["It has no paragraphs."]);
  });
});
