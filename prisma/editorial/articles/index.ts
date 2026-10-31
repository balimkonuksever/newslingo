/*
 * The written articles (milestone W): production content that Claude writes
 * in Claude Code sessions and the user reviews in the admin before
 * publishing. Each article lives in its own file in this folder, named after
 * its slug, and is listed here; a unit test checks that every file is.
 * `pnpm articles:import` checks them all and writes new and changed ones as
 * drafts. The format is `WrittenArticle` in prisma/written-articles.ts.
 */
import type { WrittenArticle } from "../../written-articles";
import { ALDI_AND_LIDL_SUPERMARKET_RULES } from "./aldi-and-lidl-must-follow-the-same-rules-as-big-supermarkets";
import { HOW_PERFUME_IS_MADE } from "./how-perfume-is-made";
import { HOW_SUBTITLES_WORK } from "./how-subtitles-work";

export const WRITTEN_ARTICLES: readonly WrittenArticle[] = [
  ALDI_AND_LIDL_SUPERMARKET_RULES,
  HOW_SUBTITLES_WORK,
  HOW_PERFUME_IS_MADE,
];
