import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ExpressionCard } from "@/domain/expressions";

import { ExpressionDetails } from "./expression-details";

const sellOut: ExpressionCard = {
  slug: "sell-out",
  expression: "sell out",
  type: "PHRASAL_VERB",
  difficulty: "B1",
  englishMeaning: "If tickets sell out, none are left.",
  turkishMeaning: "tükenmek",
  exampleEnglish: "The concert sold out in ten minutes.",
  exampleTurkish: "Konserin biletleri on dakikada tükendi.",
  usageNote: "“Sold out” is also an adjective.",
  literalWarning: "“Out” does not mean “dışarı” here.",
};

describe("ExpressionDetails", () => {
  it("shows every part of the card, with the article's wording", () => {
    const { container } = render(
      <ExpressionDetails card={sellOut} surface="sold out" />,
    );

    expect(screen.getByText("phrasal verb")).toBeVisible();
    expect(screen.getByText("Level B1, Intermediate")).toBeInTheDocument();
    expect(screen.getByText("here: “sold out”")).toBeVisible();
    expect(container.querySelector('p[lang="tr"]')).toHaveTextContent(
      "tükenmek",
    );
    for (const text of [
      sellOut.englishMeaning,
      sellOut.exampleEnglish!,
      sellOut.exampleTurkish!,
      sellOut.usageNote!,
    ]) {
      expect(screen.getByText(text)).toBeVisible();
    }
    expect(screen.getByText("Watch out:").parentElement).toHaveTextContent(
      "Watch out: “Out” does not mean “dışarı” here.",
    );
  });

  it("leaves out what the card does not have", () => {
    render(
      <ExpressionDetails
        card={{
          ...sellOut,
          difficulty: null,
          exampleEnglish: null,
          exampleTurkish: null,
          usageNote: null,
          literalWarning: null,
        }}
        surface="Sell  out"
      />,
    );

    expect(screen.queryByText(/^here:/)).toBeNull();
    expect(screen.queryByText(/^Level/)).toBeNull();
    expect(screen.queryByText("Watch out:")).toBeNull();
    expect(screen.queryByText(sellOut.exampleEnglish!)).toBeNull();
  });
});
