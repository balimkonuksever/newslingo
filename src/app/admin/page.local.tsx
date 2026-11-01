import type { Metadata } from "next";
import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { eyebrow, primaryButton } from "@/components/ui/styles";
import { ARTICLE_STATUS_NAMES, ARTICLE_STATUSES } from "@/domain/moderation";
import {
  ADMIN_ARTICLES_PATH,
  adminArticlesHref,
} from "@/lib/admin-article-filters";
import { formatArticleCount } from "@/lib/format";
import { requireAdmin } from "@/server/auth/session";
import { countArticlesByStatus } from "@/server/moderation/queries";

export const metadata: Metadata = {
  title: { absolute: "Newslingo admin" },
};

export default async function AdminHomePage() {
  const admin = await requireAdmin();
  const counts = await countArticlesByStatus();
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <>
      <AdminNav adminName={admin.name} current="/admin" />
      <div className="mx-auto max-w-page px-4 py-8 sm:px-6 sm:py-12">
        <p className={eyebrow}>Admin</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Overview
        </h1>

        <section aria-labelledby="article-counts" className="mt-10">
          <h2
            id="article-counts"
            className="font-serif text-2xl font-semibold tracking-tight text-ink"
          >
            Articles by status
          </h2>
          <p className="mt-1 text-ink-muted">
            {formatArticleCount(total)} in all. Open a status to see its
            articles.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {ARTICLE_STATUSES.map((status) => (
              <li key={status}>
                <Link
                  href={adminArticlesHref({ status })}
                  className="flex h-full flex-col rounded-xl border border-rule bg-surface p-4 transition-shadow hover:shadow-md"
                >
                  <span className="text-sm font-medium text-ink-muted">
                    {ARTICLE_STATUS_NAMES[status]}
                  </span>
                  <span className="mt-1 font-serif text-3xl font-semibold text-ink">
                    {counts[status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6">
            <Link href={ADMIN_ARTICLES_PATH} className={primaryButton}>
              See all articles
            </Link>
          </p>
        </section>
      </div>
    </>
  );
}
