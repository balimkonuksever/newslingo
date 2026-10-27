export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-rule">
      <div className="mx-auto max-w-page px-4 py-8 text-sm text-ink-muted sm:px-6">
        <p>
          <span className="font-serif text-base font-semibold text-ink">
            Newslingo
          </span>{" "}
          helps Turkish speakers learn English by reading the news.
        </p>
        <p className="mt-2 max-w-2xl">
          Every article is written for English learners. News stories are
          adapted from an original source, which each one names and links to.
          Explainers list the sources their facts can be checked in.
        </p>
      </div>
    </footer>
  );
}
