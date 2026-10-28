import { readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  WRITTEN_ARTICLE_CONTEXT,
  writtenExplainer,
  writtenNews,
} from "../tests/support/written-articles";
import { WRITTEN_ARTICLES } from "./editorial/articles";
import { DEMO_ARTICLES, demoSourceUrl } from "./fixtures/articles";
import {
  resolveWrittenArticles,
  type WrittenArticle,
  WrittenArticlesError,
} from "./written-articles";

function problemsOf(articles: readonly WrittenArticle[]) {
  try {
    resolveWrittenArticles(articles, WRITTEN_ARTICLE_CONTEXT);
  } catch (error) {
    if (error instanceof WrittenArticlesError) {
      return error.problems;
    }
    throw error;
  }

  return [];
}

describe("resolveWrittenArticles", () => {
  it("accepts a GOV.UK story and an explainer, and works out what to write", () => {
    const news = writtenNews();
    const explainer = writtenExplainer();

    const { articles, vocabularyRows } = resolveWrittenArticles(
      [news, explainer],
      WRITTEN_ARTICLE_CONTEXT,
    );

    expect(articles.map(({ article }) => article.slug)).toEqual([
      news.slug,
      explainer.slug,
    ]);
    expect(articles[0]).toMatchObject({
      wordCount: 228,
      readingTimeMinutes: 2,
      datedAt: news.source.publishedAt,
    });
    expect(articles[1]).toMatchObject({
      wordCount: 268,
      datedAt: explainer.writtenAt,
    });
    expect(articles[0].keyWords).toHaveLength(news.keyVocabulary.length);
    expect(articles[1].marks).toHaveLength(explainer.expressions.length);
    expect(vocabularyRows.length).toBeGreaterThan(400);
  });

  it.each<[string, () => WrittenArticle[], string]>([
    [
      "a demo article's slug",
      () => [{ ...writtenNews(), slug: DEMO_ARTICLES[0].slug }],
      `${DEMO_ARTICLES[0].slug}: a demo article already has this slug`,
    ],
    [
      "two articles with one slug",
      () => [
        writtenNews(),
        { ...writtenExplainer(), slug: "written-bakery-story" },
      ],
      "written-bakery-story: two articles have this slug",
    ],
    [
      "an invalid slug",
      () => [{ ...writtenNews(), slug: "Bakery Story" }],
      "Bakery Story: the slug is not valid",
    ],
    [
      "a blank title",
      () => [{ ...writtenNews(), title: " " }],
      "written-bakery-story: the title is blank or has spaces at an end",
    ],
    [
      "Turkish with a trailing space",
      () => {
        const news = writtenNews();
        const [first, ...rest] = news.paragraphs;
        return [
          {
            ...news,
            paragraphs: [{ ...first, turkish: `${first.turkish} ` }, ...rest],
          },
        ];
      },
      "written-bakery-story ¶1: the English or Turkish is blank or has spaces at an end",
    ],
    [
      "a length outside its level's range",
      () => [{ ...writtenNews(), difficulty: "C1" }],
      "written-bakery-story: 228 English words, outside 450–650 for C1",
    ],
    [
      "a word without a dictionary entry",
      () => {
        const news = writtenNews();
        const [first, ...rest] = news.paragraphs;
        return [
          {
            ...news,
            paragraphs: [
              {
                ...first,
                english: first.english.replace("bread", "zorbleflux"),
              },
              ...rest,
            ],
          },
        ];
      },
      'written-bakery-story ¶1 "zorbleflux": no entry',
    ],
    [
      "a GOV.UK story without its licence",
      () => {
        const news = writtenNews();
        return [{ ...news, source: { ...news.source, licence: null } }];
      },
      "written-bakery-story: Its source is published under the Open Government Licence v3.0, which the article does not record.",
    ],
    [
      "a demo article's source",
      () => {
        const news = writtenNews();
        const url = demoSourceUrl(DEMO_ARTICLES[0].slug);
        return [{ ...news, source: { ...news.source, url } }];
      },
      `written-bakery-story: another article is adapted from ${demoSourceUrl(DEMO_ARTICLES[0].slug)}`,
    ],
    [
      "an explainer without references",
      () => [{ ...writtenExplainer(), references: [] }],
      "written-cinema-explainer: It is an explainer with no references.",
    ],
    [
      "a reference checked at a time of day",
      () => {
        const explainer = writtenExplainer();
        return [
          {
            ...explainer,
            references: [
              {
                ...explainer.references[0],
                checkedAt: new Date("2026-10-26T12:00:00Z"),
              },
            ],
          },
        ];
      },
      'written-cinema-explainer: reference 1 must be checked on a whole day, such as new Date("2026-10-27")',
    ],
    [
      "too few key words",
      () => {
        const explainer = writtenExplainer();
        return [
          { ...explainer, keyVocabulary: explainer.keyVocabulary.slice(0, 5) },
        ];
      },
      "written-cinema-explainer: 5 key words, fewer than 6",
    ],
    [
      "a key word inside a marked expression",
      () => {
        const explainer = writtenExplainer();
        return [
          {
            ...explainer,
            keyVocabulary: [
              { paragraph: 1, word: "doors" },
              ...explainer.keyVocabulary.slice(1),
            ],
          },
        ];
      },
      'written-cinema-explainer ¶1 "doors": a key word inside the marked expression "opened its doors", which the reader cannot open on its own',
    ],
    [
      "a mark naming a card that does not exist",
      () => {
        const explainer = writtenExplainer();
        return [
          {
            ...explainer,
            expressions: [
              { expression: "no-such-card", paragraph: 4, text: "sold out" },
            ],
          },
        ];
      },
      'written-cinema-explainer ¶4 "sold out": there is no card "no-such-card"',
    ],
  ])("refuses %s", (_name, articles, problem) => {
    expect(problemsOf(articles())).toContain(problem);
  });

  it("refuses two stories adapted from one source", () => {
    const first = writtenNews();
    const second = { ...writtenNews(), slug: "written-bakery-story-again" };

    expect(problemsOf([first, second])).toContain(
      `written-bakery-story-again: another article is adapted from ${first.source.url}`,
    );
  });
});

describe("the written articles", () => {
  it("lists every file in prisma/editorial/articles, named after its slug", () => {
    // Tests run from the project root.
    const folder = join(process.cwd(), "prisma/editorial/articles");
    const files = readdirSync(folder)
      .filter((name) => name.endsWith(".ts") && name !== "index.ts")
      .map((name) => name.replace(/\.ts$/, ""))
      .sort();

    expect(WRITTEN_ARTICLES.map(({ slug }) => slug).sort()).toEqual(files);
  });

  it("are all ready to import", () => {
    expect(problemsOf(WRITTEN_ARTICLES)).toEqual([]);
  });
});
