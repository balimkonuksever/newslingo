"use client";

import { type ReactNode, useActionState } from "react";

import {
  type SignInFormState,
  submitCode,
  submitPassword,
} from "@/app/admin/actions";
import { primaryButton } from "@/components/ui/styles";

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

function Refusal({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-sm font-medium text-brand">
      {message}
    </p>
  ) : null;
}

function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={primaryButton}
    >
      {pending ? "Checking…" : children}
    </button>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<SignInFormState, FormData>(
    submitPassword,
    {},
  );

  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      <Field label="Email address">
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          className={controlClass}
        />
      </Field>
      <Field label="Password">
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={controlClass}
        />
      </Field>
      <Refusal message={state.message} />
      <SubmitButton pending={pending}>Continue</SubmitButton>
    </form>
  );
}

export function CodeForm() {
  const [state, action, pending] = useActionState<SignInFormState, FormData>(
    submitCode,
    {},
  );

  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      <Field label="Code">
        <input
          name="code"
          autoComplete="one-time-code"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          className={controlClass}
        />
      </Field>
      <Refusal message={state.message} />
      <SubmitButton pending={pending}>Sign in</SubmitButton>
    </form>
  );
}
