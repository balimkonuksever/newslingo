import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/server/db/client";

import { createArticle, createCategory, resetDatabase } from "./database";

// Each assertion names the constraint it expects, so a test only passes when
// that exact database rule rejected the write.
beforeEach(resetDatabase);

describe("reader-core uniqueness", () => {
  it("rejects a duplicate category slug", async () => {
    await createCategory({ slug: "world" });

    await expect(createCategory({ slug: "world" })).rejects.toThrow(
      "Category_slug_key",
    );
  });

  it("rejects a duplicate article slug", async () => {
    const category = await createCategory();
    await createArticle(category.id, { slug: "same-story" });

    await expect(
      createArticle(category.id, { slug: "same-story" }),
    ).rejects.toThrow("Article_slug_key");
  });

  it("rejects a second article from the same source URL", async () => {
    const category = await createCategory();
    const sourceUrl = "https://test.newslingo.example/articles/shared";
    await createArticle(category.id, { sourceUrl });

    await expect(createArticle(category.id, { sourceUrl })).rejects.toThrow(
      "Article_sourceUrl_key",
    );
  });

  it("rejects a duplicate paragraph order within one article only", async () => {
    const category = await createCategory();
    const first = await createArticle(category.id);
    const second = await createArticle(category.id);
    const paragraph = { order: 1, english: "Hello.", turkish: "Merhaba." };

    await db.articleParagraph.create({
      data: { ...paragraph, articleId: first.id },
    });
    await db.articleParagraph.create({
      data: { ...paragraph, articleId: second.id },
    });

    await expect(
      db.articleParagraph.create({
        data: { ...paragraph, articleId: first.id },
      }),
    ).rejects.toThrow("ArticleParagraph_articleId_order_key");
  });
});

describe("reader-core check constraints", () => {
  it.each([0, -1])("rejects paragraph order %i", async (order) => {
    const category = await createCategory();
    const article = await createArticle(category.id);

    await expect(
      db.articleParagraph.create({
        data: {
          articleId: article.id,
          order,
          english: "Hi.",
          turkish: "Selam.",
        },
      }),
    ).rejects.toThrow("ArticleParagraph_order_positive");
  });

  it.each(["", " ", "\t\n "])(
    "rejects blank paragraph text %j in either language",
    async (blank) => {
      const category = await createCategory();
      const article = await createArticle(category.id);

      await expect(
        db.articleParagraph.create({
          data: {
            articleId: article.id,
            order: 1,
            english: blank,
            turkish: "Selam.",
          },
        }),
      ).rejects.toThrow("ArticleParagraph_english_not_blank");
      await expect(
        db.articleParagraph.create({
          data: {
            articleId: article.id,
            order: 1,
            english: "Hi.",
            turkish: blank,
          },
        }),
      ).rejects.toThrow("ArticleParagraph_turkish_not_blank");
    },
  );

  it("requires a site publication time only for published articles", async () => {
    const category = await createCategory();

    await expect(
      createArticle(category.id, { publishedOnSiteAt: null }),
    ).rejects.toThrow("Article_published_timestamp_required");
    await expect(
      createArticle(category.id, { status: "DRAFT", publishedOnSiteAt: null }),
    ).resolves.toMatchObject({ status: "DRAFT", publishedOnSiteAt: null });
  });

  it.each([
    [{ wordCount: 0 }, "Article_wordCount_positive"],
    [{ readingTimeMinutes: 0 }, "Article_readingTimeMinutes_positive"],
  ])("rejects %o", async (invalid, constraint) => {
    const category = await createCategory();

    await expect(createArticle(category.id, invalid)).rejects.toThrow(
      constraint,
    );
  });

  it("rejects a zero category display order", async () => {
    await expect(createCategory({ displayOrder: 0 })).rejects.toThrow(
      "Category_displayOrder_positive",
    );
  });
});

describe("reader-core relations", () => {
  it("deletes an article's paragraphs together with the article", async () => {
    const category = await createCategory();
    const article = await createArticle(category.id);
    const other = await createArticle(category.id);

    await db.articleParagraph.createMany({
      data: [
        { articleId: article.id, order: 1, english: "One.", turkish: "Bir." },
        { articleId: article.id, order: 2, english: "Two.", turkish: "İki." },
        { articleId: other.id, order: 1, english: "Kept.", turkish: "Kaldı." },
      ],
    });

    await db.article.delete({ where: { id: article.id } });

    expect(
      await db.articleParagraph.findMany({ select: { articleId: true } }),
    ).toEqual([{ articleId: other.id }]);
  });

  it("refuses to delete a category that still has articles", async () => {
    const category = await createCategory();
    await createArticle(category.id);

    await expect(
      db.category.delete({ where: { id: category.id } }),
    ).rejects.toThrow("Article_categoryId_fkey");
    expect(await db.category.count()).toBe(1);
  });

  it("rejects an article whose category does not exist", async () => {
    await expect(createArticle("missing-category")).rejects.toThrow(
      "Article_categoryId_fkey",
    );
  });
});
