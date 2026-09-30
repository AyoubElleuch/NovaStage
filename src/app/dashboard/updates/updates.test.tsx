import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import UpdatesPage from "./page";
import { APP_RELEASE, APP_RELEASE_DATE } from "@/lib/release";

describe("Updates Page and Product Release Archive", () => {
  it("renders the current canvas release with its highlights", () => {
    render(<UpdatesPage />);
    expect(screen.getByText(APP_RELEASE)).toBeDefined();
    expect(screen.getByText(APP_RELEASE_DATE)).toBeDefined();
    expect(screen.getByText("Canvas Experience, from Milestones to AWS")).toBeDefined();
    expect(screen.getByText("Latest")).toBeDefined();

    const latestArticle = screen.getByText(APP_RELEASE).closest("article");
    expect(latestArticle).not.toBeNull();
    const listItems = latestArticle!.querySelectorAll("li");
    expect(listItems).toHaveLength(5);
    expect(latestArticle?.textContent).toContain("Canvas navigation");
    expect(latestArticle?.textContent).toContain("AWS resource discovery");
  });

  it("renders Beta v1.0.2, Beta v1.0.1, Beta v1.0.0 and Alpha releases down to Alpha v1.0.0", () => {
    render(<UpdatesPage />);
    expect(screen.getByText("Beta v1.0.7")).toBeDefined();
    expect(screen.getByText("AWS Architecture & AI Orchestration Upgrade")).toBeDefined();
    expect(screen.getByText("Beta v1.0.2")).toBeDefined();
    expect(screen.getByText("Beta v1.0.1")).toBeDefined();
    expect(
      screen.getByText("Avatar Fix, Faster Connections & Sign-up Polish")
    ).toBeDefined();
    expect(screen.getByText("Beta v1.0.0")).toBeDefined();
    expect(screen.getByText("Official Beta Launch")).toBeDefined();
    expect(screen.getByText("Alpha v1.6.0")).toBeDefined();
    expect(screen.getByText("Alpha v1.5.0")).toBeDefined();
    expect(screen.getByText("Alpha v1.4.1")).toBeDefined();
    expect(screen.getByText("Alpha v1.4.0")).toBeDefined();
    expect(screen.getByText("Alpha v1.3.0")).toBeDefined();
    expect(screen.getByText("Alpha v1.2.2")).toBeDefined();
    expect(screen.getByText("Alpha v1.2.1")).toBeDefined();
    expect(screen.getByText("Alpha v1.2.0")).toBeDefined();
    expect(screen.getByText("Alpha v1.1.0")).toBeDefined();
    expect(screen.getByText("Alpha v1.0.0")).toBeDefined();
  });
});
