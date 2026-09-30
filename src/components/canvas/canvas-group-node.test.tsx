import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CanvasGroupNode from "./canvas-group-node";
import type { CanvasNode } from "@/lib/canvas/types";

const node: CanvasNode = {
  id: "g1", project_id: "p1", node_type: "group", title: "Application VPC", description: "", status: "draft",
  position_x: 0, position_y: 0, width: 400, height: 300, color: "default", sort_order: 0,
  claimed_by: "me", version: 1, checkpoints: [], group_metadata: { label: "Application VPC", style: "vpc", childNodeIds: [] },
};
const props = { node, isSelected: true, isLinking: false, currentUserId: "me", onSelect: vi.fn(), onDragStart: vi.fn(), onDragEnd: vi.fn(), onStartLink: vi.fn(), onRequestClaim: vi.fn() };
function pointer(target: HTMLElement, type: string, clientX: number, clientY: number) {
  const event = new MouseEvent(type, { bubbles: true, button: 0, clientX, clientY });
  Object.defineProperty(event, "pointerId", { value: 1 });
  fireEvent(target, event);
}
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => true);
});
afterEach(cleanup);

describe("AWS group controls", () => {
  it("scales resize movement by zoom and persists the latest preview on pointer up", () => {
    const onResize = vi.fn();
    render(<CanvasGroupNode {...props} zoom={0.5} onResize={onResize} />);
    const handle = screen.getByRole("button", { name: "Resize group" });
    pointer(handle, "pointerdown", 100, 100);
    pointer(handle, "pointermove", 150, 125);
    pointer(handle, "pointerup", 150, 125);
    expect(onResize).toHaveBeenCalledExactlyOnceWith("g1", 500, 350);
  });

  it("discards interrupted resize and keeps middle connection ports available", () => {
    const onResize = vi.fn();
    render(<CanvasGroupNode {...props} onResize={onResize} />);
    const handle = screen.getByRole("button", { name: "Resize group" });
    pointer(handle, "pointerdown", 100, 100);
    pointer(handle, "pointermove", 180, 180);
    pointer(handle, "pointercancel", 180, 180);
    expect(onResize).not.toHaveBeenCalled();
    expect((screen.getByRole("group") as HTMLElement).style.width).toBe("400px");
    expect(screen.getByTitle("Link from Application VPC: right port")).not.toBeNull();
  });

  it("supports keyboard resize and hides resize controls for another collaborator's lock", () => {
    const onResize = vi.fn();
    const { rerender } = render(<CanvasGroupNode {...props} onResize={onResize} />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Resize group width" }), { key: "ArrowRight", shiftKey: true });
    expect(onResize).toHaveBeenCalledWith("g1", 450, 300);
    rerender(<CanvasGroupNode {...props} node={{ ...node, claimed_by: "other" }} onResize={onResize} />);
    expect(screen.queryByRole("button", { name: "Resize group" })).toBeNull();
    expect(screen.getByRole("button", { name: "Request edit access to Application VPC" })).not.toBeNull();
  });
});
