import { EnglishText } from "@/components/learning/english-text";

const labelClass =
  "pt-[0.3em] text-[0.6875rem] font-semibold tracking-wider text-ink-muted select-none";

/**
 * One English paragraph immediately followed by its Turkish translation. The
 * EN/TR labels hang in a narrow first column so both texts share one left edge.
 */
export function ParagraphPair({
  order,
  english,
  turkish,
}: {
  order: number;
  english: string;
  turkish: string;
}) {
  return (
    <div data-pair={order} className="flex flex-col gap-3">
      <div
        data-lang="en"
        className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2"
      >
        <span aria-hidden="true" className={labelClass}>
          EN
        </span>
        <p lang="en" className="reader-english wrap-break-word text-ink">
          <EnglishText text={english} />
        </p>
      </div>
      <div
        data-lang="tr"
        className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2"
      >
        <span className={labelClass}>
          <span aria-hidden="true">TR</span>
          <span className="sr-only">Turkish translation</span>
        </span>
        <p
          lang="tr"
          className="reader-turkish border-l-2 border-rule pl-3 wrap-break-word"
        >
          {turkish}
        </p>
      </div>
    </div>
  );
}
