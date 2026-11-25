import { seriousViolations } from "../support/axe";
import { builtPages, expect, site, test } from "./site";

// Every page the site build wrote, served as GitHub Pages serves it. The
// fixture in ./site fails a page that breaks its content security policy or
// logs an error, which also catches a link whose prefetched page is missing.
for (const path of builtPages()) {
  test(`${path} runs within its content security policy and has no serious accessibility violations`, async ({
    page,
  }) => {
    const response = await page.goto(path);

    expect(response?.status()).toBe(200);
    await expect(
      page.locator('head > meta[http-equiv="Content-Security-Policy"]'),
    ).toHaveCount(1);
    await page.waitForLoadState("networkidle");

    expect(await seriousViolations(page)).toEqual([]);
  });
}

test.describe("an address the site does not have", () => {
  test.use({ expectedErrors: [/status of 404/] });

  test("gets the not-found page", async ({ page }) => {
    const response = await page.goto(site("/article/no-such-article/"));

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");

    expect(await seriousViolations(page)).toEqual([]);
  });
});
