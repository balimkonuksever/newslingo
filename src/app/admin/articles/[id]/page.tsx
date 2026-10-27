import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import type { ModerationNotice } from "@/app/admin/articles/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import {
  ArchiveForm,
  CategoryForm,
  LevelForm,
  PublishForm,
  RestoreForm,
} from "@/components/admin/moderation-forms";
import { ModerationHistory } from "@/components/admin/moderation-history";
import { StatusBadge } from "@/components/admin/status-badge";
import { ArticleView } from "@/components/article/article-view";
import { eyebrow, textLink } from "@/components/ui/styles";
import { canModerate, isWebAddress } from "@/domain/moderation";
import { ADMIN_ARTICLES_PATH } from "@/lib/admin-article-filters";
import { formatArticleDate, formatDateTime } from "@/lib/dates";
import { formatWordCount } from "@/lib/format";
import { requireAdmin } from "@/server/auth/session";
import {
  type AdminArticleDetail,
  getArticleForAdmin,
  listCategoriesForAdmin,
} from "@/server/moderation/queries";

const NOTICES: Record<ModerationNotice, string> = {
  published: "Published. Readers can see the article now.",
  archived: "Archived. Readers can no longer see the article.",
  restored: "Restored to draft. Review it again before publishing.",
  category: "The category was changed.",
  level: "The level was changed.",
};

function noticeFor(done: string | string[] | undefined) {
  return typeof done === "string" && done in NOTICES
    ? NOTICES[done as ModerationNotice]
    : undefined;
}

export async function generateMetadata(
  props: PageProps<"/admin/articles/[id]">,
): Promise<Metadata> {
  await requireAdmin();
  const { id } = await props.params;
  const article = await getArticleForAdmin(id);

  if (!article) {
    notFound();
  }

  return { title: article.title };
}

/** Where the article stands for readers, in one line. */
function visibility(article: AdminArticleDetail) {
  if (article.status !== "PUBLISHED") {
    return "Readers can’t see it.";
  }

  if (!article.categoryIsActive) {
    return "Readers can’t see it, because its category is switched off.";
  }

  return article.publishedOnSiteAt
    ? `On the site since ${formatArticleDate(article.publishedOnSiteAt)}.`
    : "On the site.";
}

function sourceRows({
  sourceName,
  sourceUrl,
  sourcePublishedAt,
}: AdminArticleDetail): Array<[string, ReactNode]> {
  // The database requires all three on news and forbids them on explainers.
  if (!sourceName || !sourceUrl || !sourcePublishedAt) {
    return [["Source", "None: an explainer lists references instead"]];
  }

  return [
    ["Source", sourceName],
    [
      "Original article",
      // Only a web address becomes a link, so a stored `javascript:` URL or
      // the like is shown as text and never runs.
      isWebAddress(sourceUrl) ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${textLink} break-all`}
        >
          {sourceUrl}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <span className="break-all">{sourceUrl}</span>
      ),
    ],
    ["Source published", formatDateTime(sourcePublishedAt)],
  ];
}

function SourceDetails({ article }: { article: AdminArticleDetail }) {
  const rows: Array<[string, ReactNode]> = [
    ...sourceRows(article),
    ["Added", formatDateTime(article.createdAt)],
    ["Last changed", formatDateTime(article.updatedAt)],
    [
      "Length",
      `${formatWordCount(article.wordCount)}, ${article.readingTimeMinutes} min read`,
    ],
    ["Address on the site", `/article/${article.slug}`],
  ];

  return (
    <dl className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[auto_minmax(0,1fr)]">
      {rows.map(([term, detail]) => (
        <div key={term} className="contents">
          <dt className="font-medium text-ink-muted">{term}</dt>
          <dd className="-mt-2 text-ink sm:mt-0 lg:-mt-2 xl:mt-0">{detail}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function AdminArticlePage(
  props: PageProps<"/admin/articles/[id]">,
) {
  const admin = await requireAdmin();
  const [{ id }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);
  const [article, categories] = await Promise.all([
    getArticleForAdmin(id),
    listCategoriesForAdmin(),
  ]);

  if (!article) {
    notFound();
  }

  const notice = noticeFor(searchParams.done);
  const isPublic = article.status === "PUBLISHED" && article.categoryIsActive;
  const categoryNames = new Map(
    categories.map(({ slug, name }) => [slug, name]),
  );
  const activeCategories = categories.filter(({ isActive }) => isActive);
  const forms = [
    canModerate("PUBLISH", article.status) && (
      <PublishForm key="publish" articleId={article.id} />
    ),
    canModerate("ARCHIVE", article.status) && (
      <ArchiveForm
        key="archive"
        articleId={article.id}
        isDraft={article.status === "DRAFT"}
      />
    ),
    canModerate("RESTORE", article.status) && (
      <RestoreForm key="restore" articleId={article.id} />
    ),
    canModerate("CHANGE_CATEGORY", article.status) && (
      <CategoryForm
        key="category"
        articleId={article.id}
        category={article.category.slug}
        categories={activeCategories}
      />
    ),
    canModerate("CHANGE_DIFFICULTY", article.status) && (
      <LevelForm
        key="level"
        articleId={article.id}
        level={article.difficulty}
      />
    ),
  ].filter(Boolean);

  return (
    <>
      <AdminNav adminName={admin.name} current={ADMIN_ARTICLES_PATH} />
      <div className="mx-auto max-w-page px-4 py-8 sm:px-6">
        <p className="text-sm">
          <Link href={ADMIN_ARTICLES_PATH} className={textLink}>
            <span aria-hidden="true">← </span>All articles
          </Link>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatusBadge status={article.status} />
          <p className="text-ink-muted">{visibility(article)}</p>
          {isPublic && (
            <Link href={`/article/${article.slug}`} className={textLink}>
              Open on the site
            </Link>
          )}
          <a href="#moderation" className={`${textLink} lg:hidden`}>
            Go to the actions
          </a>
        </div>
        {notice && (
          <p
            role="status"
            className="mt-4 rounded-lg bg-highlight px-3 py-2 text-ink"
          >
            {notice}
          </p>
        )}

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,42rem)_minmax(0,1fr)] lg:items-start">
          <section
            aria-label="Preview"
            className="rounded-xl border border-rule-strong bg-paper"
          >
            <p className={`${eyebrow} border-b border-rule px-4 py-3 sm:px-6`}>
              Preview, as readers will see it
              {!isPublic && (
                <span className="mt-1 block font-normal tracking-normal normal-case">
                  Word lookups answer only once the article is on the site.
                </span>
              )}
            </p>
            <ArticleView article={article} />
          </section>

          <div className="flex flex-col gap-10">
            <section aria-labelledby="moderation" className="scroll-mt-4">
              <h2
                id="moderation"
                className="font-serif text-2xl font-semibold tracking-tight text-ink"
              >
                Moderation
              </h2>
              {forms.length > 0 ? (
                // A new history row remounts the forms, clearing their
                // messages and fields after each change.
                <div
                  key={article.history.length}
                  className="mt-4 flex flex-col gap-4"
                >
                  {forms}
                </div>
              ) : (
                <p className="mt-2 text-ink-muted">
                  No moderation action applies while an article is{" "}
                  {article.status === "FAILED" ? "failed" : "in the pipeline"}.
                </p>
              )}
            </section>

            <section aria-labelledby="source-details">
              <h2
                id="source-details"
                className="font-serif text-2xl font-semibold tracking-tight text-ink"
              >
                Source details
              </h2>
              <div className="mt-4">
                <SourceDetails article={article} />
              </div>
            </section>

            <section aria-labelledby="history">
              <h2
                id="history"
                className="font-serif text-2xl font-semibold tracking-tight text-ink"
              >
                History
              </h2>
              <div className="mt-4">
                <ModerationHistory
                  events={article.history}
                  categoryNames={categoryNames}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
