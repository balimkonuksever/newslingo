import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { EDITORIAL_SOURCE } from "@/domain/dictionary";
import { hashContext } from "@/lib/text/context-hash";
import { buildLookupContext } from "@/lib/text/lookup-context";
import { db } from "@/server/db/client";
import { fixtureDictionaryProvider } from "@/server/dictionary/fixture-provider";
import type { LookupLogEvent } from "@/server/dictionary/log";
import {
  type LookupDependencies,
  lookupWord,
} from "@/server/dictionary/lookup";
import {
  type DictionaryProvider,
  DictionaryProviderError,
  type ProviderInput,
} from "@/server/dictionary/provider";
import { createRateLimiter } from "@/server/dictionary/rate-limit";

import {
  createArticle,
  createCategory,
  createVocabularyEntry,
  resetDatabase,
} from "./database";

const PARAGRAPHS = [
  "The minister said costs will rise sharply next year.",
  "Sea levels rise as the ice melts. Prices rise too.",
];

beforeEach(resetDatabase);

async function createArticleWithParagraphs(
  data: Parameters<typeof createArticle>[1] = {},
  category: { isActive?: boolean } = {},
) {
  const { id: categoryId } = await createCategory(category);
  const article = await createArticle(categoryId, { slug: "costs", ...data });

  await db.articleParagraph.createMany({
    data: PARAGRAPHS.map((english, index) => ({
      articleId: article.id,
      order: index + 1,
      english,
      turkish: "Türkçe çeviri.",
    })),
  });

  return article;
}

/** The request for the `occurrence`-th `word` in paragraph `order`. */
function wordAt(order: number, word: string, occurrence = 0) {
  const text = PARAGRAPHS[order - 1];
  let start = -1;
  for (let found = 0; found <= occurrence; found += 1) {
    start = text.indexOf(word, start + 1);
  }

  return {
    articleSlug: "costs",
    paragraphOrder: order,
    start,
    end: start + word.length,
  };
}

/** Wraps a provider so tests can count its calls and read the log. */
function setup(
  provider: DictionaryProvider = fixtureDictionaryProvider,
  options: Pick<LookupDependencies, "cacheOnly" | "providerLimiter"> = {},
) {
  const lookup = vi.fn((input: ProviderInput) => provider.lookup(input));
  const events: LookupLogEvent[] = [];
  const dependencies: LookupDependencies = {
    provider: { name: provider.name, version: provider.version, lookup },
    log: (event) => events.push(event),
    ...options,
  };

  return {
    dependencies,
    lookup,
    events,
    outcomes: () => events.map(({ outcome }) => outcome),
  };
}

function failingProvider(error: Error): DictionaryProvider {
  return {
    name: "failing",
    version: "1",
    lookup: async () => {
      throw error;
    },
  };
}

describe("lookupWord", () => {
  it("asks the provider once, then serves the word from the cache", async () => {
    await createArticleWithParagraphs();
    const { dependencies, lookup, outcomes } = setup();
    const context = "The minister said costs will ⟦rise⟧ sharply next year.";

    const first = await lookupWord(wordAt(1, "rise"), dependencies);
    const second = await lookupWord(wordAt(1, "rise"), dependencies);

    expect(first).toEqual({
      entry: {
        word: "rise",
        lemma: "rise",
        partOfSpeech: "noun",
        englishDefinition: "Fixture definition of “rise”.",
        turkishMeaning: "“rise” için örnek anlam",
        exampleSentence: "This is a fixture example for “rise”.",
        ipa: "/ˈfɪkstʃə/",
      },
    });
    expect(second).toEqual(first);
    expect(lookup).toHaveBeenCalledOnce();
    expect(lookup).toHaveBeenCalledWith({ word: "rise", context });
    expect(outcomes()).toEqual(["provider_hit", "cache_hit"]);

    await expect(db.vocabularyEntry.findMany()).resolves.toEqual([
      expect.objectContaining({
        surfaceWord: "rise",
        normalizedWord: "rise",
        contextSentence: context,
        contextHash: createHash("sha256").update(context).digest("hex"),
        provider: "fixture",
        providerVersion: "1",
        schemaVersion: 1,
      }),
    ]);
  });

  it("looks a word up again in a different sentence", async () => {
    await createArticleWithParagraphs();
    const { dependencies, lookup } = setup();

    await lookupWord(wordAt(2, "rise", 0), dependencies);
    await lookupWord(wordAt(2, "rise", 1), dependencies);

    expect(lookup.mock.calls.map(([input]) => input.context)).toEqual([
      "Sea levels ⟦rise⟧ as the ice melts.",
      "Prices ⟦rise⟧ too.",
    ]);
    await expect(db.vocabularyEntry.count()).resolves.toBe(2);
  });

  it("keeps each provider version's entries apart", async () => {
    await createArticleWithParagraphs();
    const next = setup({ ...fixtureDictionaryProvider, version: "2" });

    await lookupWord(wordAt(1, "rise"), setup().dependencies);
    await lookupWord(wordAt(1, "rise"), next.dependencies);

    expect(next.lookup).toHaveBeenCalledOnce();
    await expect(db.vocabularyEntry.count()).resolves.toBe(2);
  });

  it.each([
    ["a draft article", { status: "DRAFT" as const }, {}, wordAt(1, "rise")],
    ["an inactive category", {}, { isActive: false }, wordAt(1, "rise")],
    [
      "an unknown article",
      {},
      {},
      { ...wordAt(1, "rise"), articleSlug: "nope" },
    ],
    [
      "a missing paragraph",
      {},
      {},
      { ...wordAt(1, "rise"), paragraphOrder: 3 },
    ],
    ["part of a word", {}, {}, { ...wordAt(1, "rise"), end: 32 }],
    ["two words", {}, {}, { ...wordAt(1, "rise"), end: 41 }],
  ])("finds nothing in %s", async (_, article, category, request) => {
    await createArticleWithParagraphs(article, category);
    const { dependencies, lookup, outcomes } = setup();

    await expect(lookupWord(request, dependencies)).resolves.toEqual({
      error: "not_found",
    });
    expect(lookup).not.toHaveBeenCalled();
    expect(outcomes()).toEqual(["not_found"]);
  });

  it("serves cached entries but looks up nothing new when cache-only", async () => {
    await createArticleWithParagraphs();
    await lookupWord(wordAt(1, "rise"), setup().dependencies);
    const { dependencies, lookup, outcomes } = setup(
      fixtureDictionaryProvider,
      { cacheOnly: true },
    );

    await expect(
      lookupWord(wordAt(1, "rise"), dependencies),
    ).resolves.toHaveProperty("entry.word", "rise");
    await expect(lookupWord(wordAt(1, "costs"), dependencies)).resolves.toEqual(
      { error: "no_entry" },
    );
    expect(lookup).not.toHaveBeenCalled();
    expect(outcomes()).toEqual(["cache_hit", "cache_only"]);
  });

  it("serves an editorial entry before asking any provider", async () => {
    await createArticleWithParagraphs();
    const { context } = buildLookupContext(PARAGRAPHS[0], 29, 33)!;
    await createVocabularyEntry({
      surfaceWord: "rise",
      normalizedWord: "rise",
      lemma: "rise",
      turkishMeaning: "artmak",
      contextSentence: context,
      contextHash: hashContext(context),
      provider: EDITORIAL_SOURCE.provider,
      providerVersion: EDITORIAL_SOURCE.version,
    });
    const { dependencies, lookup, outcomes } = setup();

    await expect(
      lookupWord(wordAt(1, "rise"), dependencies),
    ).resolves.toHaveProperty("entry.turkishMeaning", "artmak");
    expect(lookup).not.toHaveBeenCalled();
    expect(outcomes()).toEqual(["editorial_hit"]);
  });

  it("reports a word without an entry when no provider is configured", async () => {
    await createArticleWithParagraphs();
    const events: LookupLogEvent[] = [];

    await expect(
      lookupWord(wordAt(1, "rise"), {
        provider: null,
        log: (event) => events.push(event),
      }),
    ).resolves.toEqual({ error: "no_entry" });
    expect(events).toEqual([
      expect.objectContaining({
        outcome: "no_entry",
        provider: "none",
        providerVersion: "none",
      }),
    ]);
  });

  it.each([
    ["rate_limited", "rate_limited"],
    ["unavailable", "unavailable"],
    ["refused", "unavailable"],
    ["invalid_output", "unavailable"],
  ] as const)(
    "reports a provider's %s failure as %s and caches nothing",
    async (kind, error) => {
      await createArticleWithParagraphs();
      const { dependencies, events } = setup(
        failingProvider(new DictionaryProviderError(kind, "failed")),
      );

      await expect(
        lookupWord(wordAt(1, "rise"), dependencies),
      ).resolves.toEqual({ error });
      expect(events).toEqual([
        expect.objectContaining({ outcome: "provider_error", errorKind: kind }),
      ]);
      await expect(db.vocabularyEntry.count()).resolves.toBe(0);
    },
  );

  it.each([
    ["a blank definition", { englishDefinition: " " }],
    ["an unknown part of speech", { partOfSpeech: "thing" }],
    ["an overlong meaning", { turkishMeaning: "ç".repeat(201) }],
    ["a missing field", { ipa: undefined }],
  ])("rejects an answer with %s", async (_, change) => {
    await createArticleWithParagraphs();
    const provider: DictionaryProvider = {
      ...fixtureDictionaryProvider,
      async lookup(input) {
        const { output, usage } = await fixtureDictionaryProvider.lookup(input);
        return { output: { ...(output as object), ...change }, usage };
      },
    };
    const { dependencies, events } = setup(provider);

    await expect(lookupWord(wordAt(1, "rise"), dependencies)).resolves.toEqual({
      error: "unavailable",
    });
    expect(events[0]).toMatchObject({ errorKind: "invalid_output" });
    await expect(db.vocabularyEntry.count()).resolves.toBe(0);
  });

  it("lets unexpected errors reach the caller", async () => {
    await createArticleWithParagraphs();
    const { dependencies } = setup(failingProvider(new Error("bug")));

    await expect(lookupWord(wordAt(1, "rise"), dependencies)).rejects.toThrow(
      "bug",
    );
  });

  it("stops asking the provider at the provider-call limit", async () => {
    await createArticleWithParagraphs();
    const { dependencies, lookup, outcomes } = setup(
      fixtureDictionaryProvider,
      { providerLimiter: createRateLimiter({ limit: 1, windowMs: 60_000 }) },
    );

    await lookupWord(wordAt(1, "rise"), dependencies);

    await expect(lookupWord(wordAt(1, "costs"), dependencies)).resolves.toEqual(
      { error: "rate_limited" },
    );
    // Cached words do not count against the limit.
    await expect(
      lookupWord(wordAt(1, "rise"), dependencies),
    ).resolves.toHaveProperty("entry");
    expect(lookup).toHaveBeenCalledOnce();
    expect(outcomes()).toEqual([
      "provider_hit",
      "provider_limited",
      "cache_hit",
    ]);
  });

  it("shares one provider call between simultaneous lookups", async () => {
    await createArticleWithParagraphs();
    let release!: () => void;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const slow: DictionaryProvider = {
      ...fixtureDictionaryProvider,
      async lookup(input) {
        await released;
        return fixtureDictionaryProvider.lookup(input);
      },
    };
    const { dependencies, lookup, outcomes } = setup(slow);

    const lookups = Promise.all([
      lookupWord(wordAt(1, "rise"), dependencies),
      lookupWord(wordAt(1, "rise"), dependencies),
    ]);
    await vi.waitFor(() => expect(lookup).toHaveBeenCalled());
    release();
    const [first, second] = await lookups;

    expect(first).toEqual(second);
    expect(first).toHaveProperty("entry.word", "rise");
    expect(lookup).toHaveBeenCalledOnce();
    expect(outcomes().toSorted()).toEqual(["joined", "provider_hit"]);
  });

  it("logs outcomes without the reader's word or sentence", async () => {
    await createArticleWithParagraphs();
    const { dependencies, events } = setup();

    await lookupWord(wordAt(1, "rise"), dependencies);
    await lookupWord(wordAt(1, "rise"), dependencies);

    const logged = JSON.stringify(events);
    expect(logged).not.toContain("rise");
    expect(logged).not.toContain("minister");
    expect(events[0]).toEqual({
      outcome: "provider_hit",
      provider: "fixture",
      providerVersion: "1",
      latencyMs: expect.any(Number),
      usage: null,
    });
  });
});
