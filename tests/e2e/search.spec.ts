import { expect, type Page, test } from "@playwright/test";

import { DEMO_ARTICLES } from "../../prisma/fixtures/articles";

// The global setup resets the test database to exactly the demo dataset.
// Search runs in the browser over `/search-index.json` (M9).

const SEARCH_INDEX = "**/search-index.json";

const bakery = DEMO_ARTICLES.find(({ slug }) =>
  slug.startsWith("bakery-delivers-bread"),
)!;

/** Collects every request for the search index the page makes. */
function indexRequests(page: Page) {
  const requests: string[] = [];

  page.on("request", (request) => {
    const { pathname } = new URL(request.url());

    if (pathname.endsWith("/search-index.json")) {
      requests.push(pathname);
    }
  });

  return requests;
}

const results = (page: Page, query: string) =>
  page.getByRole("region", { name: `Results for “${query}”` });

test("searches from the header through a shareable URL", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Search" }).click();
  await expect(page).toHaveURL("/search");

  await page.getByLabel("Topic, name or word").fill("bicycle");
  await page.getByLabel("Topic, name or word").press("Enter");

  await expect(page).toHaveURL("/search?q=bicycle");
  await expect(
    results(page, "bicycle").getByRole("article").first(),
  ).toContainText(bakery.title);

  await page.reload();
  await expect(page.getByLabel("Topic, name or word")).toHaveValue("bicycle");
  await expect(
    results(page, "bicycle").getByRole("article").first(),
  ).toContainText(bakery.title);

  await results(page, "bicycle")
    .getByRole("link", { name: bakery.title })
    .click();
  await expect(page).toHaveURL(`/article/${bakery.slug}`);
});

test("fetches the index once, only on the search page", async ({ page }) => {
  const requests = indexRequests(page);

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(requests).toEqual([]);

  await page.goto("/search?q=bicycle");
  await expect(results(page, "bicycle")).toBeVisible();

  const field = page.getByLabel("Topic, name or word");
  await field.fill("cinema");
  await field.press("Enter");
  await expect(results(page, "cinema")).toBeVisible();

  expect(requests).toEqual(["/search-index.json"]);
});

test("finds an article by a word in its Turkish translation", async ({
  page,
}) => {
  await page.goto("/search?q=bisiklet");

  await expect(
    results(page, "bisiklet").getByRole("article").first(),
  ).toContainText(bakery.title);
});

test("announces the number of results", async ({ page }) => {
  await page.goto("/search?q=bicycle");

  await expect(
    page.getByText(/^\d+ articles? match(es)? “bicycle”\.$/u),
  ).toBeAttached();
});

test("shows an empty state when nothing matches", async ({ page }) => {
  await page.goto("/search?q=zzqx");

  await expect(
    page.getByText("No articles match “zzqx”").first(),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: /^Results for/u })).toHaveCount(
    0,
  );
});

test("shows only the form for an empty query", async ({ page }) => {
  await page.goto("/search?q=%20%20");

  await expect(page.getByLabel("Topic, name or word")).toHaveValue("");
  await expect(page.getByText("Searching…")).toHaveCount(0);
  await expect(page.getByRole("region", { name: /^Results for/u })).toHaveCount(
    0,
  );
});

test("offers to try again when the index cannot load", async ({ page }) => {
  let failures = 0;
  await page.route(SEARCH_INDEX, async (route) => {
    if (failures === 0) {
      failures += 1;
      await route.fulfill({ status: 503, body: "" });
    } else {
      await route.continue();
    }
  });

  await page.goto("/search?q=bicycle");
  await expect(page.getByText("Search could not load").first()).toBeVisible();

  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    results(page, "bicycle").getByRole("article").first(),
  ).toContainText(bakery.title);
});
