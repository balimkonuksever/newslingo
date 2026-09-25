import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DifficultyBadge } from "./difficulty-badge";

describe("DifficultyBadge", () => {
  it("shows the level code and names the level for screen readers", () => {
    const { container } = render(<DifficultyBadge level="B2" />);

    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent(
      /^B2$/,
    );
    expect(screen.getByText("Level B2, Upper Intermediate")).toHaveClass(
      "sr-only",
    );
  });

  it("can show the level's name as well", () => {
    const { container } = render(<DifficultyBadge level="A2" showLabel />);

    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent(
      "A2 · Easy",
    );
  });
});
