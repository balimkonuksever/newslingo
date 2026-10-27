import { expect, type Page, test } from "@playwright/test";

import {
  DEMO_ARTICLES,
  DEMO_SOURCE_NAME,
  type DemoExplainer,
  demoSourceUrl,
} from "../../prisma/fixtures/articles";
import { REFERENCE_CATEGORIES } from "../../prisma/reference/categories";

// The global setup resets the test database to exactly the demo dataset.

const longestArticle = DEMO_ARTICLES.reduce((longest, article) =>
  article.paragraphs.length > longest.paragraphs.length ? article : longest,
);

test.describe("discovery", () => {
  test("goes from the homepage to a category to an article", async ({
    page,
  }) => {
    const article = DEMO_ARTICLES.find(
      ({ categorySlug }) => categorySlug === "world",
    )!;

    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Learn English with today’s news",
      }),
    ).toBeVisible();

    await page
      .getByRole("navigation", { name: "Categories" })
      .getByRole("link", { name: "World", exact: true })
      .click();
    await expect(page).toHaveURL("/category/world");
    await expect(
      page.getByRole("heading", { level: 1, name: "World" }),
    ).toBeVisible();

    await page.getByRole("link", { name: article.title }).click();
    await expect(page).toHaveURL(`/article/${article.slug}`);
    await expect(
      page.getByRole("heading", { level: 1, name: article.title }),
    ).toBeVisible();
  });

  test("links every category from the navigation and the category list", async ({
    page,
  }) => {
    await page.goto("/");

    const navigation = page.getByRole("navigation", { name: "Categories" });
    const categoryList = page.getByRole("region", {
      name: "Browse by category",
    });

    for (const { slug, name } of REFERENCE_CATEGORIES) {
      for (const scope of [navigation, categoryList]) {
        await expect(
          scope.getByRole("link", { name, exact: true }),
        ).toHaveAttribute("href", `/category/${slug}`);
      }
    }
  });

  test("reaches every demo article from its category page", async ({
    page,
  }) => {
    for (const article of DEMO_ARTICLES) {
      await page.goto(`/category/${article.categorySlug}`);
      await page.getByRole("link", { name: article.title }).click();

      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        article.title,
      );
    }
  });
});

test.describe("article reader", () => {
  const article = longestArticle;

  test("follows each English paragraph with its Turkish translation", async ({
    page,
  }) => {
    await page.goto(`/article/${article.slug}`);

    const pairs = page.locator("[data-pair]");
    await expect(pairs).toHaveCount(article.paragraphs.length);

    for (const [index, { english, turkish }] of article.paragraphs.entries()) {
      const rows = pairs.nth(index).locator(":scope > [data-lang]");

      await expect(rows).toHaveCount(2);
      await expect(rows.nth(0)).toHaveAttribute("data-lang", "en");
      await expect(rows.nth(0).locator('p[lang="en"]')).toHaveText(english);
      await expect(rows.nth(1)).toHaveAttribute("data-lang", "tr");
      await expect(rows.nth(1).locator('p[lang="tr"]')).toHaveText(turkish);
    }
  });

  test("hides and shows the Turkish translation", async ({ page }) => {
    await page.goto(`/article/${article.slug}`);

    const toggle = page.getByRole("button", { name: "Turkish translation" });
    // The paragraphs' translations, not the Turkish in the Real English list.
    const turkish = page.locator('[data-lang="tr"] p[lang="tr"]');

    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(turkish.first()).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    for (const paragraph of await turkish.all()) {
      await expect(paragraph).toBeHidden();
    }
    await expect(page.locator('p[lang="en"]').first()).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(turkish.last()).toBeVisible();
  });

  test("changes the text size", async ({ page }) => {
    await page.goto(`/article/${article.slug}`);

    const english = page.locator('p[lang="en"]').first();
    const fontSize = () =>
      english.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      );
    const medium = await fontSize();

    await page.getByRole("button", { name: "Large" }).click();
    await expect(page.getByRole("button", { name: "Large" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await fontSize()).toBeGreaterThan(medium);

    await page.getByRole("button", { name: "Small" }).click();
    expect(await fontSize()).toBeLessThan(medium);
  });

  test("keeps the reader's place when the controls change the layout", async ({
    page,
  }) => {
    await page.goto(`/article/${article.slug}`);

    // Put the middle of the third English paragraph just below the sticky controls.
    await page.evaluate(() => {
      const controls = document.querySelector(
        '[aria-label="Reading options"]',
      )!;
      const english = document
        .querySelector('[data-pair="3"] [data-lang="en"]')!
        .getBoundingClientRect();

      window.scrollBy(
        0,
        english.top +
          english.height / 2 -
          controls.getBoundingClientRect().height,
      );
    });

    const before = await readingPosition(page);
    expect(before).toMatchObject({ pair: "3", lang: "en" });

    const toggle = page.getByRole("button", { name: "Turkish translation" });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    const afterHiding = await readingPosition(page);
    expect(afterHiding).toMatchObject({ pair: "3", lang: "en" });
    expect(Math.abs(afterHiding!.top - before!.top)).toBeLessThanOrEqual(2);

    await page.getByRole("button", { name: "Large" }).click();
    expect(await readingPosition(page)).toMatchObject({
      pair: "3",
      lang: "en",
    });
  });

  test("credits the source with a safe external link", async ({ page }) => {
    await page.goto(`/article/${article.slug}`);

    await expect(
      page.getByText(`Source: ${DEMO_SOURCE_NAME}`, { exact: true }),
    ).toBeVisible();

    const link = page.getByRole("link", { name: /Read the original article/ });
    await expect(link).toHaveAttribute("href", demoSourceUrl(article.slug));
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

test.describe("explainers", () => {
  const explainer = DEMO_ARTICLES.find(
    (article): article is DemoExplainer => article.kind === "EXPLAINER",
  )!;

  test("are marked on their card and page, and credit their references", async ({
    page,
  }) => {
    await page.goto(`/category/${explainer.categorySlug}`);

    const card = page
      .getByRole("article")
      .filter({ has: page.getByRole("link", { name: explainer.title }) });
    await expect(card.getByText("Explainer", { exact: true })).toBeVisible();

    await card.getByRole("link", { name: explainer.title }).click();
    await expect(page).toHaveURL(`/article/${explainer.slug}`);

    const header = page.locator("article > header");
    await expect(header.getByText("Explainer", { exact: true })).toBeVisible();
    await expect(header.getByText(/^Written \d/)).toBeVisible();
    await expect(header.getByText(/^Source:/)).toHaveCount(0);

    const about = page.getByRole("complementary", {
      name: "About this article",
    });
    await expect(about).toContainText("Newslingo wrote this explainer");
    await expect(
      about.getByRole("link", { name: /Read the original article/ }),
    ).toHaveCount(0);

    const items = about.getByRole("listitem");
    await expect(items).toHaveCount(explainer.references.length);

    for (const [index, { title, url }] of explainer.references.entries()) {
      const link = items.nth(index).getByRole("link", { name: title });
      await expect(link).toHaveAttribute("href", url);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});

test.describe("unknown pages", () => {
  for (const path of [
    "/category/no-such-category",
    "/category/World",
    "/article/no-such-article",
    "/no/such/page",
  ]) {
    test(`${path} responds with a 404 page`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(404);
      await expect(
        page.getByRole("heading", { level: 1, name: "Page not found" }),
      ).toBeVisible();

      // Streamed metadata once replaced this title after hydration.
      await page.waitForLoadState("networkidle");
      expect(await page.title()).toBe("Page not found · Newslingo");
    });
  }
});

test.describe("homepage filters", () => {
  test("filters by level through a shareable URL and resets", async ({
    page,
  }) => {
    const expected = DEMO_ARTICLES.filter(
      ({ difficulty }) => difficulty === "B2",
    );

    await page.goto("/");
    await page.getByText("Filter by category, level, length or date").click();
    await page.getByLabel("Level").selectOption("B2");
    await page.getByRole("button", { name: "Show articles" }).click();

    await expect(page).toHaveURL("/?level=B2");
    const results = page.getByRole("region", { name: "Matching articles" });
    await expect(results.getByRole("article")).toHaveCount(expected.length);
    for (const { title } of expected) {
      await expect(results.getByRole("link", { name: title })).toBeVisible();
    }

    await page.reload();
    await expect(page.getByLabel("Level")).toHaveValue("B2");
    await expect(results.getByRole("article")).toHaveCount(expected.length);

    await results.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("region", { name: "Featured story" }),
    ).toBeVisible();
  });

  test("shows an empty state when nothing matches", async ({ page }) => {
    await page.goto("/?category=business&level=C1");

    await expect(
      page.getByText("No articles match these filters"),
    ).toBeVisible();
  });

  test("ignores invalid filter values", async ({ page }) => {
    await page.goto("/?level=Z9&category=nope&from=2026-02-30");

    await expect(
      page.getByRole("region", { name: "Featured story" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Matching articles" }),
    ).toHaveCount(0);
  });
});

test.describe("layout and keyboard", () => {
  test("never scrolls sideways", async ({ page }) => {
    for (const path of [
      "/",
      "/?level=B2",
      "/category/world",
      "/category/world/expressions",
      `/article/${longestArticle.slug}`,
    ]) {
      await page.goto(path);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test("offers a skip link to the main content", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard navigation is checked on desktop.");

    await page.goto("/");
    await page.keyboard.press("Tab");

    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
  });

  test("shows a visible focus ring on article cards", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Keyboard navigation is checked on desktop.");

    await page.goto("/");
    // The closed filter panel's summary comes right before the featured card.
    // Streamed content can still be hidden just after load, so wait until the
    // summary is shown and really holds focus before tabbing on.
    const summary = page.locator("summary");
    await expect(summary).toBeVisible();
    await summary.focus();
    await expect(summary).toBeFocused();
    await page.keyboard.press("Tab");

    const card = page
      .getByRole("region", { name: "Featured story" })
      .getByRole("article");
    await expect(card.getByRole("link")).toBeFocused();
    await expect(card).toHaveCSS("outline-style", "solid");
    await expect(card).toHaveCSS("outline-width", "3px");
  });
});

/** The paragraph crossing the line just below the sticky reading controls. */
async function readingPosition(page: Page) {
  return page.evaluate(() => {
    const controls = document.querySelector('[aria-label="Reading options"]')!;
    const line = controls.getBoundingClientRect().bottom + 8;
    const paragraph = [
      ...document.querySelectorAll<HTMLElement>("[data-lang]"),
    ].find((element) => {
      const { top, bottom } = element.getBoundingClientRect();

      return (
        element.getClientRects().length > 0 && top <= line && bottom > line
      );
    });

    return paragraph
      ? {
          pair: paragraph.closest<HTMLElement>("[data-pair]")!.dataset.pair,
          lang: paragraph.dataset.lang,
          top: Math.round(paragraph.getBoundingClientRect().top),
        }
      : null;
  });
}
