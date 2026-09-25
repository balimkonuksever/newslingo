// Keeps the reader's place when the article's layout changes, for example when
// the Turkish translation is hidden or the text is resized. Everything above
// the paragraph being read changes height, so without correction the text
// would jump away.

const PARAGRAPH_SELECTOR = "[data-lang]";

/**
 * A spot on the screen to hold still: either a proportion of the way through
 * the paragraph crossing `line`, or the gap above the next paragraph.
 */
export type ReadingAnchor = {
  element: HTMLElement;
  line: number;
} & ({ fraction: number } | { offset: number });

function isRendered(element: Element) {
  return element.getClientRects().length > 0;
}

/**
 * Finds the paragraph that crosses `line`, a viewport y coordinate such as the
 * bottom edge of the sticky reading controls, or else the first one below it.
 */
export function captureReadingAnchor(
  container: HTMLElement,
  line: number,
): ReadingAnchor | null {
  for (const element of container.querySelectorAll<HTMLElement>(
    PARAGRAPH_SELECTOR,
  )) {
    if (!isRendered(element)) {
      continue;
    }

    const { top, bottom, height } = element.getBoundingClientRect();

    if (bottom <= line) {
      continue;
    }

    return top >= line
      ? { element, line, offset: top - line }
      : { element, line, fraction: (line - top) / height };
  }

  return null;
}

/**
 * How far to scroll so the anchored spot is back on its line. If the anchored
 * paragraph was hidden, reading continues from the next visible paragraph.
 */
export function readingAnchorShift(
  anchor: ReadingAnchor,
  container: HTMLElement,
): number {
  if (!isRendered(anchor.element)) {
    const paragraphs = [
      ...container.querySelectorAll<HTMLElement>(PARAGRAPH_SELECTOR),
    ];
    const next = paragraphs
      .slice(paragraphs.indexOf(anchor.element) + 1)
      .find(isRendered);

    return next ? next.getBoundingClientRect().top - anchor.line : 0;
  }

  const { top, height } = anchor.element.getBoundingClientRect();
  const spot =
    "fraction" in anchor ? top + anchor.fraction * height : top - anchor.offset;

  return spot - anchor.line;
}
