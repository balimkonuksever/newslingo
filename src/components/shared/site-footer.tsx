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
          Every article is an educational adaptation written for English
          learners. Each one names its original source and links to it.
        </p>
      </div>
    </footer>
  );
}
