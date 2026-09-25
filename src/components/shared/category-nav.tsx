"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationCategory = { slug: string; name: string };

/** Category links; the current category is marked for assistive technology. */
export function CategoryNav({
  categories,
}: {
  categories: NavigationCategory[];
}) {
  const pathname = usePathname();

  return (
    // On narrow screens the list scrolls sideways instead of widening the page.
    <nav aria-label="Categories" className="-mx-4 overflow-x-auto sm:mx-0">
      <ul className="flex gap-1 px-4 pb-2 sm:px-0">
        {categories.map(({ slug, name }) => {
          const href = `/category/${slug}`;
          const isCurrent = pathname === href;

          return (
            <li key={slug} className="shrink-0">
              <Link
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors ${
                  isCurrent
                    ? "bg-ink text-paper"
                    : "text-ink-muted hover:bg-rule/70 hover:text-ink"
                }`}
              >
                {name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
