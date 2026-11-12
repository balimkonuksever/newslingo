import type { Metadata } from "next";
import { Geist, Newsreader } from "next/font/google";

import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { env } from "@/lib/env";
import { renderPerRequest } from "@/server/render-mode";

import "./globals.css";

// Turkish needs the latin-ext subset for ğ, ı, İ and ş.
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin", "latin-ext"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "Newslingo — Learn English with the news",
    template: "%s · Newslingo",
  },
  description:
    "Read current news in English at your level, with a Turkish translation under every paragraph.",
  openGraph: {
    siteName: "Newslingo",
    type: "website",
    locale: "en_GB",
  },
  // Other sites never learn which article a reader came from. `no-referrer`
  // would also blank the Origin of the local admin's form posts, which Next.js
  // checks before running a server action.
  referrer: "same-origin",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // On the local server every page reads PostgreSQL at request time, so a
  // published or archived article shows at once; the static site is rendered
  // once at build time (IMPLEMENTATION_PLAN.md §19, 2026-10-25 and 2026-10-31).
  await renderPerRequest();

  return (
    <html
      lang="en"
      className={`${geist.variable} ${newsreader.variable} antialiased`}
    >
      <body className="motif-frame flex min-h-dvh flex-col bg-paper font-sans text-ink">
        <a
          href="#main"
          className="sr-only rounded-md bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
