import { describe, expect, it } from "vitest";

import {
  createArticleSearch,
  parseSearchQuery,
  SEARCH_QUERY_MAX_LENGTH,
  type SearchableArticle,
  searchTerms,
  uniqueSearchTerms,
} from "./search";

describe("searchTerms", () => {
  it("folds case and accents, and splits at anything but letters and digits", () => {
    expect(searchTerms("K-pop’s Café, 2026!")).toEqual([
      "k",
      "pop",
      "s",
      "cafe",
      "2026",
    ]);
  });

  it("folds Turkish letters, dotted and dotless i included", () => {
    expect(searchTerms("Güzellik ŞİŞLİ ılık Çağ öğün")).toEqual([
      "guzellik",
      "sisli",
      "ilik",
      "cag",
      "ogun",
    ]);
  });

  it("finds no terms in punctuation", () => {
    expect(searchTerms(" — … ")).toEqual([]);
  });
});

describe("uniqueSearchTerms", () => {
  it("joins each term once, sorted", () => {
    expect(uniqueSearchTerms(["The cat and the dog.", "A Dog!"])).toBe(
      "a and cat dog the",
    );
  });
});

describe("parseSearchQuery", () => {
  it("reads the first q with its spaces collapsed", () => {
    expect(parseSearchQuery({ q: ["  space   rubbish ", "other"] })).toBe(
      "space rubbish",
    );
  });

  it("is empty without a query", () => {
    expect(parseSearchQuery({})).toBe("");
    expect(parseSearchQuery({ q: "   " })).toBe("");
  });

  it("cuts a long query", () => {
    expect(parseSearchQuery({ q: "a ".repeat(200) })).toHaveLength(
      SEARCH_QUERY_MAX_LENGTH - 1,
    );
  });
});

type TestArticle = SearchableArticle & { slug: string };

function article(
  slug: string,
  fields: Partial<Omit<TestArticle, "slug">> = {},
): TestArticle {
  return {
    slug,
    title: "",
    shortSummary: null,
    category: { name: "World" },
    sourceName: null,
    referencePublishers: [],
    english: "",
    turkish: "",
    ...fields,
  };
}

const slugs = (articles: TestArticle[]) => articles.map(({ slug }) => slug);

describe("createArticleSearch", () => {
  it("searches the title, summary, category, source and both texts", () => {
    const search = createArticleSearch([
      article("title", { title: "Apple opens a shop" }),
      article("summary", { shortSummary: "Samsung sells more phones." }),
      article("category", { category: { name: "Beauty" } }),
      article("source", { sourceName: "GOV.UK" }),
      article("reference", { referencePublishers: ["BBC"] }),
      article("english", {
        english: uniqueSearchTerms(["Taylor Swift sang."]),
      }),
      article("turkish", { turkish: uniqueSearchTerms(["Uzaydaki çöp"]) }),
    ]);

    expect(slugs(search("apple"))).toEqual(["title"]);
    expect(slugs(search("samsung"))).toEqual(["summary"]);
    expect(slugs(search("beauty"))).toEqual(["category"]);
    expect(slugs(search("gov.uk"))).toEqual(["source"]);
    expect(slugs(search("BBC"))).toEqual(["reference"]);
    expect(slugs(search("Taylor Swift"))).toEqual(["english"]);
    expect(slugs(search("çöp"))).toEqual(["turkish"]);
    expect(slugs(search("cop"))).toEqual(["turkish"]);
  });

  it("finds only articles that contain every term", () => {
    const search = createArticleSearch([
      article("both", { english: "rubbish space" }),
      article("one", { english: "space" }),
    ]);

    expect(slugs(search("space rubbish"))).toEqual(["both"]);
  });

  it("ranks a title match above summary, source and body matches", () => {
    const search = createArticleSearch([
      article("body", { english: "satellites" }),
      article("source", { sourceName: "Satellites Weekly" }),
      article("summary", { shortSummary: "Two satellites fall." }),
      article("title", { title: "Satellites" }),
    ]);

    expect(slugs(search("satellites"))).toEqual([
      "title",
      "summary",
      "source",
      "body",
    ]);
  });

  it("ranks a whole word above the start of a word", () => {
    const search = createArticleSearch([
      article("start", { title: "Phones get cheaper" }),
      article("whole", { title: "A phone that lasts" }),
    ]);

    expect(slugs(search("phone"))).toEqual(["whole", "start"]);
  });

  it("matches the start of a word only from three letters", () => {
    const search = createArticleSearch([
      article("aid", { title: "Aid arrives" }),
      article("ai", { title: "AI writes" }),
    ]);

    expect(slugs(search("ai"))).toEqual(["ai"]);
    expect(slugs(search("arr"))).toEqual(["aid"]);
  });

  it("ranks the query as a phrase above its words apart", () => {
    const search = createArticleSearch([
      article("apart", { title: "Pop music from K to Z" }),
      article("phrase", { title: "K-pop fans travel" }),
    ]);

    expect(slugs(search("k pop"))).toEqual(["phrase", "apart"]);
  });

  it("keeps the given order for equal matches", () => {
    const search = createArticleSearch([
      article("newer", { english: "space" }),
      article("older", { english: "space" }),
    ]);

    expect(slugs(search("space"))).toEqual(["newer", "older"]);
  });

  it("finds nothing for an empty query or one without letters", () => {
    const search = createArticleSearch([article("any", { title: "Space" })]);

    expect(search("")).toEqual([]);
    expect(search(" – ")).toEqual([]);
  });
});
