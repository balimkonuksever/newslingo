import { expect, test } from "@playwright/test";

import { DEMO_ARTICLES } from "../../prisma/fixtures/articles";
import {
  ELEMENTS_BESIDES_WORDS,
  englishWords,
  MAX_HTML_BYTES,
  MAX_SCRIPT_BYTES,
  measurePage,
} from "../support/page-budget";

for (const article of DEMO_ARTICLES) {
  const words = englishWords(article.paragraphs);

  test(`/article/${article.slug} stays within the page budget`, async ({
    page,
  }) => {
    await page.goto(`/article/${article.slug}`);
    await page.waitForLoadState("networkidle");

    const size = await measurePage(page);

    expect(size.elements).toBeLessThanOrEqual(words + ELEMENTS_BESIDES_WORDS);
    expect(size.html).toBeLessThanOrEqual(MAX_HTML_BYTES);
    expect(size.scripts).toBeLessThanOrEqual(MAX_SCRIPT_BYTES);
  });
}

// The search index's own size is checked in tests/integration/search-index.test.ts.
test("/search stays within the page budget, showing every article", async ({
  page,
}) => {
  await page.goto("/search?q=the");
  await expect(
    page.getByRole("region", { name: "Results for “the”" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");

  const size = await measurePage(page);

  expect(size.html).toBeLessThanOrEqual(MAX_HTML_BYTES);
  expect(size.scripts).toBeLessThanOrEqual(MAX_SCRIPT_BYTES);
});
