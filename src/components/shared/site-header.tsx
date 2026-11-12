import Link from "next/link";

import { CategoryNav } from "@/components/shared/category-nav";
import { listCategoriesWithArticleCounts } from "@/server/categories/queries";

async function loadNavigationCategories() {
  try {
    const categories = await listCategoriesWithArticleCounts();

    return categories.map(({ slug, name }) => ({ slug, name }));
  } catch (error) {
    // The page's own error boundary reports the failure. Without categories
    // the header still renders, so that report appears inside the site frame.
    console.error("Could not load the navigation categories.", error);

    return [];
  }
}

export async function SiteHeader() {
  const categories = await loadNavigationCategories();

  return (
    // The rule stays within the page, clear of the side vines (globals.css).
    <header>
      <div className="mx-auto max-w-page border-b border-rule px-4 sm:px-6">
        <div className="flex items-center justify-between gap-x-6 pt-5 pb-3">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <Link
              href="/"
              className="rounded-sm font-serif text-4xl font-semibold tracking-tight text-ink sm:text-[3.25rem]"
            >
              News
              <span className="font-medium tracking-[-0.01em] text-brand italic">
                lingo
              </span>
            </Link>
            <p className="text-sm text-ink-muted">
              English news for Turkish speakers
            </p>
          </div>
          <Link
            href="/search"
            className="-mr-3 inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-ink hover:bg-rule/70"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="m13 13 4.5 4.5" />
            </svg>
            Search
          </Link>
        </div>
        {categories.length > 0 && <CategoryNav categories={categories} />}
      </div>
    </header>
  );
}
