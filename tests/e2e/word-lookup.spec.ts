import { expect, type Page, test } from "@playwright/test";

import { DEMO_ARTICLES } from "../../prisma/fixtures/articles";

// Lookups read the article's word file, `/words/<slug>.json`, which holds the
// editorial entries seeded with the demo articles. The static site serves the
// same file without a server.

const article = DEMO_ARTICLES[0];
const path = `/article/${article.slug}`;

/** The `index`-th word of an English paragraph. */
function word(page: Page, paragraph: number, index: number) {
  return page.locator(`[data-pair="${paragraph}"] [data-w]`).nth(index);
}

/** The first word spelled `text` in an English paragraph. */
function wordNamed(page: Page, paragraph: number, text: string) {
  return page
    .locator(`[data-pair="${paragraph}"] [data-w]`)
    .filter({ hasText: new RegExp(`^${text}$`) })
    .first();
}

function card(page: Page) {
  return page.getByRole("dialog");
}

/** Waits until the card shows an entry rather than loading or an error. */
function entryShown(page: Page) {
  return expect(
    card(page).getByText("Explained by AI for this sentence."),
  ).toBeVisible();
}

const WORD_FILES = "**/words/*.json";

/** The paths of the word files the page fetches. */
function lookupRequests(page: Page) {
  const requests: string[] = [];

  page.on("request", (request) => {
    const { pathname } = new URL(request.url());

    if (pathname.startsWith("/words/")) {
      requests.push(pathname);
    }
  });

  return requests;
}

test("looks nothing up until the reader chooses a word", async ({ page }) => {
  const requests = lookupRequests(page);

  await page.goto(path);
  await expect(word(page, 1, 0)).toBeVisible();
  await page.waitForLoadState("networkidle");

  expect(requests).toEqual([]);
});

test("explains a word in its sentence", async ({ page }) => {
  const requests = lookupRequests(page);
  await page.goto(path);
  const chosen = wordNamed(page, 1, "agreement");
  const text = "agreement";

  await chosen.click();

  const dialog = card(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: text })).toBeVisible();
  await expect(dialog.getByText("anlaşma", { exact: true })).toBeVisible();
  await expect(chosen).toHaveAttribute("data-active", "");
  expect(requests).toEqual([`/words/${article.slug}.json`]);
});

test("closes with Escape and returns focus to the word", async ({ page }) => {
  await page.goto(path);
  const chosen = word(page, 2, 4);

  await chosen.click();
  await expect(card(page)).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(card(page)).toBeHidden();
  await expect(chosen).toBeFocused();
  await expect(chosen).not.toHaveAttribute("data-active");
});

test("closes with the close button", async ({ page }) => {
  await page.goto(path);
  const chosen = word(page, 1, 2);

  await chosen.click();
  await card(page).getByRole("button", { name: "Close" }).click();

  await expect(card(page)).toBeHidden();
  await expect(chosen).toBeFocused();
});

test("remembers an entry it has already shown", async ({ page }) => {
  const requests = lookupRequests(page);
  await page.goto(path);
  const chosen = wordNamed(page, 1, "river");

  await chosen.click();
  await expect(card(page).getByText("nehir", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await chosen.click();
  await expect(card(page).getByText("nehir", { exact: true })).toBeVisible();

  expect(requests).toHaveLength(1);
});

test.describe("keyboard", () => {
  test.skip(({ isMobile }) => isMobile, "Keyboard use is checked on desktop.");

  test("gives each paragraph one tab stop and moves by arrow keys", async ({
    page,
  }) => {
    await page.goto(path);

    await expect(page.locator('[data-w][tabindex="0"]')).toHaveCount(
      article.paragraphs.length,
    );

    await page.getByRole("button", { name: "Large" }).focus();
    await page.keyboard.press("Tab");
    await expect(word(page, 1, 0)).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await expect(word(page, 1, 1)).toBeFocused();
    await page.keyboard.press("End");
    await expect(page.locator('[data-pair="1"] [data-w]').last()).toBeFocused();
    await page.keyboard.press("Home");
    await expect(word(page, 1, 0)).toBeFocused();

    // The paragraph stays one tab stop, now at the chosen word.
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Tab");
    await expect(word(page, 2, 0)).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(word(page, 1, 1)).toBeFocused();
  });

  test("opens with Enter and returns focus after Escape", async ({ page }) => {
    await page.goto(path);
    const chosen = word(page, 1, 0);

    await chosen.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");

    const second = word(page, 1, 1);
    const dialog = card(page);
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();
    await expect(
      dialog.getByRole("heading", { name: (await second.textContent()) ?? "" }),
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(second).toBeFocused();
  });
});

test.describe("failures", () => {
  /** Answers the word file with a server error. */
  function failWith(page: Page, status: number) {
    return page.route(WORD_FILES, (route) =>
      route.fulfill({ status, body: "Unavailable" }),
    );
  }

  test("offers a retry when the dictionary is unavailable", async ({
    page,
  }) => {
    await page.goto(path);
    await failWith(page, 503);
    await word(page, 1, 3).click();

    const dialog = card(page);
    await expect(
      dialog.getByText("The dictionary isn’t available right now."),
    ).toBeVisible();

    await page.unrouteAll();
    await dialog.getByRole("button", { name: "Try again" }).click();
    await entryShown(page);
  });

  test("says when a word has no entry yet", async ({ page }) => {
    await page.goto(path);
    const chosen = word(page, 1, 3);
    const start = Number(await chosen.getAttribute("data-w"));
    const text = (await chosen.textContent()) ?? "";
    await page.route(WORD_FILES, (route) =>
      route.fulfill({
        json: { entries: [], words: { [`1:${start}`]: [null, text] } },
      }),
    );
    await chosen.click();

    await expect(
      card(page).getByText("This word isn’t in the dictionary yet."),
    ).toBeVisible();
    await expect(
      card(page).getByRole("button", { name: "Try again" }),
    ).toHaveCount(0);
  });

  test("says when the article has no word file", async ({ page }) => {
    await page.goto(path);
    await failWith(page, 404);
    await word(page, 1, 3).click();

    await expect(
      card(page).getByText("This word can’t be looked up."),
    ).toBeVisible();
    await expect(
      card(page).getByRole("button", { name: "Try again" }),
    ).toHaveCount(0);
  });

  test("survives a network failure", async ({ page }) => {
    await page.goto(path);
    await page.route(WORD_FILES, (route) => route.abort("failed"));
    await word(page, 1, 3).click();

    await expect(
      card(page).getByText("The dictionary isn’t available right now."),
    ).toBeVisible();
  });
});

test.describe("wide screens", () => {
  test.skip(({ isMobile }) => isMobile, "Phones get a bottom sheet.");

  test("shows the card just below the word", async ({ page }) => {
    await page.goto(path);
    const chosen = word(page, 1, 3);
    await chosen.evaluate((element) =>
      element.scrollIntoView({ block: "center" }),
    );

    await chosen.click();
    await entryShown(page);

    const wordBox = (await chosen.boundingBox())!;
    const cardBox = (await card(page).boundingBox())!;
    const gap = cardBox.y - (wordBox.y + wordBox.height);
    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeLessThan(20);
  });

  test("shows the card above a word near the bottom of the window", async ({
    page,
  }) => {
    await page.goto(path);
    const chosen = word(page, 2, 3);
    await chosen.evaluate((element) =>
      element.scrollIntoView({ block: "end" }),
    );

    await chosen.click();
    await entryShown(page);

    const wordBox = (await chosen.boundingBox())!;
    const cardBox = (await card(page).boundingBox())!;
    const gap = wordBox.y - (cardBox.y + cardBox.height);
    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeLessThan(20);
  });
});

test("shows a bottom sheet on phones without covering the word", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Wide screens get a card beside the word.");
  await page.goto(path);
  const lastWord = page.locator('[data-pair="3"] [data-w]').last();
  await lastWord.evaluate((element) =>
    element.scrollIntoView({ block: "end" }),
  );

  await lastWord.click();
  await entryShown(page);

  const viewport = page.viewportSize()!;
  const sheet = (await card(page).boundingBox())!;
  expect(sheet.x).toBe(0);
  expect(sheet.width).toBe(viewport.width);
  expect(Math.round(sheet.y + sheet.height)).toBe(viewport.height);

  const wordBox = (await lastWord.boundingBox())!;
  expect(wordBox.y + wordBox.height).toBeLessThanOrEqual(sheet.y);
});
