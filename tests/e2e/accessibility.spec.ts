import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { DEMO_ARTICLES } from "../../prisma/fixtures/articles";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Serious and critical axe violations, summarised for a readable failure. */
async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_TAGS)
    .analyze();

  return violations
    .filter(({ impact }) => impact === "serious" || impact === "critical")
    .map(({ id, help, nodes }) => `${id}: ${help} (${nodes.length} nodes)`);
}

const article = DEMO_ARTICLES[0];

for (const path of [
  "/",
  "/?level=B2",
  "/category/world",
  `/article/${article.slug}`,
  "/article/no-such-article",
]) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);

    expect(await seriousViolations(page)).toEqual([]);
  });
}

test("the open filter panel has no serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("Filter by category, level, length or date").click();
  await expect(page.getByLabel("Level")).toBeVisible();

  expect(await seriousViolations(page)).toEqual([]);
});

test("the reader with the translation hidden has no serious accessibility violations", async ({
  page,
}) => {
  await page.goto(`/article/${article.slug}`);
  await page.getByRole("button", { name: "Turkish translation" }).click();

  expect(await seriousViolations(page)).toEqual([]);
});
