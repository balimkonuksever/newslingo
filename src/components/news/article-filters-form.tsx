"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useTransition } from "react";

import { primaryButton, textLink } from "@/components/ui/styles";
import type { ArticleFilters } from "@/lib/article-filters";
import { DIFFICULTIES, DIFFICULTY_LABELS } from "@/lib/difficulty";
import { READING_TIME_BANDS, type ReadingTimeBand } from "@/lib/reading-time";

type ArticleFiltersFormProps = {
  categories: Array<{ slug: string; name: string }>;
  filters: ArticleFilters;
  isFiltered: boolean;
};

const readingTimeBands = Object.entries(READING_TIME_BANDS) as Array<
  [ReadingTimeBand, (typeof READING_TIME_BANDS)[ReadingTimeBand]]
>;

const controlClass =
  "min-h-11 w-full rounded-lg border border-rule-strong bg-surface px-3 text-base text-ink";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
      {label}
      {children}
    </label>
  );
}

/**
 * Homepage filters. Without JavaScript this is a plain GET form. With it,
 * empty fields are left out of the URL and results load without a full
 * page reload.
 */
export function ArticleFiltersForm({
  categories,
  filters,
  isFiltered,
}: ArticleFiltersFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();

    for (const [name, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value !== "") {
        params.append(name, value);
      }
    }

    const query = params.toString();

    startTransition(() => {
      router.push(query ? `/?${query}` : "/", { scroll: false });
    });
  }

  return (
    <form
      action="/"
      method="get"
      aria-label="Filter articles"
      onSubmit={handleSubmit}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <Field label="Category">
        <select
          name="category"
          defaultValue={filters.category ?? ""}
          className={controlClass}
        >
          <option value="">All categories</option>
          {categories.map(({ slug, name }) => (
            <option key={slug} value={slug}>
              {name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Level">
        <select
          name="level"
          defaultValue={filters.level ?? ""}
          className={controlClass}
        >
          <option value="">All levels</option>
          {DIFFICULTIES.map((level) => (
            <option key={level} value={level}>
              {`${level} · ${DIFFICULTY_LABELS[level]}`}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Reading time">
        <select
          name="length"
          defaultValue={filters.length ?? ""}
          className={controlClass}
        >
          <option value="">Any length</option>
          {readingTimeBands.map(([band, { label }]) => (
            <option key={band} value={band}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Published from">
        <input
          type="date"
          name="from"
          defaultValue={filters.from ?? ""}
          className={controlClass}
        />
      </Field>
      <Field label="Published until">
        <input
          type="date"
          name="to"
          defaultValue={filters.to ?? ""}
          className={controlClass}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 sm:col-span-2 lg:col-span-1 lg:self-end">
        <button
          type="submit"
          aria-disabled={isPending}
          className={primaryButton}
        >
          {isPending ? "Updating…" : "Show articles"}
        </button>
        {isFiltered && (
          <Link href="/" scroll={false} className={textLink}>
            Clear filters
          </Link>
        )}
      </div>
    </form>
  );
}
