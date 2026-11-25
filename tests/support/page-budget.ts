import type { Page } from "@playwright/test";

import { countWords } from "../../src/lib/reading-time";

// The article page budget (IMPLEMENTATION_PLAN.md §17), set for the longest
// article the product spec allows, C1 at 900 English words: at most 1,500
// elements, a 50 KB HTML download and 175 KB of JavaScript. Every English
// word is one element, so the element limit grows with the article and the
// download limits do not. The local server (tests/e2e) and the static site
// (tests/site) are both held to it.
export const ELEMENTS_BESIDES_WORDS = 600;
export const MAX_HTML_BYTES = 50 * 1024;
export const MAX_SCRIPT_BYTES = 175 * 1024;

/** The English words of an article's paragraphs. */
export function englishWords(paragraphs: ReadonlyArray<{ english: string }>) {
  return paragraphs.reduce(
    (total, { english }) => total + countWords(english),
    0,
  );
}

/** Compressed sizes as sent over the network, headers included. */
export function measurePage(page: Page) {
  return page.evaluate(() => {
    const [navigation] = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    const scripts = (
      performance.getEntriesByType("resource") as PerformanceResourceTiming[]
    ).filter(({ name }) => new URL(name).pathname.endsWith(".js"));

    return {
      elements: document.getElementsByTagName("*").length,
      html: navigation.transferSize,
      scripts: scripts.reduce((total, entry) => total + entry.transferSize, 0),
    };
  });
}
