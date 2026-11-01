import type { Metadata } from "next";

import { SearchArticles } from "@/components/news/search-articles";

// Results are the search page filled in in the browser, so they share its
// canonical address.
export const metadata: Metadata = {
  title: "Search",
  description:
    "Search every story by its title, topic or source, or by a word in its English or Turkish text.",
  alternates: { canonical: "/search" },
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-page px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        Search
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-muted">
        Find a story by a topic, a name or a source, or by any word in its
        English text or its Turkish translation.
      </p>
      <SearchArticles />
    </div>
  );
}
