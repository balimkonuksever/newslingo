import { expect, indexedArticles, site, test } from "./site";

// The reader's journeys on the static site, with the published articles.
// tests/e2e covers the same features in depth on the local server.

const articles = indexedArticles();
const [article] = articles;

test("filters the homepage in the browser, with a shareable address", async ({
  page,
}) => {
  const level = article.difficulty;
  const expected = articles.filter(({ difficulty }) => difficulty === level);

  await page.goto(site("/"));
  await page.getByText("Filter by category, level, length or date").click();
  await page.getByLabel("Level").selectOption(level);
  await page.getByRole("button", { name: "Show articles" }).click();

  await expect(page).toHaveURL(site(`/?level=${level}`));
  const results = page.getByRole("region", { name: "Matching articles" });
  await expect(results.getByRole("article")).toHaveCount(expected.length);

  await page.reload();
  await expect(page.getByLabel("Level")).toHaveValue(level);
  await expect(results.getByRole("article")).toHaveCount(expected.length);
});

test("opens an article from the homepage without loading a new document", async ({
  page,
}) => {
  await page.goto(site("/"));
  await page.evaluate(() => {
    (window as unknown as { sameDocument: boolean }).sameDocument = true;
  });

  await page.getByRole("link", { name: article.title }).first().click();

  await expect(page).toHaveURL(site(`/article/${article.slug}/`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    article.title,
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { sameDocument?: boolean }).sameDocument,
    ),
  ).toBe(true);
});

test("looks words up in the article's word file, fetched at the first click", async ({
  page,
}) => {
  const wordFiles: string[] = [];

  page.on("request", (request) => {
    const { pathname } = new URL(request.url());

    if (pathname.startsWith(site("/words/"))) {
      wordFiles.push(pathname);
    }
  });

  await page.goto(site(`/article/${article.slug}/`));
  await page.waitForLoadState("networkidle");
  expect(wordFiles).toEqual([]);

  const words = page.locator('[data-pair="1"] [data-w]');
  const card = page.getByRole("dialog");

  for (const word of [words.first(), words.nth(1)]) {
    await word.click();
    await expect(
      card.getByRole("heading", { name: await word.innerText() }),
    ).toBeVisible();
    await expect(
      card.getByText(/isn’t in the dictionary yet|can’t be looked up/),
    ).toHaveCount(0);
    await card.getByRole("button", { name: "Close" }).click();
  }

  expect(wordFiles).toEqual([site(`/words/${article.slug}.json`)]);
});

test("hides and shows the Turkish translation", async ({ page }) => {
  await page.goto(site(`/article/${article.slug}/`));

  const toggle = page.getByRole("button", { name: "Turkish translation" });
  const turkish = page.locator('[data-lang="tr"] p[lang="tr"]').first();

  await expect(turkish).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(turkish).toBeHidden();
  await toggle.click();
  await expect(turkish).toBeVisible();
});

test("finds an article by a word of its title", async ({ page }) => {
  const [word] = article.title
    .split(/\s+/)
    .map((part) => part.replace(/[^\p{L}\p{N}]/gu, ""))
    .sort((a, b) => b.length - a.length);

  await page.goto(site("/search/"));
  await page.getByLabel("Topic, name or word").fill(word);
  await page.getByLabel("Topic, name or word").press("Enter");

  await expect(page).toHaveURL(site(`/search/?q=${word}`));
  await expect(
    page
      .getByRole("region", { name: `Results for “${word}”` })
      .getByRole("link", { name: article.title }),
  ).toBeVisible();
});
