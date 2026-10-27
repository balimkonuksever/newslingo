import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ArticleSummary } from "@/server/articles/queries";

import { ArticleCard } from "./article-card";

const article: ArticleSummary = {
  slug: "river-agreement",
  title: "Three Countries Sign a River Agreement",
  shortSummary: "A deal to share water during droughts.",
  difficulty: "C1",
  kind: "NEWS",
  sourceName: "Example Source",
  // 21:45 UTC is already the next day in Istanbul.
  datedAt: new Date("2026-09-19T21:45:00Z"),
  readingTimeMinutes: 4,
  category: { slug: "world", name: "World" },
};

describe("ArticleCard", () => {
  it("has exactly one link, the title, pointing at the article", () => {
    render(<ArticleCard article={article} />);

    const [link, ...others] = screen.getAllByRole("link");

    expect(others).toHaveLength(0);
    expect(link).toHaveAccessibleName(article.title);
    expect(link).toHaveAttribute("href", "/article/river-agreement");
    expect(
      screen.getByRole("heading", { level: 3, name: article.title }),
    ).toBeInTheDocument();
  });

  it("shows the category, summary, level, reading time, source and date", () => {
    render(<ArticleCard article={article} />);

    const card = screen.getByRole("article");

    expect(within(card).getByText("World")).toBeInTheDocument();
    expect(within(card).getByText(article.shortSummary!)).toBeInTheDocument();
    expect(within(card).getByText("Level C1, Advanced")).toBeInTheDocument();
    expect(within(card).getByText("4 min read")).toBeInTheDocument();
    expect(card).toHaveTextContent("Example Source");

    const date = within(card).getByText("20 September 2026");

    expect(date.tagName).toBe("TIME");
    expect(date).toHaveAttribute("dateTime", "2026-09-19T21:45:00.000Z");
  });

  it("shows an explainer's date without a source", () => {
    render(
      <ArticleCard
        article={{ ...article, kind: "EXPLAINER", sourceName: null }}
      />,
    );

    const date = screen.getByText("20 September 2026");

    expect(date.parentElement).toHaveTextContent(/^20 September 2026$/);
  });

  it("uses the requested heading level and copes without a summary", () => {
    render(
      <ArticleCard
        article={{ ...article, shortSummary: null }}
        headingLevel="h2"
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: article.title }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("A deal to share water during droughts."),
    ).not.toBeInTheDocument();
  });
});
