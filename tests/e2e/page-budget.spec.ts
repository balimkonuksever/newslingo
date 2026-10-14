import { expect, test } from "@playwright/test";

import { DEMO_ARTICLES } from "../../prisma/fixtures/articles";
import { countWords } from "../../src/lib/reading-time";

// The article page budget (IMPLEMENTATION_PLAN.md §17), set for the longest
// article the product spec allows, C1 at 900 English words: at most 1,500
// elements, a 50 KB HTML download and 175 KB of JavaScript. Every English
// word is one element, so the element limit grows with the article and the
// download limits do not.
const ELEMENTS_BESIDES_WORDS = 600;
const MAX_HTML_BYTES = 50 * 1024;
const MAX_SCRIPT_BYTES = 175 * 1024;

for (const article of DEMO_ARTICLES) {
  const words = article.paragraphs.reduce(
    (total, { english }) => total + countWords(english),
    0,
  );

  test(`/article/${article.slug} stays within the page budget`, async ({
    page,
  }) => {
    await page.goto(`/article/${article.slug}`);
    await page.waitForLoadState("networkidle");

    // Compressed sizes as sent over the network, headers included.
    const size = await page.evaluate(() => {
      const [navigation] = performance.getEntriesByType(
        "navigation",
      ) as PerformanceNavigationTiming[];
      const scripts = (
        performance.getEntriesByType("resource") as PerformanceResourceTiming[]
      ).filter(({ name }) => new URL(name).pathname.endsWith(".js"));

      return {
        elements: document.getElementsByTagName("*").length,
        html: navigation.transferSize,
        scripts: scripts.reduce(
          (total, entry) => total + entry.transferSize,
          0,
        ),
      };
    });

    expect(size.elements).toBeLessThanOrEqual(words + ELEMENTS_BESIDES_WORDS);
    expect(size.html).toBeLessThanOrEqual(MAX_HTML_BYTES);
    expect(size.scripts).toBeLessThanOrEqual(MAX_SCRIPT_BYTES);
  });
}
