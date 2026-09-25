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
    <header className="border-b border-rule">
      <div className="mx-auto max-w-page px-4 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pt-5 pb-3">
          <Link
            href="/"
            className="rounded-sm font-serif text-3xl font-semibold tracking-tight text-ink"
          >
            News<span className="text-brand">lingo</span>
          </Link>
          <p className="text-sm text-ink-muted">
            English news for Turkish speakers
          </p>
        </div>
        {categories.length > 0 && <CategoryNav categories={categories} />}
      </div>
    </header>
  );
}
