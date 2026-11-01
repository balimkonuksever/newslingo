import "server-only";

import { connection } from "next/server";

import { env } from "@/lib/env";

/**
 * True while `pnpm site:build` builds the static site for GitHub Pages
 * (IMPLEMENTATION_PLAN.md M9): every public page is rendered once, from a
 * database holding only the written articles.
 */
export const isSiteBuild = process.env.SITE_BUILD === "1";

/**
 * On the local server, a public page reads PostgreSQL at request time, so a
 * published or archived article shows at once. The static site renders it
 * once at build time instead. Call this before a public page's queries.
 */
export async function renderPerRequest() {
  if (!isSiteBuild) {
    await connection();
  }
}

/**
 * A dynamic route's parameters: every public one in the static site, and
 * none on the local server, which renders each page when it is asked for.
 */
export async function staticParams<T>(list: () => Promise<T[]>) {
  return isSiteBuild ? list() : [];
}

/**
 * A page's absolute address, as the site serves it: the static site's pages
 * live under its base path, which NEXT_PUBLIC_SITE_URL includes, and end with
 * a slash.
 */
export function pageUrl(path: string) {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/u, "");

  return `${base}${path}${isSiteBuild && !path.endsWith("/") ? "/" : ""}`;
}
