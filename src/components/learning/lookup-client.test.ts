import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchDictionaryEntry } from "./lookup-client";

const request = { articleSlug: "costs", paragraphOrder: 1, start: 29, end: 33 };

/** Makes `fetch` return a response, or throw anything else. */
function respondWith(response: Response | Error | DOMException) {
  const fetch = vi.fn(async () => {
    if (!(response instanceof Response)) {
      throw response;
    }
    return response;
  });
  vi.stubGlobal("fetch", fetch);

  return fetch;
}

describe("fetchDictionaryEntry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the word's position as JSON", async () => {
    const fetch = respondWith(Response.json({ error: "not_found" }));

    await fetchDictionaryEntry(request);

    expect(fetch).toHaveBeenCalledWith("/api/dictionary", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal: undefined,
    });
  });

  it("returns the route's entry or error", async () => {
    const entry = { word: "rise", englishDefinition: "To go up." };

    respondWith(Response.json({ entry }));
    await expect(fetchDictionaryEntry(request)).resolves.toEqual({ entry });

    respondWith(Response.json({ error: "rate_limited" }, { status: 429 }));
    await expect(fetchDictionaryEntry(request)).resolves.toEqual({
      error: "rate_limited",
    });
  });

  it("treats a failed network or an unexpected reply as unavailable", async () => {
    respondWith(new TypeError("Failed to fetch"));
    await expect(fetchDictionaryEntry(request)).resolves.toEqual({
      error: "unavailable",
    });

    respondWith(new Response("<html>Bad gateway</html>", { status: 502 }));
    await expect(fetchDictionaryEntry(request)).resolves.toEqual({
      error: "unavailable",
    });
  });

  it("rejects when the caller aborts", async () => {
    const controller = new AbortController();
    controller.abort();
    respondWith(new DOMException("Aborted", "AbortError"));

    await expect(
      fetchDictionaryEntry(request, controller.signal),
    ).rejects.toThrow("Aborted");
  });
});
