import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ExpressionMark } from "@/domain/expressions";

import { EnglishText } from "./english-text";

function renderText(text: string, expressions?: ExpressionMark[]) {
  const { container } = render(
    <p>
      <EnglishText text={text} expressions={expressions} />
    </p>,
  );

  return container.querySelector("p")!;
}

/** Marks the first occurrence of `phrase` in `text` with the card `slug`. */
function mark(text: string, phrase: string, slug: string): ExpressionMark {
  const start = text.indexOf(phrase);

  return { slug, start, end: start + phrase.length };
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

  it("makes a known expression one target covering all its words", () => {
    const text = "Every show was sold out, so we sold our tickets.";
    const paragraph = renderText(text, [mark(text, "sold out", "sell-out")]);
    const phrase = paragraph.querySelector("[data-e]")!;

    expect(paragraph.textContent).toBe(text);
    expect(phrase.textContent).toBe("sold out");
    expect(phrase.getAttribute("data-e")).toBe("sell-out");
    expect(phrase.getAttribute("data-w")).toBe(String(text.indexOf("sold")));
    expect(
      [...paragraph.querySelectorAll("[data-w]")].map((w) => w.textContent),
    ).toEqual([
      "Every",
      "show",
      "was",
      "sold out",
      "so",
      "we",
      "sold",
      "our",
      "tickets",
    ]);
  });

  it("lets an expression be the paragraph's tab stop", () => {
    const text = "Thanks to you, it worked.";
    const paragraph = renderText(text, [mark(text, "Thanks to", "thanks-to")]);

    expect(
      [...paragraph.querySelectorAll('[tabindex="0"]')].map(
        (target) => target.textContent,
      ),
    ).toEqual(["Thanks to"]);
    expect(paragraph.querySelectorAll("[role]")).toHaveLength(0);
  });
});
