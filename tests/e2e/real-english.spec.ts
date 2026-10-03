import { expect, type Page, test } from "@playwright/test";

// The cinema article marks "opened its doors" and "thanks to" in its first
// paragraph and "sold out" in its fourth (prisma/fixtures/expression-occurrences.ts).
const path = "/article/old-cinema-reopens-with-films-chosen-by-neighbours";

function phrase(page: Page, slug: string) {
  return page.locator(`[data-e="${slug}"]`);
}

function card(page: Page) {
  return page.getByRole("dialog");
}

test("opens a whole expression's card without asking the dictionary", async ({
  page,
}) => {
  const lookups: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/dictionary")) {
      lookups.push(request.url());
    }
  });

  await page.goto(path);
  await expect(phrase(page, "sell-out")).toHaveText("sold out");
  await phrase(page, "sell-out").click();

  const dialog = card(page);
  await expect(dialog.getByRole("heading", { name: "sell out" })).toBeVisible();
  await expect(dialog).toContainText("here: “sold out”");
  await expect(dialog).toContainText("kapalı gişe oynamak");
  await expect(dialog).toContainText("Watch out:");
  await expect(
    dialog.getByText(
      "Written with AI and checked by a native Turkish speaker.",
    ),
  ).toBeVisible();
  expect(lookups).toEqual([]);
});

test("shows the whole card without hiding the expression", async ({ page }) => {
  await page.goto(path);
  await phrase(page, "sell-out").click();

  const dialog = card(page);
  await expect(dialog.getByText("Written with AI")).toBeVisible();

  const viewport = page.viewportSize()!;
  const phraseBox = (await phrase(page, "sell-out").boundingBox())!;
  const cardBox = (await dialog.boundingBox())!;

  // The card may sit above or below the expression, but all of it is in
  // the window and none of it covers the expression.
  expect(phraseBox.y).toBeGreaterThanOrEqual(0);
  expect(cardBox.y).toBeGreaterThanOrEqual(0);
  expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(viewport.height);
  expect(
    cardBox.y >= phraseBox.y + phraseBox.height ||
      cardBox.y + cardBox.height <= phraseBox.y,
  ).toBe(true);
});

test.describe("keyboard", () => {
  test.skip(({ isMobile }) => isMobile, "Keyboard use is checked on desktop.");

  test("reaches an expression with the arrow keys and opens it with Enter", async ({
    page,
  }) => {
    await page.goto(path);
    const targets = page.locator('[data-pair="1"] [data-w]');
    const doors = phrase(page, "open-its-doors");

    await targets.first().focus();
    // "An old cinema that closed five years ago has": nine words come first.
    for (let step = 0; step < 9; step += 1) {
      await page.keyboard.press("ArrowRight");
    }
    await expect(doors).toBeFocused();
    await expect(doors).toHaveText("opened its doors");

    await page.keyboard.press("Enter");
    await expect(
      card(page).getByRole("heading", { name: "open its doors" }),
    ).toBeVisible();
    await expect(card(page)).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(doors).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(phrase(page, "thanks-to")).toBeFocused();
  });
});

test.describe("Real English lists", () => {
  test("ends the article with its expressions, each opening to its card", async ({
    page,
  }) => {
    await page.goto(path);

    const section = page.getByRole("region", {
      name: "Real English from this article",
    });
    const rows = section.locator("summary");

    await expect(section).toContainText("3 expressions");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("open its doors");
    await expect(rows.nth(1)).toContainText("thanks to");
    await expect(rows.nth(2)).toContainText("sell out");

    const watchOut = section.locator("details").nth(2).getByText("Watch out:");
    await expect(watchOut).toBeHidden();
    await rows.nth(2).click();
    await expect(watchOut).toBeVisible();
    await expect(watchOut.locator("..")).toContainText("kapalı gişe");

    await section
      .getByRole("link", { name: "All Real English for Entertainment" })
      .click();
    await expect(page).toHaveURL("/category/entertainment/expressions");
  });

  test("gives each category a Real English page", async ({ page }) => {
    await page.goto("/category/entertainment");
    await page
      .getByRole("link", {
        name: "Real English for Entertainment: 13 expressions",
      })
      .click();

    await expect(page).toHaveURL("/category/entertainment/expressions");
    await expect(page).toHaveTitle(
      "Real English for Entertainment · Newslingo",
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Real English",
    );

    const rows = page.locator("main summary");
    await expect(rows).toHaveCount(13);
    await expect(rows.first()).toContainText("be a hit");
    await expect(rows.first()).toContainText("tutmak");
  });

  test("answers an unknown category's Real English page with a 404", async ({
    page,
  }) => {
    const response = await page.goto("/category/no-such-category/expressions");

    expect(response?.status()).toBe(404);
  });
});
