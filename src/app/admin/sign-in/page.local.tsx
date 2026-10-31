import type { Metadata } from "next";
import { redirect } from "next/navigation";

import type { AdminPageProps } from "@/app/admin/page-props";
import { PasswordForm } from "@/components/admin/sign-in-forms";
import { eyebrow } from "@/components/ui/styles";
import { ADMIN_PATHS, getSignedInAdmin } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Sign in",
};

const NOTICES = {
  denied: "That account can’t open admin pages. Sign in as an admin.",
  expired: "The sign-in took too long. Please start again.",
};

export default async function SignInPage({ searchParams }: AdminPageProps) {
  if (await getSignedInAdmin()) {
    redirect(ADMIN_PATHS.home);
  }

  const params = await searchParams;
  const notice =
    "denied" in params
      ? NOTICES.denied
      : "expired" in params
        ? NOTICES.expired
        : undefined;

  return (
    <div className="mx-auto max-w-sm px-4 py-12 sm:py-16">
      <p className={eyebrow}>Admin</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink">
        Sign in
      </h1>
      {notice ? (
        <p role="status" className="mt-4 rounded-lg bg-highlight px-3 py-2">
          {notice}
        </p>
      ) : null}
      <PasswordForm />
    </div>
  );
}
