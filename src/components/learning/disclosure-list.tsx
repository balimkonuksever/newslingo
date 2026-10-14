import type { ReactNode } from "react";

/** A bordered list of rows that open to more detail; see `DisclosureRow`. */
export function DisclosureList({ children }: { children: ReactNode }) {
  return (
    <ul className="disclosure-list divide-y divide-rule rounded-xl border border-rule bg-surface">
      {children}
    </ul>
  );
}

/**
 * One row of a `DisclosureList`: `summary` always shows, `children` when the
 * row is open. Rows are native disclosure widgets, so they work without
 * JavaScript.
 */
export function DisclosureRow({
  summary,
  children,
}: {
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <li>
      <details className="group">
        <summary className="flex cursor-pointer items-start justify-between gap-4 rounded-xl px-4 py-3 hover:bg-paper">
          <span className="min-w-0">{summary}</span>
          <span
            aria-hidden="true"
            className="mt-1 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </summary>
        <div className="px-4 pb-4">{children}</div>
      </details>
    </li>
  );
}
