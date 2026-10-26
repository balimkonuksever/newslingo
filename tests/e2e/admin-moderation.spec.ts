import { expect, type Locator, type Page, test } from "@playwright/test";

import { DEMO_ARTICLES } from "../../prisma/fixtures/articles";
import { DEMO_DRAFTS } from "../../prisma/fixtures/drafts";
import { signIn } from "./admin-session";
import { testAdminFor } from "./admins";
import { seriousViolations } from "./axe";
import {
  demoDraft,
  moderationState,
  resetModerationArticle,
} from "./moderation-articles";

// The admin article pages (M5): the list and its filters, the preview, and
// the moderation forms. Tests that change an article each act on their own
// project's copy of the demo draft (moderation-articles.ts), so they never
// meet the other project's tests or the specs that read the demo articles.

const [draftFixture] = DEMO_DRAFTS;
const technologyArticle = DEMO_ARTICLES.find(
  ({ categorySlug }) => categorySlug === "technology",
)!;

function articleRows(page: Page) {
  return page
    .getByRole("list", { name: "Matching articles" })
    .getByRole("listitem");
}

/** The selected option of a filter, whose label carries its count. */
function chosenOption(page: Page, label: string) {
  return page.getByLabel(label).locator("option:checked");
}

function newestHistoryRow(page: Page) {
  return page
    .getByRole("list", { name: "Moderation history" })
    .getByRole("listitem")
    .first();
}

/** The number at the start of the list's count, such as 3 in "3 articles". */
async function listedCount(summary: Locator) {
  const text = (await summary.textContent()) ?? "";

  return Number(text.match(/^\d+/)?.[0] ?? Number.NaN);
}

test("sends a signed-out visitor from the article pages to sign-in", async ({
  page,
}) => {
  const draft = await demoDraft();

  for (const path of ["/admin/articles", `/admin/articles/${draft.id}`]) {
    await page.goto(path);

    await expect(page).toHaveURL(/\/admin\/sign-in$/);
    await expect(page.getByText(draft.title)).toHaveCount(0);
  }
});

test("filters the article list by status and category", async ({
  page,
}, testInfo) => {
  await signIn(page, testAdminFor(testInfo.project.name));
  await page.getByRole("link", { name: "See all articles" }).click();
  await expect(page).toHaveURL("/admin/articles");

  // No test changes the technology article, so these counts hold while the
  // other tests publish and archive their copies.
  await page.getByLabel("Status").selectOption("published");
  await page.getByLabel("Category").selectOption("technology");
  await page.getByRole("button", { name: "Show articles" }).click();

  await expect(page).toHaveURL(
    "/admin/articles?status=published&category=technology",
  );
  await expect(articleRows(page)).toHaveCount(1);
  await expect(articleRows(page).first()).toContainText(
    technologyArticle.title,
  );
  await expect(
    page.getByText("1 article matches these filters."),
  ).toBeVisible();
  await expect(chosenOption(page, "Status")).toHaveText("Published (1)");
  await expect(chosenOption(page, "Category")).toHaveText("Technology (1)");

  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page).toHaveURL("/admin/articles");

  // Every listed draft, and the count beside "Draft", agree with the list.
  await page.goto("/admin/articles?status=draft");
  const summary = page.getByText(/^\d+ articles? match(es)? these filters\.$/);
  const count = await listedCount(summary);

  await expect(articleRows(page)).toHaveCount(count);
  await expect(chosenOption(page, "Status")).toHaveText(`Draft (${count})`);
  await expect(
    articleRows(page).filter({
      hasNot: page.getByText("Draft", { exact: true }),
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: draftFixture!.title, exact: true }),
  ).toBeVisible();
});

test("publishing a draft puts it on the site and records who did it", async ({
  page,
}, testInfo) => {
  const project = testInfo.project.name;
  const admin = testAdminFor(project);
  const article = await resetModerationArticle(project, "publish");
  const before = await moderationState(article.id);
  const note = `Read through on ${project}, attempt ${testInfo.retry + 1}.`;

  expect((await page.goto(`/article/${article.slug}`))?.status()).toBe(404);

  await signIn(page, admin);
  await page.goto(`/admin/articles/${article.id}`);

  // The preview is the public reader, paragraph for paragraph.
  const preview = page.getByRole("region", { name: "Preview" });
  await expect(preview.getByRole("heading", { level: 1 })).toHaveText(
    article.title,
  );
  await expect(preview.locator("[data-pair]")).toHaveCount(
    draftFixture!.paragraphs.length,
  );

  const form = page.getByRole("form", { name: "Publish" });
  await form.getByLabel("Note (optional)").fill(note);
  await form.getByRole("button", { name: "Publish" }).click();

  await expect(page).toHaveURL(`/admin/articles/${article.id}?done=published`);
  await expect(page.getByRole("main").getByRole("status")).toHaveText(
    "Published. Readers can see the article now.",
  );
  await expect(newestHistoryRow(page)).toContainText("Published");
  await expect(newestHistoryRow(page)).toContainText(`by ${admin.name}`);
  await expect(newestHistoryRow(page)).toContainText(`Note: ${note}`);
  expect(await moderationState(article.id)).toEqual({
    status: "PUBLISHED",
    events: before.events + 1,
  });

  await page.goto(`/article/${article.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    article.title,
  );
});

test("archiving a published article takes it off the site, but only with a reason", async ({
  page,
}, testInfo) => {
  const project = testInfo.project.name;
  const article = await resetModerationArticle(project, "archive");
  const before = await moderationState(article.id);
  const reason = `The source corrected it (${project}, attempt ${testInfo.retry + 1}).`;

  expect((await page.goto(`/article/${article.slug}`))?.status()).toBe(200);

  await signIn(page, testAdminFor(project));
  await page.goto(`/admin/articles/${article.id}`);
  const form = page.getByRole("form", { name: "Archive" });
  const reasonField = form.getByLabel("Reason");

  // Spaces get past the browser's required check, but not the server's.
  await expect(reasonField).toHaveAttribute("required", "");
  await reasonField.fill("   ");
  await form.getByRole("button", { name: "Archive" }).click();

  await expect(form.getByRole("alert")).toHaveText(
    "Give a reason. It is kept with the change.",
  );
  expect(await moderationState(article.id)).toEqual(before);
  expect(await seriousViolations(page)).toEqual([]);

  await reasonField.fill(reason);
  await form.getByRole("button", { name: "Archive" }).click();

  await expect(page).toHaveURL(`/admin/articles/${article.id}?done=archived`);
  await expect(newestHistoryRow(page)).toContainText("Archived");
  await expect(newestHistoryRow(page)).toContainText(`Reason: ${reason}`);
  expect(await moderationState(article.id)).toEqual({
    status: "ARCHIVED",
    events: before.events + 1,
  });

  expect((await page.goto(`/article/${article.slug}`))?.status()).toBe(404);
});

test("refuses an action once the admin is signed out", async ({
  page,
}, testInfo) => {
  const project = testInfo.project.name;
  const article = await resetModerationArticle(project, "signed-out");
  const before = await moderationState(article.id);

  await signIn(page, testAdminFor(project));
  await page.goto(`/admin/articles/${article.id}`);

  // The form is on the page, but the session is gone: the action must check
  // for an admin itself.
  await page.context().clearCookies();
  await page
    .getByRole("form", { name: "Publish" })
    .getByRole("button", { name: "Publish" })
    .click();

  await expect(page).toHaveURL(/\/admin\/sign-in$/);
  expect(await moderationState(article.id)).toEqual(before);
});

test("the admin pages have no serious accessibility violations", async ({
  page,
}, testInfo) => {
  const draft = await demoDraft();

  await signIn(page, testAdminFor(testInfo.project.name));

  for (const path of [
    "/admin",
    "/admin/articles",
    "/admin/articles?status=draft&category=world",
    `/admin/articles/${draft.id}`,
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    expect(await seriousViolations(page), path).toEqual([]);
  }
});
