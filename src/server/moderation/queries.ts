import "server-only";

import { cache } from "react";
import { z } from "zod";

import { ARTICLE_STATUSES } from "@/domain/moderation";
import { Prisma } from "@/generated/prisma/client";
import type { ArticleStatus } from "@/generated/prisma/enums";
import type { AdminArticleFilters } from "@/lib/admin-article-filters";
import {
  type ArticleDetail,
  articleDetailSelect,
  toArticleDetail,
} from "@/server/articles/queries";
import { db } from "@/server/db/client";

// Read queries for the admin pages (M5). Unlike the public queries, these see
// articles in every status and in switched-off categories, so only admin
// pages call them, each after `requireAdmin()`.

/** The most articles the admin list shows at once. */
export const ADMIN_ARTICLE_LIST_LIMIT = 50;

const articleIdSchema = z.string().trim().min(1).max(64);

/** Every category, active or not, in display order. */
export const listCategoriesForAdmin = cache(() =>
  db.category.findMany({
    orderBy: [{ displayOrder: "asc" }, { slug: "asc" }],
    select: { slug: true, name: true, isActive: true },
  }),
);

export type AdminCategory = Awaited<
  ReturnType<typeof listCategoriesForAdmin>
>[number];

function emptyStatusCounts() {
  return Object.fromEntries(
    ARTICLE_STATUSES.map((status) => [status, 0]),
  ) as Record<ArticleStatus, number>;
}

/** How many articles each status holds, in every category. */
export async function countArticlesByStatus() {
  const groups = await db.article.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const counts = emptyStatusCounts();

  for (const { status, _count } of groups) {
    counts[status] = _count._all;
  }

  return counts;
}

const adminArticleRowSelect = {
  id: true,
  slug: true,
  title: true,
  status: true,
  difficulty: true,
  sourcePublishedAt: true,
  publishedOnSiteAt: true,
  updatedAt: true,
  category: { select: { slug: true, name: true } },
} satisfies Prisma.ArticleSelect;

export type AdminArticleRow = Prisma.ArticleGetPayload<{
  select: typeof adminArticleRowSelect;
}>;

export type AdminArticleList = {
  /** Newest source publication first, at most the list's limit. */
  articles: AdminArticleRow[];
  /** How many articles match the filters, including any past the limit. */
  total: number;
  /** Per status, the articles that match the category filter. */
  statusCounts: Record<ArticleStatus, number>;
  /** Every category, each with the articles that match the status filter. */
  categories: Array<AdminCategory & { count: number }>;
};

/**
 * The articles matching `filters`, with the counts the filters show. All of
 * it is read from one snapshot of the database, so the counts always agree
 * with each other and with the rows, even while another admin is acting.
 */
export async function listArticlesForAdmin(
  filters: AdminArticleFilters,
  limit = ADMIN_ARTICLE_LIST_LIMIT,
): Promise<AdminArticleList> {
  // An interactive transaction always opens one. Prisma sends a batch that
  // holds a single query without a transaction, dropping its isolation level.
  const { categories, groups, articles } = await db.$transaction(
    async (tx) => ({
      categories: await tx.category.findMany({
        orderBy: [{ displayOrder: "asc" }, { slug: "asc" }],
        select: { id: true, slug: true, name: true, isActive: true },
      }),
      groups: await tx.article.groupBy({
        by: ["status", "categoryId"],
        _count: { _all: true },
      }),
      articles: await tx.article.findMany({
        where: {
          status: filters.status,
          category: filters.category ? { slug: filters.category } : undefined,
        },
        orderBy: [{ sourcePublishedAt: "desc" }, { id: "asc" }],
        take: limit,
        select: adminArticleRowSelect,
      }),
    }),
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );

  const categoryId = categories.find(
    ({ slug }) => slug === filters.category,
  )?.id;
  const statusCounts = emptyStatusCounts();
  const categoryCounts = new Map<string, number>();
  let total = 0;

  for (const { status, categoryId: groupCategoryId, _count } of groups) {
    const inCategory = !categoryId || groupCategoryId === categoryId;
    const inStatus = !filters.status || status === filters.status;

    if (inCategory) {
      statusCounts[status] += _count._all;
    }

    if (inStatus) {
      categoryCounts.set(
        groupCategoryId,
        (categoryCounts.get(groupCategoryId) ?? 0) + _count._all,
      );
    }

    if (inCategory && inStatus) {
      total += _count._all;
    }
  }

  return {
    articles,
    total,
    statusCounts,
    categories: categories.map(({ id, ...category }) => ({
      ...category,
      count: categoryCounts.get(id) ?? 0,
    })),
  };
}

const moderationEventSelect = {
  id: true,
  action: true,
  reason: true,
  before: true,
  after: true,
  createdAt: true,
  actor: { select: { name: true } },
} satisfies Prisma.ModerationEventSelect;

export type ModerationEventRow = Prisma.ModerationEventGetPayload<{
  select: typeof moderationEventSelect;
}>;

/**
 * An article in any status, as the reader would show it, with what an admin
 * needs beside it: its status, its category's state, its record dates and
 * its moderation history.
 */
export type AdminArticleDetail = ArticleDetail & {
  id: string;
  status: ArticleStatus;
  categoryIsActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Newest first. */
  history: ModerationEventRow[];
};

/**
 * An article in any status, or null. Memoized per request, so metadata and
 * the page share one database read.
 */
export const getArticleForAdmin = cache(
  async (id: string): Promise<AdminArticleDetail | null> => {
    const parsedId = articleIdSchema.safeParse(id);

    if (!parsedId.success) {
      return null;
    }

    const article = await db.article.findUnique({
      where: { id: parsedId.data },
      select: {
        ...articleDetailSelect,
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { slug: true, name: true, isActive: true } },
        moderationEvents: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: moderationEventSelect,
        },
      },
    });

    if (!article) {
      return null;
    }

    const {
      id: articleId,
      status,
      createdAt,
      updatedAt,
      moderationEvents,
      category: { isActive, ...category },
      ...detail
    } = article;

    return {
      ...toArticleDetail({ ...detail, category }),
      id: articleId,
      status,
      categoryIsActive: isActive,
      createdAt,
      updatedAt,
      history: moderationEvents,
    };
  },
);
