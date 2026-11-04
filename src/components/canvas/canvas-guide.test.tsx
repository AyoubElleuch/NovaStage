// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CanvasGuide from "./canvas-guide";

afterEach(cleanup);

it("walks through all five topics and finishes with Got it", () => {
  const close = vi.fn();
  render(<CanvasGuide isTouch={false} onClose={close} />);
  const titles: string[] = [];
  for (let step = 0; step < 4; step += 1) {
    titles.push(screen.getByRole("heading").textContent || "");
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
  }
  titles.push(screen.getByRole("heading").textContent || "");
  expect(new Set(titles).size).toBe(5);
  expect(screen.getByText(/5 of 5/)).toBeTruthy();
  expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Got it" }));
  expect(close).toHaveBeenCalledTimes(1);
});

it("is dismissible by button and Escape, and previous is disabled on the first tip", () => {
  const close = vi.fn();
  render(<CanvasGuide isTouch={false} onClose={close} />);
  expect((screen.getByRole("button", { name: "Previous tip" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Close canvas guide" }));
  fireEvent.keyDown(screen.getByRole("region"), { key: "Escape" });
  expect(close).toHaveBeenCalledTimes(2);
});

it("uses touch wording on touch devices and keyboard wording otherwise", () => {
  const { rerender } = render(<CanvasGuide isTouch onClose={vi.fn()} />);
  expect(screen.getByText(/Tap Milestone/)).toBeTruthy();
  rerender(<CanvasGuide isTouch={false} onClose={vi.fn()} />);
  expect(screen.getByText(/Press N/)).toBeTruthy();
});
