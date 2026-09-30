import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CanvasDock from "./canvas-dock";

const props = () => ({
  activeTool: "select" as const, onSelectTool: vi.fn(), viewport: { x: 0, y: 0, zoom: 1 },
  onZoomIn: vi.fn(), onZoomOut: vi.fn(), onResetZoom: vi.fn(), onFitView: vi.fn(),
  onAddNode: vi.fn(), onAddGroup: vi.fn(), onTidyLayout: vi.fn(),
  snapGrid: true, onToggleSnapGrid: vi.fn(), onUndo: vi.fn(), onRedo: vi.fn(),
  canUndo: true, canRedo: true, onToggleServicePalette: vi.fn(),
});

describe("CanvasDock", () => {
  it("exposes selected tools and opens quick controls with dismiss behavior", () => {
    render(<CanvasDock {...props()} />);
    expect(screen.getByRole("button", { name: "Select and move nodes" }).getAttribute("aria-pressed")).toBe("true");
    const tools = screen.getByRole("button", { name: "Canvas tools" });
    fireEvent.click(tools);
    expect(screen.getByRole("region", { name: "Canvas tools" })).not.toBeNull();
    fireEvent.keyDown(tools, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Canvas tools" })).toBeNull();
    expect(document.activeElement).toBe(tools);
    fireEvent.click(tools);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("region", { name: "Canvas tools" })).toBeNull();
  });

  it("blocks mutations while busy and leaves camera controls usable", () => {
    const base = props();
    render(<CanvasDock {...base} isBusy />);
    expect((screen.getByRole("button", { name: "Add milestone" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTitle("Undo (Ctrl Z)") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTitle("Add Group") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTitle("Zoom In (Ctrl +)"));
    expect(base.onZoomIn).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Add milestone" }));
    expect(base.onAddNode).not.toHaveBeenCalled();
  });
});
