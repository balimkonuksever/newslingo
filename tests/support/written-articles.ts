import { EDITORIAL_DICTIONARY } from "../../prisma/editorial/dictionary";
import { DEMO_ARTICLES, demoSourceUrl } from "../../prisma/fixtures/articles";
import { DEMO_EXPRESSION_OCCURRENCES } from "../../prisma/fixtures/expression-occurrences";
import { DEMO_KEY_VOCABULARY } from "../../prisma/fixtures/key-vocabulary";
import { DEMO_SENSE_CHOICES } from "../../prisma/fixtures/sense-choices";
import { REFERENCE_EXPRESSIONS } from "../../prisma/reference/expressions";
import type {
  WrittenArticleContext,
  WrittenExplainer,
  WrittenNews,
} from "../../prisma/written-articles";

// Written articles for tests, made from demo articles whose words, key
// vocabulary, marks and Turkish are already checked, under new slugs.

function fromDemo(demoSlug: string, slug: string) {
  const demo = DEMO_ARTICLES.find((article) => article.slug === demoSlug)!;

  return {
    slug,
    title: `${demo.title}, written`,
    shortSummary: demo.shortSummary ?? demo.title,
    categorySlug: demo.categorySlug,
    difficulty: demo.difficulty,
    paragraphs: demo.paragraphs,
    senseChoices: DEMO_SENSE_CHOICES[demoSlug],
    keyVocabulary: DEMO_KEY_VOCABULARY[demoSlug]!,
    expressions: DEMO_EXPRESSION_OCCURRENCES[demoSlug] ?? [],
  };
}

/** A GOV.UK story at A2, 228 English words. */
export function writtenNews(): WrittenNews {
  return {
    ...fromDemo("bakery-delivers-bread-by-bicycle", "written-bakery-story"),
    kind: "NEWS",
    source: {
      name: "Department for Business and Trade",
      url: "https://www.gov.uk/government/news/written-bakery-story",
      publishedAt: new Date("2026-10-20T09:30:00Z"),
      licence: "OGL_3_0",
    },
  };
}

/** An explainer at B1, 268 English words. */
export function writtenExplainer(): WrittenExplainer {
  return {
    ...fromDemo(
      "old-cinema-reopens-with-films-chosen-by-neighbours",
      "written-cinema-explainer",
    ),
    kind: "EXPLAINER",
    writtenAt: new Date("2026-10-27T08:00:00Z"),
    references: [
      {
        title: "How community cinemas work",
        publisher: "Example Encyclopedia",
        url: "https://encyclopedia.example/community-cinemas",
        checkedAt: new Date("2026-10-26"),
      },
    ],
  };
}

/** What the import checks written articles against, as the command does. */
export const WRITTEN_ARTICLE_CONTEXT: WrittenArticleContext = {
  dictionary: EDITORIAL_DICTIONARY,
  expressions: REFERENCE_EXPRESSIONS,
  demoArticles: DEMO_ARTICLES,
  demoSourceUrls: new Set(DEMO_ARTICLES.map(({ slug }) => demoSourceUrl(slug))),
};
