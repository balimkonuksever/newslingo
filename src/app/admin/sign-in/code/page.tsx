import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CodeForm } from "@/components/admin/sign-in-forms";
import { eyebrow, textLink } from "@/components/ui/styles";
import { ADMIN_PATHS, getSignedInAdmin } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Authenticator code",
};

export default async function SignInCodePage() {
  if (await getSignedInAdmin()) {
    redirect(ADMIN_PATHS.home);
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12 sm:py-16">
      <p className={eyebrow}>Admin</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink">
        Enter your code
      </h1>
      <p className="mt-4 text-ink-muted">
        Enter the six-digit code your authenticator app shows for Newslingo.
        Without the app, enter one of your backup codes.
      </p>
      <CodeForm />
      <p className="mt-6 text-sm">
        <Link href={ADMIN_PATHS.signIn} className={textLink}>
          Start again
        </Link>
      </p>
    </div>
  );
}
