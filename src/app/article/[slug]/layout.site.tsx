import type { ReactNode } from "react";

import { listPublicArticleSlugs } from "@/server/articles/queries";

// Only the static site has this file (next.config.ts): it renders one page
// per public article. The local server renders each one when it is asked for.
export function generateStaticParams() {
  return listPublicArticleSlugs();
}

export default function ArticleSiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
