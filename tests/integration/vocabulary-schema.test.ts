import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/server/db/client";

import {
  createArticle,
  createCategory,
  createExpression,
  createVocabularyEntry,
  resetDatabase,
} from "./database";

// As in reader-schema.test.ts, each assertion names the database rule it
// expects to reject the write.
beforeEach(resetDatabase);

async function createParagraph(articleId: string, order = 1) {
  return db.articleParagraph.create({
    data: {
      articleId,
      order,
      english: "The company will roll out the update next week.",
      turkish: "Şirket güncellemeyi gelecek hafta kullanıma sunacak.",
    },
  });
}

async function createOccurrenceFixture() {
  const category = await createCategory();
  const article = await createArticle(category.id);
  const paragraph = await createParagraph(article.id);
  const expression = await createExpression();
  const occurrence = {
    articleId: article.id,
    expressionId: expression.id,
    paragraphId: paragraph.id,
    surfaceText: "roll out",
    sentence: paragraph.english,
    startOffset: 17,
    endOffset: 25,
    displayOrder: 1,
  };

  return { category, article, paragraph, expression, occurrence };
}

describe("expressions", () => {
  it("rejects a duplicate slug and an invalid slug", async () => {
    await createExpression({ slug: "roll-out" });

    await expect(createExpression({ slug: "roll-out" })).rejects.toThrow(
      "Expression_slug_key",
    );
    await expect(createExpression({ slug: "Roll Out" })).rejects.toThrow(
      "Expression_slug_format",
    );
  });

  it("allows two senses of the same words under different slugs", async () => {
    await createExpression({
      slug: "break-out-skin",
      normalizedExpression: "break out",
    });

    await expect(
      createExpression({
        slug: "break-out-escape",
        normalizedExpression: "break out",
      }),
    ).resolves.toMatchObject({ slug: "break-out-escape" });
  });

  it.each([
    [{ englishMeaning: " " }, "Expression_englishMeaning_not_blank"],
    [{ turkishMeaning: "\n" }, "Expression_turkishMeaning_not_blank"],
  ])("rejects %o", async (invalid, constraint) => {
    await expect(createExpression(invalid)).rejects.toThrow(constraint);
  });

  it("links an expression to a category once, with a positive order", async () => {
    const category = await createCategory();
    const expression = await createExpression();
    const link = {
      categoryId: category.id,
      expressionId: expression.id,
      displayOrder: 1,
    };

    await db.categoryExpression.create({ data: link });

    await expect(db.categoryExpression.create({ data: link })).rejects.toThrow(
      "CategoryExpression_pkey",
    );
    await expect(
      db.categoryExpression.create({
        data: {
          ...link,
          expressionId: (await createExpression()).id,
          displayOrder: 0,
        },
      }),
    ).rejects.toThrow("CategoryExpression_displayOrder_positive");
  });
});

describe("article expression occurrences", () => {
  it("records an occurrence once per position", async () => {
    const { occurrence } = await createOccurrenceFixture();

    await db.articleExpression.create({ data: occurrence });

    await expect(
      db.articleExpression.create({
        data: { ...occurrence, displayOrder: 2 },
      }),
    ).rejects.toThrow(
      "ArticleExpression_paragraphId_startOffset_expressionId_key",
    );
  });

  it("rejects a paragraph from a different article", async () => {
    const { category, occurrence } = await createOccurrenceFixture();
    const otherArticle = await createArticle(category.id);

    await expect(
      db.articleExpression.create({
        data: { ...occurrence, articleId: otherArticle.id },
      }),
    ).rejects.toThrow("ArticleExpression_paragraphId_articleId_fkey");
  });

  it.each([
    [{ startOffset: -1 }, "ArticleExpression_offsets_valid"],
    [{ endOffset: 17 }, "ArticleExpression_offsets_valid"],
    [{ displayOrder: 0 }, "ArticleExpression_displayOrder_positive"],
    [{ confidence: 1.5 }, "ArticleExpression_confidence_range"],
  ])("rejects %o", async (invalid, constraint) => {
    const { occurrence } = await createOccurrenceFixture();

    await expect(
      db.articleExpression.create({ data: { ...occurrence, ...invalid } }),
    ).rejects.toThrow(constraint);
  });

  it("removes occurrences with their paragraph and protects used expressions", async () => {
    const { paragraph, expression, occurrence } =
      await createOccurrenceFixture();
    await db.articleExpression.create({ data: occurrence });

    await expect(
      db.expression.delete({ where: { id: expression.id } }),
    ).rejects.toThrow("ArticleExpression_expressionId_fkey");

    await db.articleParagraph.delete({ where: { id: paragraph.id } });
    expect(await db.articleExpression.count()).toBe(0);
  });
});

describe("vocabulary", () => {
  it("caches one entry per word, context, provider version and schema version", async () => {
    const entry = await createVocabularyEntry({ normalizedWord: "bank" });
    const key = {
      normalizedWord: entry.normalizedWord,
      contextHash: entry.contextHash,
      provider: entry.provider,
      providerVersion: entry.providerVersion,
      schemaVersion: entry.schemaVersion,
    };

    await expect(createVocabularyEntry(key)).rejects.toThrow(
      "VocabularyEntry_normalizedWord_contextHash_provider_provide_key",
    );
    await expect(
      createVocabularyEntry({ ...key, contextHash: "b".repeat(64) }),
    ).resolves.toBeDefined();
    await expect(
      createVocabularyEntry({ ...key, schemaVersion: 2 }),
    ).resolves.toBeDefined();
  });

  it.each([
    [{ contextHash: "not-a-hash" }, "VocabularyEntry_contextHash_sha256"],
    [{ schemaVersion: 0 }, "VocabularyEntry_schemaVersion_positive"],
    [{ turkishMeaning: " " }, "VocabularyEntry_turkishMeaning_not_blank"],
  ])("rejects %o", async (invalid, constraint) => {
    await expect(createVocabularyEntry(invalid)).rejects.toThrow(constraint);
  });

  it("keeps curated vocabulary unique and its cache entry protected", async () => {
    const category = await createCategory();
    const article = await createArticle(category.id);
    const entry = await createVocabularyEntry();
    const curated = {
      articleId: article.id,
      vocabularyEntryId: entry.id,
      sourceSentence: entry.contextSentence,
      displayOrder: 1,
    };

    await db.articleVocabulary.create({ data: curated });

    await expect(
      db.articleVocabulary.create({ data: { ...curated, displayOrder: 2 } }),
    ).rejects.toThrow("ArticleVocabulary_articleId_vocabularyEntryId_key");
    await expect(
      db.vocabularyEntry.delete({ where: { id: entry.id } }),
    ).rejects.toThrow("ArticleVocabulary_vocabularyEntryId_fkey");

    await db.article.delete({ where: { id: article.id } });
    expect(await db.articleVocabulary.count()).toBe(0);
    expect(await db.vocabularyEntry.count()).toBe(1);
  });
});
