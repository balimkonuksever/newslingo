"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ADMIN_ARTICLES_PATH } from "@/lib/admin-article-filters";
import { requireAdmin } from "@/server/auth/session";
import {
  archiveArticle,
  changeArticleCategory,
  changeArticleDifficulty,
  type ModeratedArticle,
  type ModerationResult,
  publishArticle,
  restoreArticle,
} from "@/server/moderation/workflow";

// The moderation forms' server actions (M5). Each one checks for an admin
// first, because anyone can post to an action, then lets the workflow
// validate the input and the article's status.

/** What a moderation form shows after a refused attempt. */
export type ModerationFormState = {
  message?: string;
  /** Why an article can't be published yet. */
  problems?: string[];
  /** What the admin typed and chose, to fill in again. */
  reason?: string;
  choice?: string;
};

/** The notices the article page shows after a change, by `?done=`. */
export type ModerationNotice =
  "published" | "archived" | "restored" | "category" | "level";

/** Every page that shows the article, in the admin pages and on the site. */
function revalidateArticlePages({ id, slug, categorySlugs }: ModeratedArticle) {
  const paths = [
    "/admin",
    ADMIN_ARTICLES_PATH,
    `${ADMIN_ARTICLES_PATH}/${id}`,
    "/",
    `/article/${slug}`,
    ...categorySlugs.map((category) => `/category/${category}`),
  ];

  for (const path of paths) {
    revalidatePath(path);
  }
}

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : undefined;
}

/**
 * Runs a workflow change and turns its result into what the form shows. A
 * refusal stays on the form; success refreshes the pages and reloads the
 * article with a notice. An unexpected failure is logged here and reported
 * without details, which stay on the server.
 */
async function respond(
  formData: FormData,
  notice: ModerationNotice,
  change: () => Promise<ModerationResult>,
): Promise<ModerationFormState> {
  const typed = {
    reason: text(formData.get("reason")),
    choice: text(formData.get("categorySlug") ?? formData.get("difficulty")),
  };
  let result: ModerationResult;

  try {
    result = await change();
  } catch (error) {
    console.error("A moderation action failed.", error);

    return {
      ...typed,
      message:
        "Something went wrong on the server. Reload the page to see whether the change was made.",
    };
  }

  if (!result.ok) {
    return { ...typed, message: result.message, problems: result.problems };
  }

  revalidateArticlePages(result.article);
  redirect(`${ADMIN_ARTICLES_PATH}/${result.article.id}?done=${notice}`);
}

export async function publish(
  _previous: ModerationFormState,
  formData: FormData,
) {
  const admin = await requireAdmin();

  return respond(formData, "published", () =>
    publishArticle(admin, {
      articleId: formData.get("articleId"),
      reason: formData.get("reason"),
    }),
  );
}

export async function archive(
  _previous: ModerationFormState,
  formData: FormData,
) {
  const admin = await requireAdmin();

  return respond(formData, "archived", () =>
    archiveArticle(admin, {
      articleId: formData.get("articleId"),
      reason: formData.get("reason"),
    }),
  );
}

export async function restore(
  _previous: ModerationFormState,
  formData: FormData,
) {
  const admin = await requireAdmin();

  return respond(formData, "restored", () =>
    restoreArticle(admin, {
      articleId: formData.get("articleId"),
      reason: formData.get("reason"),
    }),
  );
}

export async function changeCategory(
  _previous: ModerationFormState,
  formData: FormData,
) {
  const admin = await requireAdmin();

  return respond(formData, "category", () =>
    changeArticleCategory(admin, {
      articleId: formData.get("articleId"),
      categorySlug: formData.get("categorySlug"),
      reason: formData.get("reason"),
    }),
  );
}

export async function changeLevel(
  _previous: ModerationFormState,
  formData: FormData,
) {
  const admin = await requireAdmin();

  return respond(formData, "level", () =>
    changeArticleDifficulty(admin, {
      articleId: formData.get("articleId"),
      difficulty: formData.get("difficulty"),
      reason: formData.get("reason"),
    }),
  );
}
