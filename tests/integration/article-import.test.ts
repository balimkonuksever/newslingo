import { beforeEach, describe, expect, it } from "vitest";

import {
  ArticleImportError,
  importArticles,
  planArticleImport,
} from "../../prisma/article-import";
import { EDITORIAL_DICTIONARY } from "../../prisma/editorial/dictionary";
import {
  provisionReferenceData,
  seedDemoDictionary,
} from "../../prisma/seeders";
import {
  resolveWrittenArticles,
  type WrittenArticle,
} from "../../prisma/written-articles";
import type { AdminIdentity } from "@/server/auth/access";
import { createAdmin } from "@/server/auth/admin-accounts";
import { db } from "@/server/db/client";
import { publishArticle } from "@/server/moderation/workflow";

import {
  WRITTEN_ARTICLE_CONTEXT,
  writtenExplainer,
  writtenNews,
} from "../support/written-articles";
import { TEST_ADMIN, testAuth } from "./admins";
import { createArticle, resetDatabase } from "./database";

// The article import (W) against PostgreSQL: new and changed files become
// drafts with everything the reader shows, a rerun changes nothing, and an
// article that is no longer a draft is never touched.

beforeEach(async () => {
  await resetDatabase();
  await provisionReferenceData(db);
});

function resolve(
  articles: readonly WrittenArticle[],
  context = WRITTEN_ARTICLE_CONTEXT,
) {
  return resolveWrittenArticles(articles, context);
}

async function runImport(
  articles: readonly WrittenArticle[],
  context = WRITTEN_ARTICLE_CONTEXT,
) {
  const resolved = resolve(articles, context);

  return importArticles(db, resolved.articles, resolved.vocabularyRows);
}

async function planFor(articles: readonly WrittenArticle[]) {
  const resolved = resolve(articles);

  return planArticleImport(db, resolved.articles, resolved.vocabularyRows);
}

function stored(slug: string) {
  return db.article.findUniqueOrThrow({
    where: { slug },
    include: {
      paragraphs: { orderBy: { order: "asc" } },
      references: { orderBy: { order: "asc" } },
      expressions: true,
      vocabulary: { include: { vocabularyEntry: true } },
    },
  });
}

describe("importArticles", () => {
  it("writes new articles as drafts with everything the reader shows", async () => {
    const news = writtenNews();
    const explainer = writtenExplainer();

    const result = await runImport([news, explainer]);

    expect(result).toMatchObject({ created: 2, updated: 0, unchanged: 0 });
    expect(result.entries.added).toBeGreaterThan(400);

    const story = await stored(news.slug);
    expect(story).toMatchObject({
      status: "DRAFT",
      publishedOnSiteAt: null,
      kind: "NEWS",
      title: news.title,
      sourceName: news.source.name,
      sourceUrl: news.source.url,
      sourcePublishedAt: news.source.publishedAt,
      sourceLicence: "OGL_3_0",
      datedAt: news.source.publishedAt,
      wordCount: 228,
    });
    expect(
      story.paragraphs.map(({ english, turkish }) => ({ english, turkish })),
    ).toEqual(news.paragraphs);
    expect(story.expressions).toHaveLength(news.expressions.length);
    expect(story.vocabulary).toHaveLength(news.keyVocabulary.length);

    const written = await stored(explainer.slug);
    expect(written).toMatchObject({
      kind: "EXPLAINER",
      sourceName: null,
      sourceUrl: null,
      datedAt: explainer.writtenAt,
    });
    expect(
      written.references.map(({ order, title, publisher, url, checkedAt }) => ({
        order,
        title,
        publisher,
        url,
        checkedAt,
      })),
    ).toEqual([{ order: 1, ...explainer.references[0] }]);
  });

  it("gives every English word an editorial entry that lookups find", async () => {
    const news = writtenNews();
    const { vocabularyRows } = resolve([news]);

    await runImport([news]);

    for (const row of vocabularyRows) {
      await expect(
        db.vocabularyEntry.count({
          where: {
            normalizedWord: row.normalizedWord,
            contextHash: row.contextHash,
            provider: "editorial",
          },
        }),
        row.surfaceWord,
      ).resolves.toBe(1);
    }
  });

  it("changes nothing when it runs again", async () => {
    const articles = [writtenNews(), writtenExplainer()];
    await runImport(articles);
    const before = await db.article.findMany({ orderBy: { slug: "asc" } });

    const plan = await planFor(articles);
    expect(plan.steps.map(({ action }) => action)).toEqual([
      "unchanged",
      "unchanged",
    ]);
    expect(plan.entries).toEqual({ added: 0, changed: 0 });

    await expect(runImport(articles)).resolves.toMatchObject({
      created: 0,
      updated: 0,
      unchanged: 2,
      entries: { added: 0, changed: 0 },
    });
    expect(await db.article.findMany({ orderBy: { slug: "asc" } })).toEqual(
      before,
    );
  });

  it("rewrites a changed draft, and names what changed", async () => {
    const news = writtenNews();
    await runImport([news]);
    const [first, ...rest] = news.paragraphs;
    const changed: WrittenArticle = {
      ...news,
      title: "A Bakery Delivers by Bicycle",
      paragraphs: [
        { ...first, turkish: `${first.turkish} Bisikletle.` },
        ...rest,
      ],
    };

    expect((await planFor([changed])).steps).toEqual([
      expect.objectContaining({
        action: "update",
        changed: ["title", "paragraphs"],
      }),
    ]);

    await expect(runImport([changed])).resolves.toMatchObject({ updated: 1 });

    const story = await stored(news.slug);
    expect(story.title).toBe("A Bakery Delivers by Bicycle");
    expect(story.paragraphs[0].turkish).toBe(changed.paragraphs[0].turkish);
    // Replacing the paragraphs keeps the marks and key words.
    expect(story.expressions).toHaveLength(news.expressions.length);
    expect(story.vocabulary).toHaveLength(news.keyVocabulary.length);
  });

  it("never changes a published article, and then writes nothing at all", async () => {
    const news = writtenNews();
    await runImport([news]);
    await db.article.update({
      where: { slug: news.slug },
      data: { status: "PUBLISHED", publishedOnSiteAt: new Date() },
    });
    const explainer = writtenExplainer();

    // An unchanged published article is left alone.
    await expect(runImport([news])).resolves.toMatchObject({ unchanged: 1 });

    const attempt = runImport([{ ...news, title: "Corrected" }, explainer]);

    await expect(attempt).rejects.toThrow(ArticleImportError);
    await expect(attempt).rejects.toThrow(
      `"${news.slug}" is published, and its file differs in: title. The import only changes drafts: archive it, restore it to draft, then import again.`,
    );
    expect((await stored(news.slug)).title).toBe(news.title);
    expect(await db.article.count({ where: { slug: explainer.slug } })).toBe(0);
  });

  it("corrects the dictionary entries of every imported article", async () => {
    const news = writtenNews();
    await runImport([news]);
    const loaf = EDITORIAL_DICTIONARY.find(({ lemma }) => lemma === "loaf")!;
    const corrected = { ...loaf, tr: "somun ekmek (düzeltildi)" };
    const context = {
      ...WRITTEN_ARTICLE_CONTEXT,
      dictionary: EDITORIAL_DICTIONARY.map((sense) =>
        sense === loaf ? corrected : sense,
      ),
    };

    const result = await runImport([news], context);

    expect(result).toMatchObject({ unchanged: 1, entries: { added: 0 } });
    expect(result.entries.changed).toBeGreaterThanOrEqual(1);
    expect(
      await db.vocabularyEntry.findFirstOrThrow({
        where: { normalizedWord: "loaf", provider: "editorial" },
      }),
    ).toMatchObject({ turkishMeaning: "somun ekmek (düzeltildi)" });
  });

  it("keeps imported articles' entries when the demo dictionary is reseeded", async () => {
    const news = writtenNews();
    await runImport([news]);
    const entries = await db.vocabularyEntry.count();

    await seedDemoDictionary(db);

    expect(await db.vocabularyEntry.count()).toBeGreaterThanOrEqual(entries);
    expect((await planFor([news])).entries).toEqual({ added: 0, changed: 0 });
  });

  it("refuses a story whose source another article already adapts", async () => {
    const news = writtenNews();
    const category = await db.category.findUniqueOrThrow({
      where: { slug: news.categorySlug },
    });
    await createArticle(category.id, {
      slug: "older-adaptation",
      sourceUrl: news.source.url,
    });

    await expect(runImport([news])).rejects.toThrow(
      `Article "older-adaptation" in the database is already adapted from ${news.source.url}.`,
    );
  });

  it("refuses to run before the reference data exists", async () => {
    await resetDatabase();

    await expect(runImport([writtenNews()])).rejects.toThrow(
      "Run pnpm db:seed:reference first.",
    );
  });

  it("imports drafts that an admin can publish", async () => {
    const user = await createAdmin(testAuth, TEST_ADMIN);
    const admin: AdminIdentity = {
      id: user.id,
      name: TEST_ADMIN.name,
      email: user.email,
    };
    const articles = [writtenNews(), writtenExplainer()];
    await runImport(articles);

    for (const { slug } of articles) {
      const { id } = await stored(slug);

      await expect(
        publishArticle(admin, { articleId: id }),
        slug,
      ).resolves.toMatchObject({ ok: true });
    }
  });
});
