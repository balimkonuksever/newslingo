import { afterEach, describe, expect, it, vi } from "vitest";

import type { SearchIndex } from "@/domain/search-index";

import { clearArticleSearch, loadArticleSearch } from "./search-client";

const index: SearchIndex = {
  articles: [
    {
      slug: "rubbish-in-space",
      title: "Rubbish in Space",
      shortSummary: "A spacecraft will catch old satellites.",
      difficulty: "B1",
      kind: "NEWS",
      sourceName: "GOV.UK",
      datedAt: "2026-10-15T09:00:00.000Z",
      readingTimeMinutes: 2,
      category: { slug: "technology", name: "Technology" },
      referencePublishers: [],
      english: "catch satellites spacecraft",
      turkish: "uydular uzay",
    },
  ],
};

/** Makes `fetch` return each response in turn, or throw an error. */
function respondWith(...responses: Array<Response | Error>) {
  const fetch = vi.fn(async () => {
    const response = responses.shift();

    if (!(response instanceof Response)) {
      throw response;
    }
    return response;
  });
  vi.stubGlobal("fetch", fetch);

  return fetch;
}

describe("loadArticleSearch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearArticleSearch();
  });

  it("fetches the index once and searches it", async () => {
    const fetch = respondWith(Response.json(index));

    const search = await loadArticleSearch();
    await loadArticleSearch();

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith("/search-index.json");
    expect(search("uzay")).toEqual([
      { ...index.articles[0], datedAt: new Date("2026-10-15T09:00:00.000Z") },
    ]);
  });

  it.each([
    ["a network failure", new TypeError("Failed to fetch")],
    ["a server error", new Response("", { status: 503 })],
    ["an unreadable index", Response.json({ articles: "none" })],
  ])("rejects after %s, and fetches again next time", async (_, failure) => {
    const fetch = respondWith(failure, Response.json(index));

    await expect(loadArticleSearch()).rejects.toThrow();
    await expect(loadArticleSearch()).resolves.toBeTypeOf("function");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
