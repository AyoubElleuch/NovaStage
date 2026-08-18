import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { GitHubIcon, GoogleIcon } from "./icons";

describe("Icon Components", () => {
  it("renders GitHubIcon correctly with SVG attributes", () => {
    const { container } = render(<GitHubIcon className="test-icon" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.classList.contains("test-icon")).toBe(true);
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
  });

  it("renders GoogleIcon correctly with SVG attributes", () => {
    const { container } = render(<GoogleIcon className="google-icon" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.classList.contains("google-icon")).toBe(true);
    expect(svg?.getAttribute("viewBox")).toBe("0 0 24 24");
  });
});
