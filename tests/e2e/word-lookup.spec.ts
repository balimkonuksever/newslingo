import { expect, type Page, test } from "@playwright/test";

import { DEMO_ARTICLES } from "../../prisma/fixtures/articles";

// `pnpm test:e2e` runs the server without a dictionary provider: every
// lookup is answered by the editorial entries seeded with the demo articles.

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

function lookupRequests(page: Page) {
  const requests: Array<Record<string, unknown>> = [];

  page.on("request", (request) => {
    if (request.url().endsWith("/api/dictionary")) {
      requests.push(request.postDataJSON());
    }
  });

  return requests;
}

test.beforeEach(async ({ page }, testInfo) => {
  // The route limits lookups per client address; give each test its own.
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `e2e-${testInfo.testId}`,
  });
});

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
  expect(requests).toEqual([
    {
      articleSlug: article.slug,
      paragraphOrder: 1,
      start: Number(await chosen.getAttribute("data-w")),
      end: Number(await chosen.getAttribute("data-w")) + text.length,
    },
  ]);
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
  function answerWith(page: Page, status: number, error: string) {
    return page.route("**/api/dictionary", (route) =>
      route.fulfill({ status, json: { error } }),
    );
  }

  test("offers a retry when the dictionary is unavailable", async ({
    page,
  }) => {
    await page.goto(path);
    await answerWith(page, 503, "unavailable");
    await word(page, 1, 3).click();

    const dialog = card(page);
    await expect(
      dialog.getByText("The dictionary isn’t available right now."),
    ).toBeVisible();

    await page.unrouteAll();
    await dialog.getByRole("button", { name: "Try again" }).click();
    await entryShown(page);
  });

  test("asks the reader to slow down when rate limited", async ({ page }) => {
    await page.goto(path);
    await answerWith(page, 429, "rate_limited");
    await word(page, 1, 3).click();

    await expect(
      card(page).getByText("Wait a moment, then try again."),
    ).toBeVisible();
    await expect(
      card(page).getByRole("button", { name: "Try again" }),
    ).toBeVisible();
  });

  test("says when a word has no entry yet", async ({ page }) => {
    await page.goto(path);
    await answerWith(page, 404, "no_entry");
    await word(page, 1, 3).click();

    await expect(
      card(page).getByText("This word isn’t in the dictionary yet."),
    ).toBeVisible();
    await expect(
      card(page).getByRole("button", { name: "Try again" }),
    ).toHaveCount(0);
  });

  test("says when a word cannot be looked up", async ({ page }) => {
    await page.goto(path);
    await answerWith(page, 404, "not_found");
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
    await page.route("**/api/dictionary", (route) => route.abort("failed"));
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
