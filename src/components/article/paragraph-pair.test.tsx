import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ParagraphPair } from "./paragraph-pair";

describe("ParagraphPair", () => {
  it("puts the English paragraph immediately before its Turkish translation", () => {
    const { container } = render(
      <ParagraphPair
        order={2}
        english="The river rises in the mountains."
        turkish="Nehir dağlardan doğuyor."
      />,
    );

    const pair = container.querySelector('[data-pair="2"]');
    const rows = [...(pair?.children ?? [])];

    expect(rows.map((row) => row.getAttribute("data-lang"))).toEqual([
      "en",
      "tr",
    ]);
    expect(rows[0].querySelector('p[lang="en"]')).toHaveTextContent(
      "The river rises in the mountains.",
    );
    expect(rows[1].querySelector('p[lang="tr"]')).toHaveTextContent(
      "Nehir dağlardan doğuyor.",
    );
  });

  it("labels the translation for screen readers and hides the visual codes", () => {
    const { container } = render(
      <ParagraphPair order={1} english="Hello." turkish="Merhaba." />,
    );

    const turkishRow = container.querySelector('[data-lang="tr"]');

    expect(turkishRow).toHaveTextContent("Turkish translation");
    expect(
      [...container.querySelectorAll('[aria-hidden="true"]')].map(
        (label) => label.textContent,
      ),
    ).toEqual(["EN", "TR"]);
  });
});
