import { ARTICLE_STATUS_NAMES } from "@/domain/moderation";
import type { ArticleStatus, ModerationAction } from "@/generated/prisma/enums";
import { formatArticleDate, formatDateTime } from "@/lib/dates";
import type { ModerationEventRow } from "@/server/moderation/queries";

type JsonFields = Record<string, unknown>;

const EVENT_NAMES: Record<ModerationAction, string> = {
  PUBLISH: "Published",
  ARCHIVE: "Archived",
  RESTORE: "Restored to draft",
  CHANGE_CATEGORY: "Changed the category",
  CHANGE_DIFFICULTY: "Changed the level",
};

const FIELD_NAMES: Record<string, string> = {
  status: "Status",
  publishedOnSiteAt: "On the site since",
  category: "Category",
  difficulty: "Level",
};

function fieldsOf(value: unknown): JsonFields {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonFields)
    : {};
}

function isStatus(value: unknown): value is ArticleStatus {
  return typeof value === "string" && value in ARTICLE_STATUS_NAMES;
}

/** One stored value as an admin reads it. */
function describeValue(
  field: string,
  value: unknown,
  categoryNames: ReadonlyMap<string, string>,
) {
  if (value === null || value === undefined) {
    return field === "publishedOnSiteAt" ? "never" : "none";
  }

  if (field === "status" && isStatus(value)) {
    return ARTICLE_STATUS_NAMES[value];
  }

  if (field === "category" && typeof value === "string") {
    return categoryNames.get(value) ?? value;
  }

  if (field === "publishedOnSiteAt" && typeof value === "string") {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : formatArticleDate(date);
  }

  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * The fields an event changed, as "before → after" lines. Fields that kept
 * their value, such as the first publication date on republishing, are left
 * out.
 */
function describeChanges(
  { before, after }: Pick<ModerationEventRow, "before" | "after">,
  categoryNames: ReadonlyMap<string, string>,
) {
  const old = fieldsOf(before);
  const changed = fieldsOf(after);

  return Object.keys(changed)
    .filter(
      (field) => JSON.stringify(old[field]) !== JSON.stringify(changed[field]),
    )
    .map((field) => ({
      field: FIELD_NAMES[field] ?? field,
      before: describeValue(field, old[field], categoryNames),
      after: describeValue(field, changed[field], categoryNames),
    }));
}

/** What the event did, naming an archived draft a rejection. */
function eventName({ action, before }: ModerationEventRow) {
  return action === "ARCHIVE" && fieldsOf(before).status === "DRAFT"
    ? "Rejected"
    : EVENT_NAMES[action];
}

/** An article's moderation history, newest first, as the audit rows hold it. */
export function ModerationHistory({
  events,
  categoryNames,
}: {
  events: readonly ModerationEventRow[];
  /** Category names by slug, for events that moved the article. */
  categoryNames: ReadonlyMap<string, string>;
}) {
  if (events.length === 0) {
    return (
      <p className="text-ink-muted">
        Nothing has been done to this article yet.
      </p>
    );
  }

  return (
    <ol aria-label="Moderation history" className="flex flex-col gap-4">
      {events.map((event) => {
        const changes = describeChanges(event, categoryNames);

        return (
          <li
            key={event.id}
            className="rounded-lg border border-rule bg-surface p-4 text-sm"
          >
            <p className="font-semibold text-ink">{eventName(event)}</p>
            <p className="mt-0.5 text-ink-muted">
              by {event.actor.name},{" "}
              <time dateTime={event.createdAt.toISOString()}>
                {formatDateTime(event.createdAt)}
              </time>
            </p>
            {event.reason && (
              <p className="mt-2 wrap-break-word text-ink">
                <span className="font-medium">
                  {event.action === "PUBLISH" ? "Note: " : "Reason: "}
                </span>
                {event.reason}
              </p>
            )}
            {changes.length > 0 && (
              <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
                {changes.map(({ field, before, after }) => (
                  <div key={field} className="contents">
                    <dt className="text-ink-muted">{field}</dt>
                    <dd className="text-ink">
                      {before} <span aria-hidden="true">→</span>
                      <span className="sr-only">changed to</span> {after}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        );
      })}
    </ol>
  );
}
