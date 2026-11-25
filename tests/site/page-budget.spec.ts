import { WRITTEN_ARTICLES } from "../../prisma/editorial/articles";
import {
  ELEMENTS_BESIDES_WORDS,
  englishWords,
  MAX_HTML_BYTES,
  MAX_SCRIPT_BYTES,
  measurePage,
} from "../support/page-budget";
import { expect, site, test } from "./site";

// The page budget (tests/support/page-budget.ts) on the static site, whose
// server compresses as GitHub Pages does.
for (const article of WRITTEN_ARTICLES.filter(
  ({ publishedOnSite }) => publishedOnSite,
)) {
  const path = site(`/article/${article.slug}/`);

  test(`${path} stays within the page budget`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    const size = await measurePage(page);

    expect(size.elements).toBeLessThanOrEqual(
      englishWords(article.paragraphs) + ELEMENTS_BESIDES_WORDS,
    );
    expect(size.html).toBeLessThanOrEqual(MAX_HTML_BYTES);
    expect(size.scripts).toBeLessThanOrEqual(MAX_SCRIPT_BYTES);
  });
}

test(`${site("/search/")} stays within the page budget, showing every article`, async ({
  page,
}) => {
  await page.goto(site("/search/?q=the"));
  await expect(
    page.getByRole("region", { name: "Results for “the”" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");

  const size = await measurePage(page);

  expect(size.html).toBeLessThanOrEqual(MAX_HTML_BYTES);
  expect(size.scripts).toBeLessThanOrEqual(MAX_SCRIPT_BYTES);
});
