import { ARTICLE_STATUSES } from "@/domain/moderation";
import type { ArticleStatus } from "@/generated/prisma/enums";
import type { SearchParams } from "@/lib/article-filters";

/** The admin article list's filters. An absent key means "no filter". */
export type AdminArticleFilters = {
  status?: ArticleStatus;
  /** A category's slug, active or not. */
  category?: string;
};

export const ADMIN_ARTICLES_PATH = "/admin/articles";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** A status as the URL writes it, such as `draft`. */
export function statusParam(status: ArticleStatus) {
  return status.toLowerCase();
}

/**
 * Reads the admin list's filters from URL search parameters, as in
 * `?status=draft&category=world`. Unknown or empty values are dropped, and a
 * category must be one of `categorySlugs`.
 */
export function parseAdminArticleFilters(
  searchParams: SearchParams,
  categorySlugs: readonly string[],
): AdminArticleFilters {
  const filters: AdminArticleFilters = {};

  const status = firstValue(searchParams.status);
  const matchingStatus = ARTICLE_STATUSES.find(
    (candidate) => statusParam(candidate) === status,
  );
  if (matchingStatus) {
    filters.status = matchingStatus;
  }

  const category = firstValue(searchParams.category);
  if (category && categorySlugs.includes(category)) {
    filters.category = category;
  }

  return filters;
}

/** The admin list's URL for `filters`. */
export function adminArticlesHref({ status, category }: AdminArticleFilters) {
  const params = new URLSearchParams();

  if (status) {
    params.set("status", statusParam(status));
  }

  if (category) {
    params.set("category", category);
  }

  const query = params.toString();

  return query ? `${ADMIN_ARTICLES_PATH}?${query}` : ADMIN_ARTICLES_PATH;
}
