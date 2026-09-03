import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import UpdatesPage from "./page";

describe("Updates Page — Beta v1.0.1 & Product Release Archive", () => {
  it("renders Beta v1.0.1 as the latest release with three bullet points", () => {
    render(<UpdatesPage />);
    expect(screen.getByText("Beta v1.0.1")).toBeDefined();
    expect(
      screen.getByText("Avatar Fix, Faster Connections & Sign-up Polish")
    ).toBeDefined();
    expect(screen.getByText("Latest")).toBeDefined();

    const latestArticle = screen.getByText("Beta v1.0.1").closest("article");
    expect(latestArticle).not.toBeNull();
    const listItems = latestArticle!.querySelectorAll("li");
    expect(listItems).toHaveLength(3);
    expect(latestArticle?.textContent).toContain("Avatar Fix & Preview");
    expect(latestArticle?.textContent).toContain("Faster Canvas Connections");
    expect(latestArticle?.textContent).toContain("Streamlined Sign-up");
  });

  it("renders Beta v1.0.0 and Alpha releases down to Alpha v1.0.0", () => {
    render(<UpdatesPage />);
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
