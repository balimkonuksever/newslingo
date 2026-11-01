import type { ReactNode } from "react";

import { listCategoriesWithArticleCounts } from "@/server/categories/queries";

// Only the static site has this file (next.config.ts): it renders each
// active category's page and expressions page. The local server renders
// them when they are asked for.
export async function generateStaticParams() {
  return (await listCategoriesWithArticleCounts()).map(({ slug }) => ({
    slug,
  }));
}

export default function CategorySiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
