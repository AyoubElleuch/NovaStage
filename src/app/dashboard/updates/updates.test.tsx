import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import UpdatesPage from "./page";

describe("Updates Page — Beta v1.0.0 Launch & Alpha Archive", () => {
  it("renders Beta v1.0.0 as the latest release with exactly two bullet points", () => {
    render(<UpdatesPage />);
    expect(screen.getByText("Beta v1.0.0")).toBeDefined();
    expect(screen.getByText("Official Beta Launch")).toBeDefined();
    expect(screen.getByText("Latest")).toBeDefined();

    const betaArticle = screen.getByText("Beta v1.0.0").closest("article");
    expect(betaArticle).not.toBeNull();
    const listItems = betaArticle!.querySelectorAll("li");
    expect(listItems).toHaveLength(2);
    expect(betaArticle?.textContent).toContain("Official Public Beta Launch");
    expect(betaArticle?.textContent).toContain("Direct Authentication");
    expect(betaArticle?.textContent).not.toContain("Automated Welcome Experience");
    expect(betaArticle?.textContent).not.toContain("Alpha Milestone Archive");
    expect(betaArticle?.textContent).not.toContain("Hardened Workspace Foundation");
  });

  it("renders Alpha releases up to Alpha v1.6.0 and down to Alpha v1.0.0", () => {
    render(<UpdatesPage />);
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
