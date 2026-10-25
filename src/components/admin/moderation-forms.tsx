"use client";

import { type ReactNode, useActionState, useId } from "react";

import {
  archive,
  changeCategory,
  changeLevel,
  type ModerationFormState,
  publish,
  restore,
} from "@/app/admin/articles/actions";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { MAX_REASON_LENGTH, MODERATION_RULES } from "@/domain/moderation";
import type { Difficulty, ModerationAction } from "@/generated/prisma/enums";
import { DIFFICULTIES, DIFFICULTY_LABELS } from "@/lib/difficulty";

type Action = (
  previous: ModerationFormState,
  formData: FormData,
) => Promise<ModerationFormState>;

const controlClass =
  "min-h-11 w-full rounded-lg border border-rule-strong bg-surface px-3 text-base text-ink";

function Refusal({ state }: { state: ModerationFormState }) {
  if (!state.message) {
    return null;
  }

  return (
    <div role="alert" className="text-sm font-medium text-brand">
      <p>{state.message}</p>
      {state.problems && state.problems.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {state.problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One moderation action as its own form: what it does, any choice it needs,
 * the reason the rules ask for, and the server's refusal if there is one.
 * Without JavaScript it is a plain form post.
 */
function ModerationForm({
  moderationAction,
  action,
  articleId,
  title,
  description,
  submitLabel,
  pendingLabel,
  primary = false,
  children,
}: {
  moderationAction: ModerationAction;
  action: Action;
  articleId: string;
  title: string;
  description: string;
  submitLabel: string;
  pendingLabel: string;
  primary?: boolean;
  /** Fields for the action's choice, given the state to fill them from. */
  children?: (state: ModerationFormState) => ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const headingId = useId();
  const { reasonRequired } = MODERATION_RULES[moderationAction];

  return (
    <form
      action={formAction}
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-lg border border-rule bg-surface p-4"
    >
      <input type="hidden" name="articleId" value={articleId} />
      <div>
        <h3 id={headingId} className="font-semibold text-ink">
          {title}
        </h3>
        <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
      </div>
      {children?.(state)}
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        {reasonRequired ? "Reason" : "Note (optional)"}
        <textarea
          name="reason"
          rows={2}
          required={reasonRequired}
          maxLength={MAX_REASON_LENGTH}
          defaultValue={state.reason}
          className={`${controlClass} py-2`}
        />
      </label>
      <Refusal state={state} />
      <div>
        <button
          type="submit"
          disabled={pending}
          aria-disabled={pending}
          className={primary ? primaryButton : secondaryButton}
        >
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

type FormProps = { articleId: string };

export function PublishForm({ articleId }: FormProps) {
  return (
    <ModerationForm
      moderationAction="PUBLISH"
      action={publish}
      articleId={articleId}
      title="Publish"
      description="Checks that the article is complete, then puts it on the site."
      submitLabel="Publish"
      pendingLabel="Publishing…"
      primary
    />
  );
}

export function ArchiveForm({
  articleId,
  isDraft,
}: FormProps & { isDraft: boolean }) {
  return (
    <ModerationForm
      moderationAction="ARCHIVE"
      action={archive}
      articleId={articleId}
      title={isDraft ? "Reject" : "Archive"}
      description={
        isDraft
          ? "Archives the draft without publishing it. It can be restored later."
          : "Takes the article off the site. It is kept here and can be restored."
      }
      submitLabel={isDraft ? "Reject" : "Archive"}
      pendingLabel={isDraft ? "Rejecting…" : "Archiving…"}
    />
  );
}

export function RestoreForm({ articleId }: FormProps) {
  return (
    <ModerationForm
      moderationAction="RESTORE"
      action={restore}
      articleId={articleId}
      title="Restore to draft"
      description="Brings the article back as a draft, to be reviewed again."
      submitLabel="Restore to draft"
      pendingLabel="Restoring…"
    />
  );
}

function ChoiceField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
      {label}
      {children}
    </label>
  );
}

export function CategoryForm({
  articleId,
  category,
  categories,
}: FormProps & {
  /** The article's category. */
  category: string;
  /** The categories it may move to: the active ones. */
  categories: ReadonlyArray<{ slug: string; name: string }>;
}) {
  return (
    <ModerationForm
      moderationAction="CHANGE_CATEGORY"
      action={changeCategory}
      articleId={articleId}
      title="Change the category"
      description="Moves the article to another active category."
      submitLabel="Change category"
      pendingLabel="Changing…"
    >
      {(state) => (
        <ChoiceField label="Category">
          <select
            name="categorySlug"
            defaultValue={state.choice ?? category}
            className={controlClass}
          >
            {categories.map(({ slug, name }) => (
              <option key={slug} value={slug}>
                {slug === category ? `${name} (current)` : name}
              </option>
            ))}
          </select>
        </ChoiceField>
      )}
    </ModerationForm>
  );
}

export function LevelForm({
  articleId,
  level,
}: FormProps & { level: Difficulty }) {
  return (
    <ModerationForm
      moderationAction="CHANGE_DIFFICULTY"
      action={changeLevel}
      articleId={articleId}
      title="Change the level"
      description="Corrects the CEFR level the article is labelled with."
      submitLabel="Change level"
      pendingLabel="Changing…"
    >
      {(state) => (
        <ChoiceField label="Level">
          <select
            name="difficulty"
            defaultValue={state.choice ?? level}
            className={controlClass}
          >
            {DIFFICULTIES.map((option) => (
              <option key={option} value={option}>
                {`${option} · ${DIFFICULTY_LABELS[option]}${
                  option === level ? " (current)" : ""
                }`}
              </option>
            ))}
          </select>
        </ChoiceField>
      )}
    </ModerationForm>
  );
}
