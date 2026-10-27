import "server-only";

import { z } from "zod";

import {
  ARTICLE_STATUS_LABELS,
  canModerate,
  MAX_REASON_LENGTH,
  MODERATION_ACTION_LABELS,
  MODERATION_RULES,
  publicationProblems,
} from "@/domain/moderation";
import type { Prisma } from "@/generated/prisma/client";
import type { ModerationAction } from "@/generated/prisma/enums";
import { DIFFICULTIES } from "@/lib/difficulty";
import type { AdminIdentity } from "@/server/auth/access";
import { db } from "@/server/db/client";

// The admin actions that change an article (M5). Each one checks its input
// and the article's status on the server, then changes the article and
// records a ModerationEvent in one transaction. Callers are server actions,
// which must call `requireAdmin()` first and pass the admin it returns.

export type ModerationRefusal =
  "invalid" | "not-found" | "not-allowed" | "not-publishable" | "changed";

/** The article a change touched, so callers can refresh the pages showing it. */
export type ModeratedArticle = {
  id: string;
  slug: string;
  /** Its category, then the new one when the change moved it. */
  categorySlugs: string[];
};

export type ModerationResult =
  | { ok: true; article: ModeratedArticle }
  | {
      ok: false;
      refusal: ModerationRefusal;
      message: string;
      /** For `not-publishable`: what to fix first. */
      problems?: string[];
    };

const articleIdSchema = z.string().trim().min(1).max(64);
const reasonSchema = z
  .string()
  .trim()
  .max(MAX_REASON_LENGTH)
  .optional()
  .transform((reason) => reason || null);

/** A database change made while the article changed under it. */
class ChangedMeanwhile extends Error {}

function refuse(
  refusal: ModerationRefusal,
  message: string,
  problems?: string[],
): ModerationResult {
  return { ok: false, refusal, message, problems };
}

type Change = {
  data: Prisma.ArticleUncheckedUpdateManyInput;
  before: Prisma.InputJsonObject;
  after: Prisma.InputJsonObject;
  /** The new category's slug, when the change moves the article. */
  movedTo?: string;
};

const loadedArticleSelect = {
  id: true,
  slug: true,
  status: true,
  categoryId: true,
  difficulty: true,
  publishedOnSiteAt: true,
  category: { select: { slug: true } },
} satisfies Prisma.ArticleSelect;

type LoadedArticle = Prisma.ArticleGetPayload<{
  select: typeof loadedArticleSelect;
}>;

/**
 * Runs one action: validates the shared input, loads the article, checks
 * that the action may start from its status, then applies `plan`'s change
 * and the audit row together. The update only matches while the article
 * keeps the status (and fields) it was checked with, so two admins acting
 * at once cannot both succeed.
 */
async function moderate(
  actor: AdminIdentity,
  action: ModerationAction,
  input: { articleId: unknown; reason?: unknown },
  plan: (article: LoadedArticle) => Promise<Change | ModerationResult>,
): Promise<ModerationResult> {
  const articleId = articleIdSchema.safeParse(input.articleId);
  const reason = reasonSchema.safeParse(input.reason ?? undefined);

  if (!articleId.success) {
    return refuse("invalid", "That is not an article.");
  }

  if (!reason.success) {
    return refuse(
      "invalid",
      `Keep the reason under ${MAX_REASON_LENGTH} characters.`,
    );
  }

  if (MODERATION_RULES[action].reasonRequired && !reason.data) {
    return refuse("invalid", "Give a reason. It is kept with the change.");
  }

  const article = await db.article.findUnique({
    where: { id: articleId.data },
    select: loadedArticleSelect,
  });

  if (!article) {
    return refuse("not-found", "That article no longer exists.");
  }

  if (!canModerate(action, article.status)) {
    return refuse(
      "not-allowed",
      `${MODERATION_ACTION_LABELS[action]} isn’t possible for an article that is ${ARTICLE_STATUS_LABELS[article.status]}.`,
    );
  }

  const change = await plan(article);

  if ("ok" in change) {
    return change;
  }

  try {
    await db.$transaction(async (tx) => {
      const { count } = await tx.article.updateMany({
        where: {
          id: article.id,
          status: article.status,
          categoryId: article.categoryId,
          difficulty: article.difficulty,
        },
        data: change.data,
      });

      if (count === 0) {
        throw new ChangedMeanwhile();
      }

      await tx.moderationEvent.create({
        data: {
          articleId: article.id,
          actorId: actor.id,
          action,
          reason: reason.data,
          before: change.before,
          after: change.after,
        },
      });
    });
  } catch (error) {
    if (error instanceof ChangedMeanwhile) {
      return refuse(
        "changed",
        "The article changed while you were acting on it. Reload it and try again.",
      );
    }

    throw error;
  }

  return {
    ok: true,
    article: {
      id: article.id,
      slug: article.slug,
      categorySlugs: [
        article.category.slug,
        ...(change.movedTo ? [change.movedTo] : []),
      ],
    },
  };
}

/**
 * Publishes a draft, after checking on the server that it is complete. An
 * article that was published before keeps its first publication date.
 */
export function publishArticle(
  actor: AdminIdentity,
  input: { articleId: unknown; reason?: unknown },
) {
  return moderate(actor, "PUBLISH", input, async (article) => {
    const candidate = await db.article.findUniqueOrThrow({
      where: { id: article.id },
      select: {
        title: true,
        kind: true,
        sourceName: true,
        sourceUrl: true,
        sourceLicence: true,
        references: { select: { title: true, publisher: true, url: true } },
        wordCount: true,
        readingTimeMinutes: true,
        category: { select: { isActive: true } },
        paragraphs: { select: { order: true, english: true, turkish: true } },
        expressions: {
          select: {
            startOffset: true,
            endOffset: true,
            surfaceText: true,
            paragraph: { select: { order: true } },
          },
        },
      },
    });
    const problems = publicationProblems({
      ...candidate,
      categoryIsActive: candidate.category.isActive,
      expressions: candidate.expressions.map(({ paragraph, ...mark }) => ({
        ...mark,
        paragraphOrder: paragraph.order,
      })),
    });

    if (problems.length > 0) {
      return refuse(
        "not-publishable",
        "The article can’t be published yet.",
        problems,
      );
    }

    const publishedOnSiteAt = article.publishedOnSiteAt ?? new Date();

    return {
      data: { status: "PUBLISHED", publishedOnSiteAt },
      before: {
        status: article.status,
        publishedOnSiteAt: article.publishedOnSiteAt?.toISOString() ?? null,
      },
      after: {
        status: "PUBLISHED",
        publishedOnSiteAt: publishedOnSiteAt.toISOString(),
      },
    };
  });
}

/**
 * Takes a published article off the site, or rejects a draft. The article
 * is kept, never deleted.
 */
export function archiveArticle(
  actor: AdminIdentity,
  input: { articleId: unknown; reason?: unknown },
) {
  return moderate(actor, "ARCHIVE", input, async (article) => ({
    data: { status: "ARCHIVED" },
    before: { status: article.status },
    after: { status: "ARCHIVED" },
  }));
}

/** Brings an archived article back as a draft, to be reviewed again. */
export function restoreArticle(
  actor: AdminIdentity,
  input: { articleId: unknown; reason?: unknown },
) {
  return moderate(actor, "RESTORE", input, async (article) => ({
    data: { status: "DRAFT" },
    before: { status: article.status },
    after: { status: "DRAFT" },
  }));
}

/** Moves an article to another active category. */
export function changeArticleCategory(
  actor: AdminIdentity,
  input: { articleId: unknown; categorySlug: unknown; reason?: unknown },
) {
  return moderate(actor, "CHANGE_CATEGORY", input, async (article) => {
    const slug = z.string().trim().max(64).safeParse(input.categorySlug);
    const category = slug.success
      ? await db.category.findUnique({
          where: { slug: slug.data },
          select: { id: true, slug: true, isActive: true },
        })
      : null;

    if (!category?.isActive) {
      return refuse("invalid", "Choose one of the active categories.");
    }

    if (category.id === article.categoryId) {
      return refuse("invalid", "The article is already in that category.");
    }

    return {
      data: { categoryId: category.id },
      before: { category: article.category.slug },
      after: { category: category.slug },
      movedTo: category.slug,
    };
  });
}

/** Corrects an article's CEFR level label. */
export function changeArticleDifficulty(
  actor: AdminIdentity,
  input: { articleId: unknown; difficulty: unknown; reason?: unknown },
) {
  return moderate(actor, "CHANGE_DIFFICULTY", input, async (article) => {
    const difficulty = z.enum(DIFFICULTIES).safeParse(input.difficulty);

    if (!difficulty.success) {
      return refuse("invalid", "Choose one of the levels A2, B1, B2 and C1.");
    }

    if (difficulty.data === article.difficulty) {
      return refuse("invalid", "The article already has that level.");
    }

    return {
      data: { difficulty: difficulty.data },
      before: { difficulty: article.difficulty },
      after: { difficulty: difficulty.data },
    };
  });
}
