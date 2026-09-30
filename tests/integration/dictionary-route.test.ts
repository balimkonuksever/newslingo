import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/dictionary/route";
import { db } from "@/server/db/client";

import { createArticle, createCategory, resetDatabase } from "./database";

const PARAGRAPH = "The minister said costs will rise sharply next year.";
const RISE = { articleSlug: "costs", paragraphOrder: 1, start: 29, end: 33 };

beforeAll(() => {
  // `pnpm test:integration` already forces the fixture provider; say so here
  // too, because the route reads its settings on the first request.
  vi.stubEnv("DICTIONARY_PROVIDER", "fixture");
  vi.spyOn(console, "info").mockImplementation(() => {});
});

beforeEach(async () => {
  await resetDatabase();
  const { id: categoryId } = await createCategory();
  const article = await createArticle(categoryId, { slug: "costs" });
  await db.articleParagraph.create({
    data: {
      articleId: article.id,
      order: 1,
      english: PARAGRAPH,
      turkish: "Türkçe çeviri.",
    },
  });
});

// The route limits each client address, so every call gets its own address
// unless a test passes one.
let clients = 0;

function post({
  body,
  raw,
  headers = {},
}: {
  body?: unknown;
  raw?: string;
  headers?: Record<string, string>;
}) {
  clients += 1;

  return POST(
    new Request("http://localhost/api/dictionary", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `client-${clients}`,
        ...headers,
      },
      body: raw ?? JSON.stringify(body),
    }),
  );
}

describe("POST /api/dictionary", () => {
  it("returns the entry for a word in a published article", async () => {
    const response = await post({ body: RISE });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      entry: { word: "rise", lemma: "rise" },
    });
  });

  it("returns 404 for a word it cannot find", async () => {
    const response = await post({
      body: { ...RISE, articleSlug: "missing" },
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "not_found" });
  });

  it.each([
    ["malformed JSON", { raw: "{" }],
    ["a missing field", { body: { ...RISE, end: undefined } }],
    ["an extra field", { body: { ...RISE, sentence: "Free text." } }],
    ["reversed offsets", { body: { ...RISE, start: 33, end: 29 } }],
    ["an overlong word", { body: { ...RISE, start: 0, end: 65 } }],
    ["an invalid slug", { body: { ...RISE, articleSlug: "../costs" } }],
    [
      "a non-JSON content type",
      { body: RISE, headers: { "content-type": "text/plain" } },
    ],
    [
      "an oversized body",
      { raw: JSON.stringify({ ...RISE, padding: "x".repeat(2_000) }) },
    ],
  ])("returns 400 for %s", async (_, request) => {
    const response = await post(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
    });
  });

  it("limits each client to 30 lookups a minute", async () => {
    const headers = { "x-forwarded-for": "192.0.2.10, 192.0.2.99" };

    for (let request = 0; request < 30; request += 1) {
      expect((await post({ body: RISE, headers })).status).toBe(200);
    }
    const limited = await post({ body: RISE, headers });

    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    await expect(limited.json()).resolves.toEqual({ error: "rate_limited" });

    // The proxy-added address decides; another client is unaffected.
    const other = await post({
      body: RISE,
      headers: { "x-forwarded-for": "192.0.2.10, 192.0.2.100" },
    });
    expect(other.status).toBe(200);
  });
});
