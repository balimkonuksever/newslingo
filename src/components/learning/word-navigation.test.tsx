import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EnglishText } from "./english-text";
import {
  isWord,
  makeTabStop,
  moveBetweenWords,
  wordPosition,
} from "./word-navigation";

function renderPairs() {
  const { container } = render(
    <>
      <div data-pair="1">
        <p>
          <EnglishText text="Costs will rise." />
        </p>
      </div>
      <div data-pair="2">
        <p>
          <EnglishText text="Prices fell." />
        </p>
      </div>
    </>,
  );
  const words = (order: number) => [
    ...container.querySelectorAll<HTMLElement>(
      `[data-pair="${order}"] [data-w]`,
    ),
  ];
  const tabStops = (order: number) =>
    words(order)
      .filter((word) => word.tabIndex === 0)
      .map((word) => word.textContent);

  return { words, tabStops };
}

describe("word navigation", () => {
  it("recognises words and where they are", () => {
    const { words } = renderPairs();
    const rise = words(1)[2];

    expect(isWord(rise)).toBe(true);
    expect(isWord(rise.parentElement)).toBe(false);
    expect(wordPosition(rise)).toEqual({
      paragraphOrder: 1,
      start: 11,
      end: 15,
    });
  });

  it("moves focus with the arrow keys, Home and End, within the paragraph", () => {
    const { words } = renderPairs();
    const [costs, will, rise] = words(1);
    costs.focus();

    expect(moveBetweenWords(costs, "ArrowRight")).toBe(will);
    expect(document.activeElement).toBe(will);
    expect(moveBetweenWords(will, "End")).toBe(rise);
    expect(moveBetweenWords(rise, "ArrowRight")).toBe(rise);
    expect(moveBetweenWords(rise, "Home")).toBe(costs);
    expect(moveBetweenWords(costs, "ArrowLeft")).toBe(costs);
  });

  it("ignores other keys", () => {
    const { words } = renderPairs();

    expect(moveBetweenWords(words(1)[0], "ArrowDown")).toBeNull();
    expect(moveBetweenWords(words(1)[0], "a")).toBeNull();
  });

  it("keeps exactly one tab stop in each paragraph", () => {
    const { words, tabStops } = renderPairs();

    moveBetweenWords(words(1)[0], "End");
    makeTabStop(words(2)[1]);

    expect(tabStops(1)).toEqual(["rise"]);
    expect(tabStops(2)).toEqual(["fell"]);
  });
});
