import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ArticleReader } from "./article-reader";

function renderReader() {
  const view = render(
    <ArticleReader>
      <div data-pair="1">
        <div data-lang="en">English text</div>
        <div data-lang="tr">Türkçe metin</div>
      </div>
    </ArticleReader>,
  );

  return {
    ...view,
    reader: view.container.querySelector(".reader"),
  };
}

describe("ArticleReader", () => {
  it("starts with the translation shown and medium text", () => {
    const { reader } = renderReader();

    expect(
      screen.getByRole("button", { name: "Turkish translation" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Medium" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(reader).toHaveAttribute("data-translation", "shown");
    expect(reader).toHaveAttribute("data-text-size", "medium");
  });

  it("toggles the Turkish translation and reports the state", () => {
    const { reader } = renderReader();
    const toggle = screen.getByRole("button", { name: "Turkish translation" });

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveTextContent("Off");
    expect(reader).toHaveAttribute("data-translation", "hidden");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(reader).toHaveAttribute("data-translation", "shown");
  });

  it("selects exactly one text size", () => {
    const { reader } = renderReader();
    const large = screen.getByRole("button", { name: "Large" });

    fireEvent.click(large);

    expect(reader).toHaveAttribute("data-text-size", "large");
    expect(screen.getAllByRole("button", { pressed: true })).toEqual([
      screen.getByRole("button", { name: "Turkish translation" }),
      large,
    ]);
  });

  it("groups the controls under accessible names", () => {
    renderReader();

    expect(
      screen.getByRole("group", { name: "Reading options" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Text size" }),
    ).toBeInTheDocument();
  });
});
