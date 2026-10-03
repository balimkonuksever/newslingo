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
  "/category/world/expressions",
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

test("the open word card has no serious accessibility violations", async ({
  page,
}) => {
  await page.goto(`/article/${article.slug}`);
  await page.locator('[data-pair="1"] [data-w]').nth(3).click();
  await expect(
    page.getByRole("dialog").getByText("Explained by AI for this sentence."),
  ).toBeVisible();

  expect(await seriousViolations(page)).toEqual([]);
});

test("the open expression card has no serious accessibility violations", async ({
  page,
}) => {
  await page.goto(
    "/article/old-cinema-reopens-with-films-chosen-by-neighbours",
  );
  await page.locator('[data-e="sell-out"]').click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "sell out" }),
  ).toBeVisible();

  expect(await seriousViolations(page)).toEqual([]);
});

test("an opened Real English row has no serious accessibility violations", async ({
  page,
}) => {
  await page.goto(
    "/article/old-cinema-reopens-with-films-chosen-by-neighbours",
  );
  const section = page.getByRole("region", {
    name: "Real English from this article",
  });
  await section.locator("summary").last().click();
  await expect(
    section.locator("details").last().getByText("Watch out:"),
  ).toBeVisible();

  expect(await seriousViolations(page)).toEqual([]);
});
