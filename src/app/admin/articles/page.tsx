import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { StatusBadge } from "@/components/admin/status-badge";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { eyebrow, primaryButton, textLink } from "@/components/ui/styles";
import { ARTICLE_STATUS_NAMES, ARTICLE_STATUSES } from "@/domain/moderation";
import {
  ADMIN_ARTICLES_PATH,
  parseAdminArticleFilters,
  statusParam,
} from "@/lib/admin-article-filters";
import { formatArticleDate } from "@/lib/dates";
import { formatArticleCount } from "@/lib/format";
import { requireAdmin } from "@/server/auth/session";
import {
  listArticlesForAdmin,
  listCategoriesForAdmin,
} from "@/server/moderation/queries";

export const metadata: Metadata = {
  title: "Articles",
};

const controlClass =
  "min-h-11 w-full rounded-lg border border-rule-strong bg-surface px-3 text-base text-ink";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
      {label}
      {children}
    </label>
  );
}

export default async function AdminArticlesPage(
  props: PageProps<"/admin/articles">,
) {
  const admin = await requireAdmin();
  const [searchParams, allCategories] = await Promise.all([
    props.searchParams,
    listCategoriesForAdmin(),
  ]);
  const filters = parseAdminArticleFilters(
    searchParams,
    allCategories.map(({ slug }) => slug),
  );
  const { articles, total, statusCounts, categories } =
    await listArticlesForAdmin(filters);
  const isFiltered = Boolean(filters.status || filters.category);
  const statusTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const categoryTotal = categories.reduce((sum, { count }) => sum + count, 0);

  return (
    <>
      <AdminNav adminName={admin.name} current={ADMIN_ARTICLES_PATH} />
      <div className="mx-auto max-w-page px-4 py-8 sm:px-6 sm:py-12">
        <p className={eyebrow}>Admin</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Articles
        </h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Every article in any status, newest story first. Status counts are for
          the chosen category, and category counts for the chosen status.
        </p>

        {/* A plain GET form: the filters live in the URL, so a view can be
            shared or reloaded. */}
        <form
          action={ADMIN_ARTICLES_PATH}
          method="get"
          aria-label="Filter articles"
          className="mt-6 grid gap-4 rounded-xl border border-rule bg-surface p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <Field label="Status">
            <select
              name="status"
              defaultValue={filters.status ? statusParam(filters.status) : ""}
              className={controlClass}
            >
              <option value="">{`All statuses (${statusTotal})`}</option>
              {ARTICLE_STATUSES.map((status) => (
                <option key={status} value={statusParam(status)}>
                  {`${ARTICLE_STATUS_NAMES[status]} (${statusCounts[status]})`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select
              name="category"
              defaultValue={filters.category ?? ""}
              className={controlClass}
            >
              <option value="">{`All categories (${categoryTotal})`}</option>
              {categories.map(({ slug, name, isActive, count }) => (
                <option key={slug} value={slug}>
                  {`${name}${isActive ? "" : ", switched off"} (${count})`}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <button type="submit" className={primaryButton}>
              Show articles
            </button>
            {isFiltered && (
              <Link href={ADMIN_ARTICLES_PATH} className={textLink}>
                Clear filters
              </Link>
            )}
          </div>
        </form>

        <p className="mt-8 font-medium text-ink">
          {total > articles.length
            ? `Showing the newest ${articles.length} of ${formatArticleCount(total)}. Narrow the filters to see the rest.`
            : isFiltered
              ? `${formatArticleCount(total)} ${total === 1 ? "matches" : "match"} these filters.`
              : `${formatArticleCount(total)}.`}
        </p>

        {articles.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No articles match these filters">
              {isFiltered && (
                <Link href={ADMIN_ARTICLES_PATH} className={textLink}>
                  Show every article
                </Link>
              )}
            </EmptyState>
          </div>
        ) : (
          <ol
            aria-label="Matching articles"
            className="mt-4 divide-y divide-rule border-y border-rule"
          >
            {articles.map((article) => (
              <li key={article.id} className="py-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <StatusBadge status={article.status} />
                  <DifficultyBadge level={article.difficulty} />
                  <span className="text-ink-muted">
                    {article.category.name}
                  </span>
                </div>
                <h2 className="mt-1.5 font-serif text-xl leading-snug font-semibold wrap-break-word text-ink">
                  <Link
                    href={`${ADMIN_ARTICLES_PATH}/${article.id}`}
                    className="hover:underline"
                  >
                    {article.title}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {article.kind === "EXPLAINER" ? "Written" : "Story from"}{" "}
                  <time dateTime={article.datedAt.toISOString()}>
                    {formatArticleDate(article.datedAt)}
                  </time>
                  {" · "}
                  {article.publishedOnSiteAt ? (
                    <>
                      First published{" "}
                      <time dateTime={article.publishedOnSiteAt.toISOString()}>
                        {formatArticleDate(article.publishedOnSiteAt)}
                      </time>
                    </>
                  ) : (
                    "Never published"
                  )}
                  {" · "}
                  Changed{" "}
                  <time dateTime={article.updatedAt.toISOString()}>
                    {formatArticleDate(article.updatedAt)}
                  </time>
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
