import { afterEach, describe, expect, it, vi } from "vitest";

import type { WordFile } from "@/domain/word-file";

import { clearWordFiles, fetchDictionaryEntry } from "./lookup-client";

// "Costs will rise" with "rise" at 11–15: an entry for "rise", none for "will".
const rise = {
  lemma: "rise",
  partOfSpeech: "verb",
  englishDefinition: "To go up.",
  turkishMeaning: "yükselmek",
  exampleSentence: null,
  ipa: null,
};
const wordFile: WordFile = {
  entries: [rise],
  words: { "1:0": [null, "Costs"], "1:6": [null, "will"], "1:11": [0, "rise"] },
};
const request = { articleSlug: "costs", paragraphOrder: 1, start: 11, end: 15 };

/** Makes `fetch` return a response, or throw anything else. */
function respondWith(response: Response | Error | DOMException) {
  const fetch = vi.fn(async () => {
    if (!(response instanceof Response)) {
      throw response;
    }
    return response.clone();
  });
  vi.stubGlobal("fetch", fetch);

  return fetch;
}

describe("fetchDictionaryEntry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearWordFiles();
  });

  it("fetches the article's word file once, for every lookup in it", async () => {
    const fetch = respondWith(Response.json(wordFile));

    await fetchDictionaryEntry(request);
    await fetchDictionaryEntry({ ...request, start: 6, end: 10 });

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith("/words/costs.json");
  });

  it("returns the word's entry, or no_entry for a word without one", async () => {
    respondWith(Response.json(wordFile));

    await expect(fetchDictionaryEntry(request)).resolves.toEqual({
      entry: { word: "rise", ...rise },
    });
    await expect(
      fetchDictionaryEntry({ ...request, start: 6, end: 10 }),
    ).resolves.toEqual({ error: "no_entry" });
  });

  it("returns not_found for a range that is not a word, or an unknown article", async () => {
    respondWith(Response.json(wordFile));

    await expect(
      fetchDictionaryEntry({ ...request, start: 12, end: 15 }),
    ).resolves.toEqual({ error: "not_found" });
    await expect(
      fetchDictionaryEntry({ ...request, end: 14 }),
    ).resolves.toEqual({ error: "not_found" });

    respondWith(Response.json({ error: "not_found" }, { status: 404 }));
    await expect(
      fetchDictionaryEntry({ ...request, articleSlug: "missing" }),
    ).resolves.toEqual({ error: "not_found" });
  });

  it("treats a failed network or an unreadable file as unavailable, and tries again next time", async () => {
    respondWith(new TypeError("Failed to fetch"));
    await expect(fetchDictionaryEntry(request)).resolves.toEqual({
      error: "unavailable",
    });

    respondWith(new Response("<html>Bad gateway</html>", { status: 502 }));
    await expect(fetchDictionaryEntry(request)).resolves.toEqual({
      error: "unavailable",
    });

    respondWith(Response.json(wordFile));
    await expect(fetchDictionaryEntry(request)).resolves.toEqual({
      entry: { word: "rise", ...rise },
    });
  });

  it("rejects when the caller aborts", async () => {
    const controller = new AbortController();
    controller.abort(new DOMException("Aborted", "AbortError"));
    respondWith(Response.json(wordFile));

    await expect(
      fetchDictionaryEntry(request, controller.signal),
    ).rejects.toThrow("Aborted");
  });
});
