"use client";

import Link from "next/link";
import { useEffect } from "react";

import { primaryButton, textLink } from "@/components/ui/styles";

// Shown when a page fails to render, for example while the database is down.
// Production errors from Server Components reach the browser without their
// message, so nothing sensitive can be displayed here.
export default function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-reader px-4 py-16 text-center sm:px-6 sm:py-24">
      {/* The page's own metadata may have failed too, so name the tab here. */}
      <title>Something went wrong · Newslingo</title>
      <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
        Something went wrong
      </h1>
      <p className="mt-4 text-lg text-ink-muted">
        We couldn’t load this page. This is usually temporary, so please try
        again.
      </p>
      <p className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <button type="button" onClick={() => retry()} className={primaryButton}>
          Try again
        </button>
        <Link href="/" className={textLink}>
          Go to the homepage
        </Link>
      </p>
      {error.digest && (
        <p className="mt-8 text-sm text-ink-muted">
          Error reference: {error.digest}
        </p>
      )}
    </div>
  );
}
