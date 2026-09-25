import type { Metadata } from "next";
import Link from "next/link";

import { primaryButton } from "@/components/ui/styles";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-reader px-4 py-16 text-center sm:px-6 sm:py-24">
      <p className="text-sm font-semibold tracking-wider text-brand uppercase">
        Error 404
      </p>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-ink">
        Page not found
      </h1>
      <p className="mt-4 text-lg text-ink-muted">
        We couldn’t find that page. The article may have been removed, or the
        address may be mistyped.
      </p>
      <p className="mt-8">
        <Link href="/" className={primaryButton}>
          Go to the latest news
        </Link>
      </p>
    </div>
  );
}
