import type { Metadata } from "next";
import { Geist, Newsreader } from "next/font/google";

import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { env } from "@/lib/env";

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

// Every page reads PostgreSQL at request time. Caching with explicit
// invalidation arrives with publishing in M5; see IMPLEMENTATION_PLAN.md §19.
export const dynamic = "force-dynamic";

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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${newsreader.variable} antialiased`}
    >
      <body className="flex min-h-dvh flex-col bg-paper font-sans text-ink">
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
