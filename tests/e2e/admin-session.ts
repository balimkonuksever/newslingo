import { expect, type Page } from "@playwright/test";

import { authenticatorCode } from "../support/sign-in";
import type { TestAdmin } from "./admins";

// The admin sign-in steps (ADR-003), shared by the specs that need an admin:
// a password, then a code from the authenticator app or a backup code.

export async function enterPassword(
  page: Page,
  admin: TestAdmin,
  password = admin.password,
) {
  await page.goto("/admin/sign-in");
  await page.getByLabel("Email address").fill(admin.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
}

export async function enterCode(page: Page, code: string) {
  await page.getByLabel("Code").fill(code);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** A form's refusal message. Next.js's route announcer is an alert too. */
export function refusal(page: Page) {
  return page.getByRole("main").getByRole("alert");
}

/**
 * Signs in as `admin` with a password and a code from the authenticator app,
 * ending on the admin home. Each project has its own admin, and a code may
 * be used by several tests at once.
 */
export async function signIn(page: Page, admin: TestAdmin) {
  await enterPassword(page, admin);
  await expect(page).toHaveURL(/\/admin\/sign-in\/code$/);
  await enterCode(page, authenticatorCode(admin.setupKey));
  await expect(page).toHaveURL(/\/admin$/);
}
