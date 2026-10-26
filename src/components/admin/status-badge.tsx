import { ARTICLE_STATUS_NAMES } from "@/domain/moderation";
import type { ArticleStatus } from "@/generated/prisma/enums";

// The level badges' colour pairs, which already meet WCAG AA contrast. The
// status is always written out, so colour is never its only sign.
const statusStyles: Record<ArticleStatus, string> = {
  DRAFT: "bg-level-b1-surface text-level-b1",
  PUBLISHED: "bg-level-a2-surface text-level-a2",
  ARCHIVED: "bg-rule text-ink-muted",
  FETCHED: "bg-rule text-ink-muted",
  PROCESSING: "bg-rule text-ink-muted",
  FAILED: "bg-level-c1-surface text-level-c1",
};

/** An article's status as a small badge. */
export function StatusBadge({ status }: { status: ArticleStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide ${statusStyles[status]}`}
    >
      {ARTICLE_STATUS_NAMES[status]}
    </span>
  );
}
