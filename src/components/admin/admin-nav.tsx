import Link from "next/link";

import { signOut } from "@/app/admin/actions";
import { ADMIN_ARTICLES_PATH } from "@/lib/admin-article-filters";

const links = [
  { href: "/admin", label: "Overview" },
  { href: ADMIN_ARTICLES_PATH, label: "Articles" },
] as const;

/**
 * The admin pages' own navigation, with the signed-in admin and a way to sign
 * out. Pages render it after `requireAdmin()`, which supplies the name.
 */
export function AdminNav({
  adminName,
  current,
}: {
  adminName: string;
  /** The link for the page being shown, or the section it belongs to. */
  current: (typeof links)[number]["href"];
}) {
  return (
    <div className="border-b border-rule bg-surface">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
        <nav aria-label="Admin">
          <ul className="flex gap-1">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={href === current ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors ${
                    href === current
                      ? "bg-ink text-paper"
                      : "text-ink-muted hover:bg-rule/70 hover:text-ink"
                  }`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <form
          action={signOut}
          className="flex flex-wrap items-center gap-x-3 text-sm text-ink-muted"
        >
          <span>Signed in as {adminName}</span>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-md px-3 font-medium text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
