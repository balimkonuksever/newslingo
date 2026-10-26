import { expect, test } from "@playwright/test";

import { authenticatorCode } from "../support/sign-in";
import { enterCode, enterPassword, refusal } from "./admin-session";
import { testAdminFor } from "./admins";
import { seriousViolations } from "./axe";

// Admin sign-in in the browser (ADR-003): a password, then a code from the
// authenticator app or a backup code. Each project signs in as its own test
// admin, made by the global setup with the admin command.

test("sends a signed-out visitor from the admin pages to sign-in", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/admin\/sign-in$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Sign in" }),
  ).toBeVisible();
});

test("refuses a wrong password and keeps the email address", async ({
  page,
}, testInfo) => {
  const admin = testAdminFor(testInfo.project.name);

  await enterPassword(page, admin, "not the right password");

  await expect(refusal(page)).toHaveText(
    "That email address and password don’t match an admin.",
  );
  await expect(page.getByLabel("Email address")).toHaveValue(admin.email);
  await expect(page).toHaveURL(/\/admin\/sign-in$/);
});

test("signs in with a password and an authenticator code, then signs out", async ({
  page,
}, testInfo) => {
  const admin = testAdminFor(testInfo.project.name);

  await enterPassword(page, admin);
  await expect(page).toHaveURL(/\/admin\/sign-in\/code$/);

  await enterCode(page, "000000");
  await expect(refusal(page)).toContainText("That code isn’t right");

  await enterCode(page, authenticatorCode(admin.setupKey));
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Overview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByText(`Signed in as ${admin.name}`),
  ).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);

  // A signed-in admin who opens the sign-in page goes straight back.
  await page.goto("/admin/sign-in");
  await expect(page).toHaveURL(/\/admin$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/sign-in$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/sign-in$/);
});

test("signs in with a backup code instead of the app", async ({
  page,
}, testInfo) => {
  const admin = testAdminFor(testInfo.project.name);

  await enterPassword(page, admin);
  // Each backup code works once, so a retry takes the next one.
  await enterCode(page, admin.backupCodes[testInfo.retry] ?? "");

  await expect(page).toHaveURL(/\/admin$/);
});

test("sends a visitor who skipped the password back to the start", async ({
  page,
}) => {
  await page.goto("/admin/sign-in/code");
  await enterCode(page, "123456");

  await expect(page).toHaveURL(/\/admin\/sign-in\?expired$/);
  await expect(page.getByRole("status")).toHaveText(
    "The sign-in took too long. Please start again.",
  );
});
