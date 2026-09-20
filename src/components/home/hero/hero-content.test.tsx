import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HeroContent from "./hero-content";

describe("HeroContent", () => {
  it("renders the headline with perspective line masks", () => {
    const onExplore = vi.fn();
    render(<HeroContent onExplore={onExplore} />);

    expect(screen.queryByRole("heading", { name: "NovaStage" })).toBeNull();
    expect(screen.getByText("Design the system.")).not.toBeNull();
    expect(screen.getByText("Together.")).not.toBeNull();
    expect(screen.getByText(/Describe what you're building/i)).not.toBeNull();
  });

  it("renders both primary and secondary action buttons and handles onExplore clicks", () => {
    const onExplore = vi.fn();
    render(<HeroContent onExplore={onExplore} />);

    expect(screen.getByRole("link", { name: /Generate your architecture/i })).not.toBeNull();

    const canvasBtn = screen.getByRole("button", { name: /Try the live canvas/i });
    expect(canvasBtn).not.toBeNull();
    fireEvent.click(canvasBtn);
    expect(onExplore).toHaveBeenCalledTimes(1);

    const exploreCue = screen.getByRole("button", { name: /See the workspace in action/i });
    expect(exploreCue).not.toBeNull();
    fireEvent.click(exploreCue);
    expect(onExplore).toHaveBeenCalledTimes(2);
  });
});
