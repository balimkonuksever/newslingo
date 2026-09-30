import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EnglishText } from "./english-text";

function renderText(text: string) {
  const { container } = render(
    <p>
      <EnglishText text={text} />
    </p>,
  );

  return container.querySelector("p")!;
}

describe("EnglishText", () => {
  const text = "In 2026, the farmer’s long-term plan didn't change.";

  it("keeps the text exactly as written", () => {
    expect(renderText(text).textContent).toBe(text);
  });

  it("wraps each word, and only words, with its start offset", () => {
    const words = [...renderText(text).querySelectorAll("[data-w]")];

    expect(words.map((word) => word.textContent)).toEqual([
      "In",
      "the",
      "farmer’s",
      "long-term",
      "plan",
      "didn't",
      "change",
    ]);
    for (const word of words) {
      const start = Number(word.getAttribute("data-w"));
      expect(text.slice(start, start + word.textContent!.length)).toBe(
        word.textContent,
      );
    }
  });

  it("makes only the first word a tab stop and gives words no role", () => {
    const paragraph = renderText(text);

    expect(
      [...paragraph.querySelectorAll('[tabindex="0"]')].map(
        (word) => word.textContent,
      ),
    ).toEqual(["In"]);
    expect(paragraph.querySelectorAll("[role]")).toHaveLength(0);
  });
});
