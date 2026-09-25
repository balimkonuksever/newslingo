import { z } from "zod";

import type { Difficulty } from "@/generated/prisma/enums";
import { startOfDisplayDay, startOfNextDisplayDay } from "@/lib/dates";
import { DIFFICULTIES } from "@/lib/difficulty";
import { READING_TIME_BANDS, type ReadingTimeBand } from "@/lib/reading-time";

/** Homepage filters after validation. An absent key means "no filter". */
export type ArticleFilters = {
  category?: string;
  level?: Difficulty;
  length?: ReadingTimeBand;
  /** First Istanbul calendar day to include, as `YYYY-MM-DD`. */
  from?: string;
  /** Last Istanbul calendar day to include, as `YYYY-MM-DD`. */
  to?: string;
};

export type SearchParams = Record<string, string | string[] | undefined>;

const levelSchema = z.enum(DIFFICULTIES);
const lengthSchema = z.enum(
  Object.keys(READING_TIME_BANDS) as [ReadingTimeBand, ...ReadingTimeBand[]],
);
const isoDateSchema = z.iso.date();

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Reads the homepage filters from URL search parameters. Invalid, unknown or
 * empty values are dropped rather than trusted, a category must be one of
 * `categorySlugs`, and a reversed date range is put back in order.
 */
export function parseArticleFilters(
  searchParams: SearchParams,
  categorySlugs: readonly string[],
): ArticleFilters {
  const filters: ArticleFilters = {};

  const category = firstValue(searchParams.category);
  if (category && categorySlugs.includes(category)) {
    filters.category = category;
  }

  const level = levelSchema.safeParse(firstValue(searchParams.level));
  if (level.success) {
    filters.level = level.data;
  }

  const length = lengthSchema.safeParse(firstValue(searchParams.length));
  if (length.success) {
    filters.length = length.data;
  }

  let from = isoDateSchema.safeParse(firstValue(searchParams.from)).data;
  let to = isoDateSchema.safeParse(firstValue(searchParams.to)).data;

  // ISO dates compare correctly as strings.
  if (from && to && from > to) {
    [from, to] = [to, from];
  }

  if (from) {
    filters.from = from;
  }

  if (to) {
    filters.to = to;
  }

  return filters;
}

export function hasActiveFilters(filters: ArticleFilters) {
  return Object.values(filters).some((value) => value !== undefined);
}

/** The source-publication instants covered by the filter's date range. */
export function sourceDateRange({ from, to }: ArticleFilters) {
  if (!from && !to) {
    return undefined;
  }

  return {
    ...(from && { gte: startOfDisplayDay(from) }),
    ...(to && { lt: startOfNextDisplayDay(to) }),
  };
}
