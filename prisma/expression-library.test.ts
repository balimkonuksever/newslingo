import { describe, expect, it } from "vitest";

import {
  ExpressionLibraryError,
  type ReferenceExpression,
  referenceExpressionData,
  resolveExpressionOccurrences,
} from "./expression-library";
import { DEMO_ARTICLES } from "./fixtures/articles";
import { DEMO_EXPRESSION_OCCURRENCES } from "./fixtures/expression-occurrences";
import { REFERENCE_CATEGORIES } from "./reference/categories";
import { REFERENCE_EXPRESSIONS } from "./reference/expressions";

const card = (
  expression: string,
  extra: Partial<ReferenceExpression> = {},
): ReferenceExpression => ({
  slug: expression.replaceAll(" ", "-"),
  expression,
  type: "PHRASAL_VERB",
  level: "B1",
  en: `The meaning of ${expression}.`,
  tr: `${expression} (tr)`,
  example: { en: `An example of ${expression}.`, tr: `${expression} örneği.` },
  categories: ["entertainment"],
  reviewed: "2026-09-30",
  ...extra,
});

function problemsOf(action: () => unknown) {
  try {
    action();
  } catch (error) {
    if (error instanceof ExpressionLibraryError) {
      return error.problems;
    }
    throw error;
  }
  return [];
}

describe("referenceExpressionData", () => {
  it("normalizes each card and numbers each category page in card order", () => {
    const rows = referenceExpressionData([
      card("sell out"),
      card("thanks to", { categories: [] }),
      card("Live Up to the Hype", {
        slug: "live-up-to-the-hype",
        categories: ["beauty", "entertainment"],
        usage: "Mostly negative.",
        warning: "Not “yaşamak”.",
      }),
    ]);

    expect(rows.map(({ slug, categories }) => ({ slug, categories }))).toEqual([
      {
        slug: "sell-out",
        categories: [{ slug: "entertainment", displayOrder: 1 }],
      },
      { slug: "thanks-to", categories: [] },
      {
        slug: "live-up-to-the-hype",
        categories: [
          { slug: "beauty", displayOrder: 1 },
          { slug: "entertainment", displayOrder: 2 },
        ],
      },
    ]);
    expect(rows[2]).toMatchObject({
      expression: "Live Up to the Hype",
      normalizedExpression: "live up to the hype",
      type: "PHRASAL_VERB",
      difficulty: "B1",
      englishMeaning: "The meaning of Live Up to the Hype.",
      turkishMeaning: "Live Up to the Hype (tr)",
      exampleEnglish: "An example of Live Up to the Hype.",
      exampleTurkish: "Live Up to the Hype örneği.",
      usageNote: "Mostly negative.",
      literalWarning: "Not “yaşamak”.",
      pronunciation: null,
    });
    expect(rows[0]).toMatchObject({ usageNote: null, literalWarning: null });
  });

  it("refuses the whole library while any card's Turkish is unreviewed", () => {
    expect(
      problemsOf(() =>
        referenceExpressionData([
          card("sell out"),
          card("roll out", { reviewed: undefined }),
        ]),
      ),
    ).toEqual(['"roll-out": the Turkish has not been reviewed']);
  });

  it("reports every problem at once", () => {
    expect(
      problemsOf(() =>
        referenceExpressionData([
          card("sell out"),
          card("Sell  Out!", { slug: "sell-out-again" }),
          card("roll out", { slug: "sell-out" }),
          card("hype", {
            tr: " ",
            reviewed: "30/09/2026",
            categories: ["film" as never, "beauty", "beauty"],
          }),
          card("steal the show", { slug: "Steal-the-show" }),
        ]),
      ),
    ).toEqual([
      '"sell-out-again": "sell out" already has a card',
      '"sell-out": the slug is used twice',
      '"hype": tr Too small: expected string to have >=1 characters',
      '"hype": reviewed Invalid ISO date',
      '"hype": an expression has at least two words; single words belong in the dictionary',
      '"hype": "film" is not a launch category',
      '"hype": "beauty" is listed twice',
      '"Steal-the-show": slug Invalid string: must match pattern /^[a-z0-9]+(?:-[a-z0-9]+)*$/',
    ]);
  });
});

describe("resolveExpressionOccurrences", () => {
  const english =
    "Thanks to Mr. Brown, the cinema opened its doors. Every show sold out.";
  const articles = [
    {
      slug: "cinema",
      paragraphs: [
        { english },
        { english: "It sold out, then sold out again." },
      ],
    },
  ];
  const cards = [
    card("thanks to", { categories: [] }),
    card("open its doors", { categories: [] }),
    card("sell out"),
  ];

  it("finds each occurrence's exact wording and sentence, in reading order", () => {
    const occurrences = resolveExpressionOccurrences(articles, cards, {
      cinema: [
        { expression: "sell-out", paragraph: 1, text: "sold out" },
        { expression: "thanks-to", paragraph: 1, text: "thanks to" },
        {
          expression: "open-its-doors",
          paragraph: 1,
          text: "opened its doors",
        },
      ],
    });
    const firstSentence = "Thanks to Mr. Brown, the cinema opened its doors.";

    expect(occurrences).toEqual([
      {
        articleSlug: "cinema",
        paragraphOrder: 1,
        expressionSlug: "thanks-to",
        start: 0,
        end: 9,
        surfaceText: "Thanks to",
        sentence: firstSentence,
        displayOrder: 1,
      },
      {
        articleSlug: "cinema",
        paragraphOrder: 1,
        expressionSlug: "open-its-doors",
        start: english.indexOf("opened"),
        end: english.indexOf("opened") + "opened its doors".length,
        surfaceText: "opened its doors",
        sentence: firstSentence,
        displayOrder: 2,
      },
      {
        articleSlug: "cinema",
        paragraphOrder: 1,
        expressionSlug: "sell-out",
        start: english.indexOf("sold"),
        end: english.indexOf("sold") + "sold out".length,
        surfaceText: "sold out",
        sentence: "Every show sold out.",
        displayOrder: 3,
      },
    ]);
  });

  it("reports every problem at once", () => {
    expect(
      problemsOf(() =>
        resolveExpressionOccurrences(articles, cards, {
          cinema: [
            { expression: "thanks-to", paragraph: 1, text: "thanks to" },
            {
              expression: "open-its-doors",
              paragraph: 1,
              text: "open its doors",
            },
            { expression: "sell-out", paragraph: 2, text: "sold out" },
            { expression: "thanks-to", paragraph: 1, text: "Thanks to Mr" },
            { expression: "steal-the-show", paragraph: 1, text: "every show" },
            { expression: "sell-out", paragraph: 3, text: "sold out" },
          ],
          elsewhere: [
            { expression: "sell-out", paragraph: 1, text: "sold out" },
          ],
        }),
      ),
    ).toEqual([
      'cinema ¶1 "open its doors": the paragraph does not contain this wording',
      'cinema ¶2 "sold out": the paragraph contains this wording 2 times',
      'cinema ¶1 "Thanks to Mr": overlaps "Thanks to"',
      'cinema ¶1 "every show": there is no card "steal-the-show"',
      'cinema ¶3 "sold out": there is no such paragraph',
      "occurrences for a missing article: elsewhere",
    ]);
  });
});

describe("the Real English library", () => {
  // Categories whose cards are still being written. Remove each one as its
  // cards land, so that in the end every launch category is checked.
  const CATEGORIES_IN_PROGRESS = new Set([
    "ai",
    "technology",
    "world",
    "business",
    "beauty",
  ]);

  it("has only valid, reviewed cards", () => {
    expect(referenceExpressionData(REFERENCE_EXPRESSIONS)).toHaveLength(
      REFERENCE_EXPRESSIONS.length,
    );
  });

  it("gives every launch category at least ten cards", () => {
    const rows = referenceExpressionData(REFERENCE_EXPRESSIONS);

    for (const { slug } of REFERENCE_CATEGORIES) {
      if (CATEGORIES_IN_PROGRESS.has(slug)) {
        continue;
      }

      const page = rows.filter(({ categories }) =>
        categories.some((category) => category.slug === slug),
      );
      expect(page.length, slug).toBeGreaterThanOrEqual(10);
    }
  });

  it("finds every demo occurrence in its article", () => {
    const listed = Object.values(DEMO_EXPRESSION_OCCURRENCES).flat();

    expect(
      resolveExpressionOccurrences(
        DEMO_ARTICLES,
        REFERENCE_EXPRESSIONS,
        DEMO_EXPRESSION_OCCURRENCES,
      ),
    ).toHaveLength(listed.length);
  });
});
