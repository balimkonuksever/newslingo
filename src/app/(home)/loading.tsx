// Only the homepage streams a loading state. Category and article pages have
// none on purpose: a Suspense fallback would start the response before
// notFound() could run, turning 404s for unknown slugs into 200s.
export default function HomeLoading() {
  return (
    <div
      role="status"
      aria-label="Loading the latest news"
      className="mx-auto max-w-page animate-pulse px-4 py-8 motion-reduce:animate-none sm:px-6 sm:py-12"
    >
      <div className="h-12 max-w-2xl rounded-lg bg-rule" />
      <div className="mt-4 h-6 max-w-xl rounded-lg bg-rule" />
      <div className="mt-8 h-12 rounded-xl bg-rule/70" />
      <div className="mt-10 h-56 rounded-xl bg-rule/70" />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((placeholder) => (
          <div key={placeholder} className="h-48 rounded-xl bg-rule/70" />
        ))}
      </div>
    </div>
  );
}
