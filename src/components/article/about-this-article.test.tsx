import { render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";

import { AboutThisArticle } from "./about-this-article";

type Credit = ComponentProps<typeof AboutThisArticle>["article"];

const NEWS: Credit = {
  kind: "NEWS",
  sourceName: "Example Source",
  sourceUrl: "https://news.example/story",
  sourceLicence: null,
  references: [],
};

const GOV_UK: Credit = {
  ...NEWS,
  sourceName: "Department for Culture, Media and Sport",
  sourceUrl: "https://www.gov.uk/government/news/library-tools",
  sourceLicence: "OGL_3_0",
};

const EXPLAINER: Credit = {
  kind: "EXPLAINER",
  sourceName: null,
  sourceUrl: null,
  sourceLicence: null,
  references: [
    {
      title: "Tool libraries",
      publisher: "Example Encyclopedia",
      url: "https://www.example.org/libraries",
      checkedAt: new Date("2026-10-27"),
    },
    {
      title: "Lending in small towns",
      publisher: "Example Library Association",
      url: "https://library.example/lending",
      checkedAt: new Date("2026-10-26"),
    },
  ],
};

function box() {
  return screen.getByRole("complementary", { name: "About this article" });
}

describe("AboutThisArticle", () => {
  it("credits a news source and links the original in a new tab", () => {
    render(<AboutThisArticle article={NEWS} />);

    expect(box()).toHaveTextContent("Original source: Example Source.");

    const link = within(box()).getByRole("link", {
      name: /Read the original article/,
    });
    expect(link).toHaveAttribute("href", NEWS.sourceUrl);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(box()).not.toHaveTextContent("Licence");
  });

  it("names GOV.UK and shows the licence statement for a GOV.UK story", () => {
    render(<AboutThisArticle article={GOV_UK} />);

    expect(box()).toHaveTextContent(
      "Original source: Department for Culture, Media and Sport, GOV.UK.",
    );
    // Screen readers also hear that the licence link opens a new tab.
    expect(box()).toHaveTextContent(
      "Contains public sector information licensed under the Open Government Licence v3.0 (opens in a new tab).",
    );
    expect(
      within(box()).getByRole("link", { name: /Open Government Licence v3.0/ }),
    ).toHaveAttribute(
      "href",
      "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
    );
  });

  it("does not link a source address that is not a web address", () => {
    render(
      <AboutThisArticle
        article={{ ...NEWS, sourceUrl: "javascript:alert(1)" }}
      />,
    );

    expect(within(box()).queryByRole("link")).not.toBeInTheDocument();
  });

  it("says Newslingo wrote an explainer and lists its references in order", () => {
    render(<AboutThisArticle article={EXPLAINER} />);

    expect(box()).toHaveTextContent("Newslingo wrote this explainer");
    expect(
      within(box()).queryByRole("link", { name: /Read the original article/ }),
    ).not.toBeInTheDocument();

    const items = within(box()).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(
      "Tool libraries (opens in a new tab), Example Encyclopedia. Checked 27 October 2026.",
    );

    const link = within(items[0]).getByRole("link");
    expect(link).toHaveAttribute("href", "https://www.example.org/libraries");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(items[0]).getByText("27 October 2026")).toHaveAttribute(
      "dateTime",
      "2026-10-27",
    );
  });

  it("shows a reference whose address is not a web address as text", () => {
    render(
      <AboutThisArticle
        article={{
          ...EXPLAINER,
          references: [{ ...EXPLAINER.references[0], url: "javascript:x" }],
        }}
      />,
    );

    expect(within(box()).queryByRole("link")).not.toBeInTheDocument();
    expect(box()).toHaveTextContent("Tool libraries, Example Encyclopedia.");
  });
});
