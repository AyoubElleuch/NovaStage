// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import SharedCanvasViewer from "./shared-canvas-viewer";
import type { CanvasNode } from "@/lib/canvas/types";

vi.mock("./canvas-navigator", () => ({ default: () => <div>Search canvas</div> }));
const node = { id: "one", title: "API", description: "Public component details", status: "draft", checkpoints: [], sort_order: 0, position_x: 0, position_y: 0, width: 200, height: 150 } as unknown as CanvasNode;
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("offers zoom and details while hiding sharing chrome and editing actions", () => {
  render(<SharedCanvasViewer nodes={[node]} edges={[]} embedded />);
  expect(screen.getByRole("button", { name: "Zoom in" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Zoom out" })).toBeTruthy();
  expect(screen.queryByText("Search canvas")).toBeNull();
  expect(screen.queryByRole("button", { name: "Toggle dark mode" })).toBeNull();
  expect(screen.queryByRole("button", { name: /claim|delete|add|edit/i })).toBeNull();
  fireEvent.click(screen.getByText("API"));
  expect(screen.getByRole("dialog").textContent).toContain("Public component details");
});
