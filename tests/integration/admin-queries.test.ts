import { beforeEach, describe, expect, it } from "vitest";

import type { ArticleStatus } from "@/generated/prisma/enums";
import { getPublicArticleBySlug } from "@/server/articles/queries";
import type { AdminIdentity } from "@/server/auth/access";
import { createAdmin } from "@/server/auth/admin-accounts";
import { db } from "@/server/db/client";
import {
  countArticlesByStatus,
  getArticleForAdmin,
  listArticlesForAdmin,
} from "@/server/moderation/queries";
import {
  archiveArticle,
  changeArticleDifficulty,
  restoreArticle,
} from "@/server/moderation/workflow";

import { TEST_ADMIN, testAuth } from "./admins";
import {
  createArticle,
  createCategory,
  createExpression,
  createVocabularyEntry,
  resetDatabase,
} from "./database";

// The admin pages' read queries (M5): unlike the public ones, they see every
// status and switched-off categories, and their counts agree with their
// filters.

const at = (day: number) => new Date(Date.UTC(2026, 8, day, 12));

beforeEach(resetDatabase);

/**
 * Two categories, one of them switched off, holding seven articles in four
 * statuses, with source dates from 1 to 7 September.
 */
async function createMixedArticles() {
  const world = await createCategory({ slug: "world", displayOrder: 1 });
  const beauty = await createCategory({
    slug: "beauty",
    displayOrder: 2,
    isActive: false,
  });
  const articles: Array<[string, string, ArticleStatus]> = [
    ["world-published", world.id, "PUBLISHED"],
    ["world-draft", world.id, "DRAFT"],
    ["beauty-published", beauty.id, "PUBLISHED"],
    ["world-archived", world.id, "ARCHIVED"],
    ["beauty-draft", beauty.id, "DRAFT"],
    ["world-failed", world.id, "FAILED"],
    ["world-second-draft", world.id, "DRAFT"],
  ];

  for (const [index, [slug, categoryId, status]] of articles.entries()) {
    await createArticle(categoryId, {
      slug,
      status,
      sourcePublishedAt: at(index + 1),
      publishedOnSiteAt: status === "PUBLISHED" ? at(index + 1) : null,
    });
  }
}

const slugsOf = (list: { articles: Array<{ slug: string }> }) =>
  list.articles.map(({ slug }) => slug);

describe("listArticlesForAdmin", () => {
  it("lists every article in any status and category, newest first", async () => {
    await createMixedArticles();

    const list = await listArticlesForAdmin({});

    expect(slugsOf(list)).toEqual([
      "world-second-draft",
      "world-failed",
      "beauty-draft",
      "world-archived",
      "beauty-published",
      "world-draft",
      "world-published",
    ]);
    expect(list.total).toBe(7);
    expect(list.statusCounts).toEqual({
      DRAFT: 3,
      PUBLISHED: 2,
      ARCHIVED: 1,
      FETCHED: 0,
      PROCESSING: 0,
      FAILED: 1,
    });
    expect(list.categories).toEqual([
      { slug: "world", name: expect.any(String), isActive: true, count: 5 },
      { slug: "beauty", name: expect.any(String), isActive: false, count: 2 },
    ]);
  });

  it("filters by status, by category and by both", async () => {
    await createMixedArticles();

    expect(slugsOf(await listArticlesForAdmin({ status: "DRAFT" }))).toEqual([
      "world-second-draft",
      "beauty-draft",
      "world-draft",
    ]);
    expect(slugsOf(await listArticlesForAdmin({ category: "beauty" }))).toEqual(
      ["beauty-draft", "beauty-published"],
    );
    expect(
      slugsOf(
        await listArticlesForAdmin({ status: "DRAFT", category: "world" }),
      ),
    ).toEqual(["world-second-draft", "world-draft"]);
    expect(
      slugsOf(
        await listArticlesForAdmin({ status: "FETCHED", category: "world" }),
      ),
    ).toEqual([]);
  });

  it("counts each filter's choices within the other filter", async () => {
    await createMixedArticles();

    const list = await listArticlesForAdmin({
      status: "DRAFT",
      category: "world",
    });

    // Statuses are counted within the chosen category…
    expect(list.statusCounts).toEqual({
      DRAFT: 2,
      PUBLISHED: 1,
      ARCHIVED: 1,
      FETCHED: 0,
      PROCESSING: 0,
      FAILED: 1,
    });
    // …and categories within the chosen status, so the chosen status and
    // category both show the number of rows listed.
    expect(list.categories.map(({ slug, count }) => [slug, count])).toEqual([
      ["world", 2],
      ["beauty", 1],
    ]);
    expect(list.total).toBe(2);
    expect(list.articles).toHaveLength(list.total);
  });

  it("agrees with its counts for every combination of filters", async () => {
    await createMixedArticles();
    const statuses = [undefined, "DRAFT", "PUBLISHED", "ARCHIVED", "FAILED"];

    for (const status of statuses as Array<ArticleStatus | undefined>) {
      for (const category of [undefined, "world", "beauty"]) {
        const filters = { status, category };
        const list = await listArticlesForAdmin(filters);
        const statusTotal = Object.values(list.statusCounts).reduce(
          (sum, count) => sum + count,
          0,
        );
        const categoryTotal = list.categories.reduce(
          (sum, { count }) => sum + count,
          0,
        );

        // The chosen status, or all of them, and the chosen category, or all
        // of them, each count exactly the rows listed.
        expect(list.articles, JSON.stringify(filters)).toHaveLength(list.total);
        expect(
          status ? list.statusCounts[status] : statusTotal,
          JSON.stringify(filters),
        ).toBe(list.total);
        expect(
          category
            ? list.categories.find(({ slug }) => slug === category)?.count
            : categoryTotal,
          JSON.stringify(filters),
        ).toBe(list.total);
        expect(
          list.articles.every(
            (article) =>
              (!status || article.status === status) &&
              (!category || article.category.slug === category),
          ),
          JSON.stringify(filters),
        ).toBe(true);
      }
    }
  });

  it("shows at most the limit, but counts every match", async () => {
    await createMixedArticles();

    const list = await listArticlesForAdmin({ category: "world" }, 2);

    expect(slugsOf(list)).toEqual(["world-second-draft", "world-failed"]);
    expect(list.total).toBe(5);
  });
});

describe("countArticlesByStatus", () => {
  it("counts every status, including those with no articles", async () => {
    await createMixedArticles();

    expect(await countArticlesByStatus()).toEqual({
      DRAFT: 3,
      PUBLISHED: 2,
      ARCHIVED: 1,
      FETCHED: 0,
      PROCESSING: 0,
      FAILED: 1,
    });
  });
});

describe("getArticleForAdmin", () => {
  let admin: AdminIdentity;

  beforeEach(async () => {
    const user = await createAdmin(testAuth, TEST_ADMIN);
    admin = { id: user.id, name: TEST_ADMIN.name, email: user.email };
  });

  async function createArticleWithParagraphs(
    data: Parameters<typeof createArticle>[1] = {},
  ) {
    const { id: categoryId } = await createCategory({ slug: "world" });
    const article = await createArticle(categoryId, data);

    await db.articleParagraph.createMany({
      data: [2, 1].map((order) => ({
        articleId: article.id,
        order,
        english: `Paragraph ${order}.`,
        turkish: `Paragraf ${order}.`,
      })),
    });

    return article;
  }

  it("loads a draft, which the public query cannot", async () => {
    const draft = await createArticleWithParagraphs({
      status: "DRAFT",
      publishedOnSiteAt: null,
    });

    expect(await getPublicArticleBySlug(draft.slug)).toBeNull();
    expect(await getArticleForAdmin(draft.id)).toMatchObject({
      id: draft.id,
      slug: draft.slug,
      status: "DRAFT",
      categoryIsActive: true,
      paragraphs: [
        { order: 1, english: "Paragraph 1." },
        { order: 2, english: "Paragraph 2." },
      ],
      history: [],
    });
  });

  it("holds exactly what the reader shows of a published article", async () => {
    const article = await createArticleWithParagraphs();
    const paragraph = await db.articleParagraph.findFirstOrThrow({
      where: { articleId: article.id, order: 1 },
    });
    const expression = await createExpression({
      slug: "paragraph",
      expression: "Paragraph",
      normalizedExpression: "paragraph",
    });
    const entry = await createVocabularyEntry();

    // One Real English mark and one key word, so that every part of the
    // reader's data is compared.
    await db.articleExpression.create({
      data: {
        articleId: article.id,
        paragraphId: paragraph.id,
        expressionId: expression.id,
        surfaceText: "Paragraph",
        sentence: paragraph.english,
        startOffset: 0,
        endOffset: 9,
        displayOrder: 1,
      },
    });
    await db.articleVocabulary.create({
      data: {
        articleId: article.id,
        vocabularyEntryId: entry.id,
        sourceSentence: paragraph.english,
        displayOrder: 1,
      },
    });

    const preview = await getArticleForAdmin(article.id);
    const published = await getPublicArticleBySlug(article.slug);

    expect(preview).not.toBeNull();
    const {
      id,
      status,
      categoryIsActive,
      createdAt,
      updatedAt,
      history,
      ...readerFields
    } = preview!;
    expect(readerFields).toEqual(published);
    expect(readerFields).toMatchObject({
      expressionCards: [{ slug: "paragraph" }],
      keyVocabulary: [{ word: entry.surfaceWord }],
    });
    expect({ id, status, categoryIsActive, history }).toEqual({
      id: article.id,
      status: "PUBLISHED",
      categoryIsActive: true,
      history: [],
    });
    expect(createdAt).toBeInstanceOf(Date);
    expect(updatedAt).toBeInstanceOf(Date);
  });

  it("lists the article's moderation history, newest first", async () => {
    const article = await createArticleWithParagraphs();

    await archiveArticle(admin, { articleId: article.id, reason: "Wrong." });
    await restoreArticle(admin, { articleId: article.id, reason: "Fixed." });
    await changeArticleDifficulty(admin, {
      articleId: article.id,
      difficulty: "B2",
      reason: "Long sentences.",
    });

    const preview = await getArticleForAdmin(article.id);

    expect(preview?.history).toEqual([
      expect.objectContaining({
        action: "CHANGE_DIFFICULTY",
        reason: "Long sentences.",
        before: { difficulty: "B1" },
        after: { difficulty: "B2" },
        actor: { name: TEST_ADMIN.name },
      }),
      expect.objectContaining({
        action: "RESTORE",
        before: { status: "ARCHIVED" },
        after: { status: "DRAFT" },
      }),
      expect.objectContaining({ action: "ARCHIVE", reason: "Wrong." }),
    ]);
  });

  it("returns null for an unknown or malformed id", async () => {
    await createArticleWithParagraphs();

    expect(await getArticleForAdmin("no-such-article")).toBeNull();
    expect(await getArticleForAdmin("")).toBeNull();
    expect(await getArticleForAdmin("x".repeat(65))).toBeNull();
  });
});
