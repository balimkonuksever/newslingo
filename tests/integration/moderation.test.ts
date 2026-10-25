import { beforeEach, describe, expect, it } from "vitest";

import type { AdminIdentity } from "@/server/auth/access";
import { createAdmin } from "@/server/auth/admin-accounts";
import { db } from "@/server/db/client";
import {
  archiveArticle,
  changeArticleCategory,
  changeArticleDifficulty,
  publishArticle,
  restoreArticle,
} from "@/server/moderation/workflow";
import { countWords, estimateReadingMinutes } from "@/lib/reading-time";
import { publicArticleWhere } from "@/server/articles/queries";

import { TEST_ADMIN, testAuth } from "./admins";
import { createArticle, createCategory, resetDatabase } from "./database";

// The moderation workflow against PostgreSQL (M5): every change is checked on
// the server, made in one transaction with its audit row, and refused
// whole when it may not happen.

let admin: AdminIdentity;
let categoryId: string;

beforeEach(async () => {
  await resetDatabase();
  const user = await createAdmin(testAuth, TEST_ADMIN);
  admin = { id: user.id, name: TEST_ADMIN.name, email: user.email };
  ({ id: categoryId } = await createCategory({ slug: "world" }));
});

const PARAGRAPHS = [
  {
    english: "A town library now lends tools as well as books.",
    turkish:
      "Bir kasaba kütüphanesi artık kitapların yanı sıra alet de ödünç veriyor.",
  },
  {
    english: "The most popular item was a carpet cleaner.",
    turkish: "En çok ilgi gören, halı yıkama makinesi oldu.",
  },
];

/** A complete draft, ready to publish, with two paragraph pairs. */
async function createDraft(paragraphs = PARAGRAPHS) {
  const wordCount = paragraphs.reduce(
    (total, { english }) => total + countWords(english),
    0,
  );
  const article = await createArticle(categoryId, {
    status: "DRAFT",
    publishedOnSiteAt: null,
    wordCount,
    readingTimeMinutes: estimateReadingMinutes(wordCount),
  });

  await db.articleParagraph.createMany({
    data: paragraphs.map((paragraph, index) => ({
      ...paragraph,
      order: index + 1,
      articleId: article.id,
    })),
  });

  return article;
}

function eventsFor(articleId: string) {
  return db.moderationEvent.findMany({
    where: { articleId },
    orderBy: { createdAt: "asc" },
  });
}

function isPublic(articleId: string) {
  return db.article
    .count({ where: { id: articleId, ...publicArticleWhere } })
    .then((count) => count === 1);
}

describe("publishArticle", () => {
  it("publishes a complete draft and records who did it", async () => {
    const draft = await createDraft();

    await expect(
      publishArticle(admin, { articleId: draft.id }),
    ).resolves.toEqual({ ok: true });

    const article = await db.article.findUniqueOrThrow({
      where: { id: draft.id },
    });
    expect(article.status).toBe("PUBLISHED");
    expect(article.publishedOnSiteAt).toBeInstanceOf(Date);
    expect(await isPublic(draft.id)).toBe(true);
    expect(await eventsFor(draft.id)).toEqual([
      expect.objectContaining({
        actorId: admin.id,
        action: "PUBLISH",
        reason: null,
        before: { status: "DRAFT", publishedOnSiteAt: null },
        after: {
          status: "PUBLISHED",
          publishedOnSiteAt: article.publishedOnSiteAt?.toISOString(),
        },
      }),
    ]);
  });

  it("refuses an incomplete draft and changes nothing", async () => {
    // No paragraphs, and a word count left over from text it no longer has.
    const draft = await createArticle(categoryId, {
      status: "DRAFT",
      publishedOnSiteAt: null,
    });

    await expect(
      publishArticle(admin, { articleId: draft.id }),
    ).resolves.toEqual({
      ok: false,
      refusal: "not-publishable",
      message: "The article can’t be published yet.",
      problems: [
        "It has no paragraphs.",
        "Its word count or reading time does not match its English.",
      ],
    });
    expect(
      await db.article.findUniqueOrThrow({ where: { id: draft.id } }),
    ).toMatchObject({ status: "DRAFT", publishedOnSiteAt: null });
    expect(await eventsFor(draft.id)).toEqual([]);
  });

  it("refuses an article that is not a draft", async () => {
    const published = await createArticle(categoryId);

    await expect(
      publishArticle(admin, { articleId: published.id }),
    ).resolves.toMatchObject({
      ok: false,
      refusal: "not-allowed",
      message: "Publishing isn’t possible for an article that is published.",
    });
    expect(await eventsFor(published.id)).toEqual([]);
  });

  it("lets only one of two admins publishing at once succeed", async () => {
    const draft = await createDraft();

    const results = await Promise.all([
      publishArticle(admin, { articleId: draft.id }),
      publishArticle(admin, { articleId: draft.id }),
    ]);

    expect(results.filter(({ ok }) => ok)).toHaveLength(1);
    expect(await eventsFor(draft.id)).toHaveLength(1);
  });

  it("leaves the article unchanged when its audit row can’t be written", async () => {
    const draft = await createDraft();
    const unknownAdmin = { ...admin, id: "no-such-admin" };

    await expect(
      publishArticle(unknownAdmin, { articleId: draft.id }),
    ).rejects.toThrow();
    expect(
      await db.article.findUniqueOrThrow({ where: { id: draft.id } }),
    ).toMatchObject({ status: "DRAFT", publishedOnSiteAt: null });
  });

  it("refuses an unknown article and a malformed one", async () => {
    await expect(
      publishArticle(admin, { articleId: "no-such-article" }),
    ).resolves.toMatchObject({ ok: false, refusal: "not-found" });
    await expect(
      publishArticle(admin, { articleId: 42 }),
    ).resolves.toMatchObject({ ok: false, refusal: "invalid" });
  });
});

describe("archiveArticle and restoreArticle", () => {
  it("takes a published article off the site, with a reason", async () => {
    const article = await createArticle(categoryId);

    await expect(
      archiveArticle(admin, { articleId: article.id, reason: "  " }),
    ).resolves.toMatchObject({ ok: false, refusal: "invalid" });
    await expect(
      archiveArticle(admin, {
        articleId: article.id,
        reason: "The source corrected the story.",
      }),
    ).resolves.toEqual({ ok: true });

    expect(await isPublic(article.id)).toBe(false);
    expect(await eventsFor(article.id)).toEqual([
      expect.objectContaining({
        action: "ARCHIVE",
        reason: "The source corrected the story.",
        before: { status: "PUBLISHED" },
        after: { status: "ARCHIVED" },
      }),
    ]);
  });

  it("rejects a draft by archiving it", async () => {
    const draft = await createDraft();

    await expect(
      archiveArticle(admin, { articleId: draft.id, reason: "Off topic." }),
    ).resolves.toEqual({ ok: true });
    expect(
      await db.article.findUniqueOrThrow({ where: { id: draft.id } }),
    ).toMatchObject({ status: "ARCHIVED" });
  });

  it("restores an archived article as a draft, which keeps its first publication date when published again", async () => {
    const draft = await createDraft();
    await publishArticle(admin, { articleId: draft.id });
    const { publishedOnSiteAt } = await db.article.findUniqueOrThrow({
      where: { id: draft.id },
    });
    await archiveArticle(admin, { articleId: draft.id, reason: "A mistake." });

    await expect(
      restoreArticle(admin, { articleId: draft.id, reason: "Fixed." }),
    ).resolves.toEqual({ ok: true });
    expect(
      await db.article.findUniqueOrThrow({ where: { id: draft.id } }),
    ).toMatchObject({ status: "DRAFT" });

    await publishArticle(admin, { articleId: draft.id });
    expect(
      await db.article.findUniqueOrThrow({ where: { id: draft.id } }),
    ).toMatchObject({ status: "PUBLISHED", publishedOnSiteAt });
    expect((await eventsFor(draft.id)).map(({ action }) => action)).toEqual([
      "PUBLISH",
      "ARCHIVE",
      "RESTORE",
      "PUBLISH",
    ]);
  });

  it("restores only archived articles", async () => {
    const draft = await createDraft();

    await expect(
      restoreArticle(admin, { articleId: draft.id, reason: "Why not." }),
    ).resolves.toMatchObject({ ok: false, refusal: "not-allowed" });
  });
});

describe("changeArticleCategory and changeArticleDifficulty", () => {
  it("moves an article to another active category", async () => {
    const article = await createArticle(categoryId);
    await createCategory({ slug: "business" });
    await createCategory({ slug: "beauty", isActive: false });

    await expect(
      changeArticleCategory(admin, {
        articleId: article.id,
        categorySlug: "beauty",
        reason: "Better fit.",
      }),
    ).resolves.toMatchObject({ ok: false, refusal: "invalid" });
    await expect(
      changeArticleCategory(admin, {
        articleId: article.id,
        categorySlug: "world",
        reason: "Same.",
      }),
    ).resolves.toMatchObject({ ok: false, refusal: "invalid" });
    await expect(
      changeArticleCategory(admin, {
        articleId: article.id,
        categorySlug: "business",
        reason: "It is about a company.",
      }),
    ).resolves.toEqual({ ok: true });

    expect(await eventsFor(article.id)).toEqual([
      expect.objectContaining({
        action: "CHANGE_CATEGORY",
        before: { category: "world" },
        after: { category: "business" },
      }),
    ]);
  });

  it("corrects a level label, and only to a real level", async () => {
    const article = await createArticle(categoryId);

    await expect(
      changeArticleDifficulty(admin, {
        articleId: article.id,
        difficulty: "C2",
        reason: "Harder.",
      }),
    ).resolves.toMatchObject({ ok: false, refusal: "invalid" });
    await expect(
      changeArticleDifficulty(admin, {
        articleId: article.id,
        difficulty: "B2",
      }),
    ).resolves.toMatchObject({ ok: false, refusal: "invalid" });
    await expect(
      changeArticleDifficulty(admin, {
        articleId: article.id,
        difficulty: "B2",
        reason: "Long sentences.",
      }),
    ).resolves.toEqual({ ok: true });

    expect(
      await db.article.findUniqueOrThrow({ where: { id: article.id } }),
    ).toMatchObject({ difficulty: "B2", status: "PUBLISHED" });
  });
});

describe("the audit trail", () => {
  it("cannot be changed, and keeps its article and admin from being deleted", async () => {
    const draft = await createDraft();
    await publishArticle(admin, { articleId: draft.id });
    const [event] = await eventsFor(draft.id);

    await expect(
      db.moderationEvent.update({
        where: { id: event?.id },
        data: { reason: "Rewritten." },
      }),
    ).rejects.toThrow(/cannot be changed or deleted/);
    await expect(
      db.moderationEvent.delete({ where: { id: event?.id } }),
    ).rejects.toThrow(/cannot be changed or deleted/);
    await expect(
      db.article.delete({ where: { id: draft.id } }),
    ).rejects.toThrow();
    await expect(db.user.delete({ where: { id: admin.id } })).rejects.toThrow();
  });

  it("requires a reason for every action but publishing", async () => {
    const article = await createArticle(categoryId);

    await expect(
      db.moderationEvent.create({
        data: {
          articleId: article.id,
          actorId: admin.id,
          action: "ARCHIVE",
          before: {},
          after: {},
        },
      }),
    ).rejects.toThrow(/ModerationEvent_reason_required/);
  });
});
