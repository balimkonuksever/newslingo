/**
 * Keyboard access to words without hundreds of tab stops. Each English
 * paragraph is one tab stop: exactly one of its words has `tabIndex` 0 (a
 * "roving" tab index). The arrow keys move that word and focus with it, Home
 * and End jump to the paragraph's first and last word, and Enter or Space
 * looks the focused word up.
 */

export const WORD_SELECTOR = "[data-w]";

export function isWord(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && target.matches(WORD_SELECTOR);
}

/** Where a word is: its paragraph's order and its offsets in that paragraph. */
export function wordPosition(word: HTMLElement) {
  const pair = word.closest<HTMLElement>("[data-pair]");
  const start = Number(word.dataset.w);

  if (!pair || !Number.isInteger(start)) {
    return null;
  }

  return {
    paragraphOrder: Number(pair.dataset.pair),
    start,
    end: start + (word.textContent ?? "").length,
  };
}

const MOVES: Record<string, (index: number, last: number) => number> = {
  ArrowRight: (index, last) => Math.min(index + 1, last),
  ArrowLeft: (index) => Math.max(index - 1, 0),
  Home: () => 0,
  End: (_, last) => last,
};

function wordsAround(word: HTMLElement) {
  return [
    ...(word.closest("p")?.querySelectorAll<HTMLElement>(WORD_SELECTOR) ?? []),
  ];
}

/** Makes `word` its paragraph's tab stop, without moving focus. */
export function makeTabStop(word: HTMLElement) {
  for (const other of wordsAround(word)) {
    if (other !== word && other.tabIndex === 0) {
      other.tabIndex = -1;
    }
  }
  word.tabIndex = 0;
}

/**
 * Handles a navigation key pressed on `word`. Returns the newly focused word,
 * or `null` when the key is not a navigation key.
 */
export function moveBetweenWords(word: HTMLElement, key: string) {
  const move = MOVES[key];
  const words = wordsAround(word);

  if (!move || words.length === 0) {
    return null;
  }

  const next = words[move(words.indexOf(word), words.length - 1)];

  makeTabStop(next);
  next.focus();

  return next;
}
