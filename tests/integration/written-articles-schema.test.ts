import { beforeEach, describe, expect, it } from "vitest";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db/client";

import {
  createArticle,
  createCategory,
  createExplainer,
  resetDatabase,
} from "./database";

// Written articles (W): news keeps its source and is dated by it, an
// explainer has no source and lists references. Each assertion names the
// constraint it expects, so a test only passes when that exact database rule
// rejected the write.
beforeEach(resetDatabase);

async function categoryId() {
  return (await createCategory()).id;
}

describe("article kinds", () => {
  it("makes an article news unless it says otherwise", async () => {
    const article = await createArticle(await categoryId());

    expect(article.kind).toBe("NEWS");
  });

  it.each<[string, Partial<Prisma.ArticleUncheckedCreateInput>]>([
    ["source name", { sourceName: null }],
    ["source address", { sourceUrl: null }],
    [
      "source publication time",
      { sourcePublishedAt: null, datedAt: new Date("2026-09-01T09:00:00Z") },
    ],
  ])("rejects news without its %s", async (_field, data) => {
    await expect(createArticle(await categoryId(), data)).rejects.toThrow(
      "Article_news_has_source",
    );
  });

  it("rejects news dated other than by its source", async () => {
    await expect(
      createArticle(await categoryId(), {
        sourcePublishedAt: new Date("2026-09-01T09:00:00Z"),
        datedAt: new Date("2026-09-02T09:00:00Z"),
      }),
    ).rejects.toThrow("Article_news_has_source");
  });

  it("accepts an explainer without a source, dated on its own", async () => {
    const datedAt = new Date("2026-10-27T09:00:00Z");
    const explainer = await createExplainer(await categoryId(), { datedAt });

    expect(explainer).toMatchObject({
      kind: "EXPLAINER",
      sourceName: null,
      sourceUrl: null,
      sourcePublishedAt: null,
      sourceLicence: null,
      datedAt,
    });
  });

  it.each<[string, Partial<Prisma.ArticleUncheckedCreateInput>]>([
    ["source name", { sourceName: "A source" }],
    ["source address", { sourceUrl: "https://www.example.org/story" }],
    [
      "source publication time",
      { sourcePublishedAt: new Date("2026-09-01T09:00:00Z") },
    ],
    ["source licence", { sourceLicence: "OGL_3_0" }],
  ])("rejects an explainer with a %s", async (_field, data) => {
    await expect(createExplainer(await categoryId(), data)).rejects.toThrow(
      "Article_explainer_has_no_source",
    );
  });
});

describe("explainer references", () => {
  function createReference(
    articleId: string,
    data: Partial<Prisma.ArticleReferenceUncheckedCreateInput> = {},
  ) {
    return db.articleReference.create({
      data: {
        articleId,
        order: 1,
        title: "Tool libraries",
        publisher: "Example Encyclopedia",
        url: "https://www.example.org/libraries",
        checkedAt: new Date("2026-10-27"),
        ...data,
      },
    });
  }

  it("stores the day a reference was checked, without a time", async () => {
    const explainer = await createExplainer(await categoryId());

    const reference = await createReference(explainer.id, {
      checkedAt: new Date("2026-10-27T23:30:00Z"),
    });

    expect(reference.checkedAt).toEqual(new Date("2026-10-27T00:00:00Z"));
  });

  it.each([0, -1])("rejects reference order %i", async (order) => {
    const explainer = await createExplainer(await categoryId());

    await expect(createReference(explainer.id, { order })).rejects.toThrow(
      "ArticleReference_order_positive",
    );
  });

  it.each(["title", "publisher", "url"] as const)(
    "rejects a blank %s",
    async (field) => {
      const explainer = await createExplainer(await categoryId());

      await expect(
        createReference(explainer.id, { [field]: " \t\n" }),
      ).rejects.toThrow(`ArticleReference_${field}_not_blank`);
    },
  );

  it("rejects a duplicate order within one article only", async () => {
    const id = await categoryId();
    const first = await createExplainer(id);
    const second = await createExplainer(id);

    await createReference(first.id);
    await createReference(second.id);

    await expect(createReference(first.id)).rejects.toThrow(
      "ArticleReference_articleId_order_key",
    );
  });

  it("is deleted with its article", async () => {
    const explainer = await createExplainer(await categoryId());
    await createReference(explainer.id);

    await db.article.delete({ where: { id: explainer.id } });

    expect(await db.articleReference.count()).toBe(0);
  });
});
