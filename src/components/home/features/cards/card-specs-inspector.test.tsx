import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CardSpecsInspector from "./card-specs-inspector";

const { completeTask } = vi.hoisted(() => ({ completeTask: vi.fn() }));

vi.mock("@/lib/canvas/sound-effects", () => ({
  canvasSounds: { completeTask },
}));

describe("delivery plan capability", () => {
  it("plays the canvas completion sound when an open checkpoint is completed", () => {
    render(<CardSpecsInspector />);

    fireEvent.click(screen.getByRole("button", { name: /Load test passed/i }));

    expect(completeTask).toHaveBeenCalledTimes(1);
    expect(screen.getByText("1 checkpoints remain before release.")).not.toBeNull();
  });
});