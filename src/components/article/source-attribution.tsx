import { eyebrow } from "@/components/ui/styles";

/** The permanent credit and outbound link shown at the end of every article. */
export function SourceAttribution({
  sourceName,
  sourceUrl,
}: {
  sourceName: string;
  sourceUrl: string;
}) {
  return (
    <aside
      aria-labelledby="source-heading"
      className="mt-12 rounded-xl border border-rule bg-surface p-5 sm:p-6"
    >
      <h2 id="source-heading" className={eyebrow}>
        About this article
      </h2>
      <p className="mt-2 text-ink">
        Newslingo adapted this story for English learners and added a Turkish
        translation. Original source: <strong>{sourceName}</strong>.
      </p>
      <p className="mt-3">
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand underline underline-offset-4 hover:no-underline"
        >
          Read the original article{" "}
          <span className="sr-only">(opens in a new tab)</span>
          <span aria-hidden="true">↗</span>
        </a>
      </p>
    </aside>
  );
}
