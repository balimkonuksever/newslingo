import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ExpressionCard } from "@/domain/expressions";

import { RealEnglishList } from "./real-english-list";

const card = (
  expression: string,
  extra: Partial<ExpressionCard> = {},
): ExpressionCard => ({
  slug: expression.replaceAll(" ", "-"),
  expression,
  type: "IDIOM",
  difficulty: "B2",
  englishMeaning: `The meaning of ${expression}.`,
  turkishMeaning: `${expression} (tr)`,
  exampleEnglish: null,
  exampleTurkish: null,
  usageNote: null,
  literalWarning: null,
  ...extra,
});

describe("RealEnglishList", () => {
  const cards = [
    card("break a leg", { literalWarning: "Not “bacağını kır”." }),
    card("sell out", { type: "PHRASAL_VERB", difficulty: null }),
  ];

  it("gives each card a row naming it, its type, level and Turkish meaning", () => {
    const { container } = render(<RealEnglishList cards={cards} />);
    const summaries = [...container.querySelectorAll("li > details > summary")];

    expect(summaries).toHaveLength(2);
    expect(summaries[0]).toHaveTextContent(
      "break a leg" +
        "idiom" +
        "B2" +
        "Level B2, Upper Intermediate" +
        "break a leg (tr)",
    );
    expect(summaries[1]).toHaveTextContent(
      "sell out" + "phrasal verb" + "sell out (tr)",
    );
    expect(summaries[1]).not.toHaveTextContent("Level");
  });

  it("keeps the rest of each card inside its row, closed at first", () => {
    const { container } = render(<RealEnglishList cards={cards} />);
    const rows = [...container.querySelectorAll("details")];

    expect(rows.map((row) => row.open)).toEqual([false, false]);
    expect(rows[0]).toHaveTextContent("The meaning of break a leg.");
    expect(rows[0]).toHaveTextContent("Watch out: Not “bacağını kır”.");
    // A list has no article wording to compare with the card's.
    expect(container).not.toHaveTextContent("here:");
  });
});
