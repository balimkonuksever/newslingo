import { beforeEach, describe, expect, it } from "vitest";

import { wordFileResponse } from "@/app/words/[file]/word-file-response";
import type { WordFile } from "@/domain/word-file";
import { db } from "@/server/db/client";
import { lookupWord } from "@/server/dictionary/lookup";
import { buildWordFile } from "@/server/dictionary/word-file";

import { DEMO_ARTICLES } from "../../prisma/fixtures/articles";
import { DEMO_DRAFTS } from "../../prisma/fixtures/drafts";
import {
  provisionReferenceData,
  seedDemoArticles,
  seedDemoDictionary,
  seedDemoDrafts,
} from "../../prisma/seeders";
import { resetDatabase } from "./database";

// Word files (M9): each public article's words with the entries a lookup
// returns, so the static site answers lookups without a server.

beforeEach(async () => {
  await resetDatabase();
  await provisionReferenceData(db);
  await seedDemoArticles(db);
  await seedDemoDictionary(db);
});

describe("buildWordFile", () => {
  it("gives every word the entry a lookup returns for it", async () => {
    const { slug } = DEMO_ARTICLES[0];
    const file = (await buildWordFile(slug)) as WordFile;
    const keys = Object.keys(file.words);

    expect(keys.length).toBeGreaterThan(100);

    for (const key of keys) {
      const [paragraphOrder, start] = key.split(":").map(Number);
      const [index, word] = file.words[key];
      const lookup = await lookupWord(
        { articleSlug: slug, paragraphOrder, start, end: start + word.length },
        { provider: null, log: () => {} },
      );

      expect(
        index === null ? lookup : { entry: { word, ...file.entries[index] } },
        key,
      ).toEqual(lookup);
    }
  });

  it("holds each distinct entry once", async () => {
    const file = (await buildWordFile(DEMO_ARTICLES[0].slug)) as WordFile;
    const contents = file.entries.map((entry) => JSON.stringify(entry));

    expect(new Set(contents).size).toBe(contents.length);
    expect(file.entries.length).toBeLessThan(Object.keys(file.words).length);
  });

  it("has no file for a draft or an unknown article", async () => {
    await seedDemoDrafts(db);

    await expect(buildWordFile(DEMO_DRAFTS[0].slug)).resolves.toBeNull();
    await expect(buildWordFile("no-such-article")).resolves.toBeNull();
  });
});

describe("wordFileResponse", () => {
  it("answers <slug>.json with the word file", async () => {
    const { slug } = DEMO_ARTICLES[0];
    const response = await wordFileResponse(`${slug}.json`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(await buildWordFile(slug));
  });

  it.each(["no-such-article.json", DEMO_ARTICLES[0].slug, "Bad Slug.json"])(
    "answers %s with 404",
    async (file) => {
      const response = await wordFileResponse(file);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "not_found" });
    },
  );
});
