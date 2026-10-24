import type { Metadata } from "next";

import { signOut } from "@/app/admin/actions";
import { eyebrow, secondaryButton } from "@/components/ui/styles";
import { requireAdmin } from "@/server/auth/session";

export const metadata: Metadata = {
  title: { absolute: "Newslingo admin" },
};

export default async function AdminHomePage() {
  const admin = await requireAdmin();

  return (
    <div className="mx-auto max-w-reader px-4 py-12 sm:px-6 sm:py-16">
      <p className={eyebrow}>Admin</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink">
        Signed in as {admin.name}
      </h1>
      <p className="mt-2 text-ink-muted">{admin.email}</p>
      <p className="mt-6 text-ink-muted">
        Moderation tools for drafts and published articles come next.
      </p>
      <form action={signOut} className="mt-8">
        <button type="submit" className={secondaryButton}>
          Sign out
        </button>
      </form>
    </div>
  );
}
