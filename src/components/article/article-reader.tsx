"use client";

import {
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  captureReadingAnchor,
  type ReadingAnchor,
  readingAnchorShift,
} from "@/components/article/reading-anchor";

export type TextSize = "small" | "medium" | "large";

const textSizes: Array<{ value: TextSize; name: string; glyph: string }> = [
  { value: "small", name: "Small", glyph: "text-sm" },
  { value: "medium", name: "Medium", glyph: "text-lg" },
  { value: "large", name: "Large", glyph: "text-2xl" },
];

/**
 * The reading controls and the paragraph pairs they act on. The pairs are
 * server-rendered children; a change only flips data attributes on the
 * wrapper, so the text itself never re-renders.
 */
export function ArticleReader({ children }: { children: ReactNode }) {
  const [showTurkish, setShowTurkish] = useState(true);
  const [textSize, setTextSize] = useState<TextSize>("medium");
  const textSizeLabelId = useId();
  const controlsRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<ReadingAnchor | null>(null);

  // Before a change, note the spot being read just below the controls…
  function rememberReadingPosition() {
    const reader = readerRef.current;
    const controls = controlsRef.current;

    anchorRef.current =
      reader && controls
        ? captureReadingAnchor(reader, controls.getBoundingClientRect().bottom)
        : null;
  }

  // …then, once the layout has changed, scroll that spot back into place.
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const reader = readerRef.current;
    anchorRef.current = null;

    if (!anchor || !reader) {
      return;
    }

    const shift = readingAnchorShift(anchor, reader);

    if (Math.abs(shift) >= 1) {
      window.scrollBy({ top: shift, behavior: "instant" });
    }
  }, [showTurkish, textSize]);

  return (
    <>
      <div
        ref={controlsRef}
        role="group"
        aria-label="Reading options"
        className="sticky top-0 z-10 -mx-4 mb-8 flex items-center justify-between gap-3 border-b border-rule bg-paper/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0"
      >
        <button
          type="button"
          // An explicit name: some browsers drop the space before a visually
          // hidden word when computing a name from content.
          aria-label="Turkish translation"
          aria-pressed={showTurkish}
          onClick={() => {
            rememberReadingPosition();
            setShowTurkish((shown) => !shown);
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rule-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-paper"
        >
          <span
            aria-hidden="true"
            className={`size-3.5 rounded-full border-2 ${
              showTurkish ? "border-ink bg-ink" : "border-ink-muted"
            }`}
          />
          Turkish
          <span aria-hidden="true" className="w-6 text-left text-ink-muted">
            {showTurkish ? "On" : "Off"}
          </span>
        </button>

        <div
          role="group"
          aria-labelledby={textSizeLabelId}
          className="flex items-center gap-1"
        >
          <span
            id={textSizeLabelId}
            className="sr-only pr-1 text-sm text-ink-muted sm:not-sr-only"
          >
            Text size
          </span>
          {textSizes.map(({ value, name, glyph }) => {
            const isSelected = textSize === value;

            return (
              <button
                key={value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  rememberReadingPosition();
                  setTextSize(value);
                }}
                className={`inline-flex size-11 items-center justify-center rounded-lg font-serif leading-none font-semibold ${glyph} ${
                  isSelected ? "bg-ink text-paper" : "text-ink hover:bg-rule/70"
                }`}
              >
                <span aria-hidden="true">A</span>
                <span className="sr-only">{name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={readerRef}
        data-translation={showTurkish ? "shown" : "hidden"}
        data-text-size={textSize}
        className="reader flex flex-col gap-8"
      >
        {children}
      </div>
    </>
  );
}
