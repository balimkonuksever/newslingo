/*
 * The written articles (milestone W): production content that Claude writes
 * in Claude Code sessions and the user reviews in the admin before
 * publishing. Each article lives in its own file in this folder, named after
 * its slug, and is listed here; a unit test checks that every file is.
 * `pnpm articles:import` checks them all and writes new and changed ones as
 * drafts. The format is `WrittenArticle` in prisma/written-articles.ts.
 */
import type { WrittenArticle } from "../../written-articles";

export const WRITTEN_ARTICLES: readonly WrittenArticle[] = [];
