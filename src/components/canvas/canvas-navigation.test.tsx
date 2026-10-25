// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CanvasMinimap from "./canvas-minimap";
import CanvasNavigator from "./canvas-navigator";
import type { CanvasNode } from "@/lib/canvas/types";

const node: CanvasNode = {
  id: "milestone", project_id: "project", title: "Ship checkout", description: "Payments release",
  status: "in_progress", position_x: 0, position_y: 0, width: 1800, height: 1000,
  color: "default", sort_order: 0, claimed_by: null, version: 1, checkpoints: [],
};
const viewport = { x: 0, y: 0, zoom: 1 };

beforeEach(() => {
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? "mouse";
    }
  }
  vi.stubGlobal("PointerEvent", TestPointerEvent);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function minimapElement() {
  const map = screen.getByRole("region", { name: /Canvas overview/ });
  vi.spyOn(map, "getBoundingClientRect").mockReturnValue({ left: 20, top: 30, width: 190, height: 120 } as DOMRect);
  return map;
}

function viewportGrabPoint() {
  const indicator = screen.getByTestId("minimap-viewport");
  return {
    clientX: 20 + parseFloat(indicator.style.left) + parseFloat(indicator.style.width) / 4,
    clientY: 30 + parseFloat(indicator.style.top) + parseFloat(indicator.style.height) / 4,
  };
}

describe("canvas radar navigation", () => {
  it("drags the viewport without jumping to its center and preserves zoom", () => {
    const change = vi.fn();
    render(<CanvasMinimap nodes={[node]} viewport={viewport} onViewportChange={change} />);
    const map = minimapElement();
    const point = viewportGrabPoint();
    const indicatorWidth = parseFloat(screen.getByTestId("minimap-viewport").style.width);
    fireEvent.pointerDown(map, { ...point, button: 0, pointerId: 1 });
    expect(change).toHaveBeenLastCalledWith(viewport);
    expect(document.activeElement).toBe(map);
    fireEvent.pointerMove(map, { ...point, clientX: point.clientX + 10, pointerId: 1 });
    expect(change).toHaveBeenLastCalledWith({ x: Math.round(-10 * window.innerWidth / indicatorWidth), y: 0, zoom: 1 });
  });

  it("centers an outside click and ignores secondary pointers", () => {
    const change = vi.fn();
    render(<CanvasMinimap nodes={[node]} viewport={viewport} onViewportChange={change} />);
    const map = minimapElement();
    fireEvent.pointerDown(map, { clientX: 200, clientY: 140, button: 2, pointerId: 2 });
    expect(change).not.toHaveBeenCalled();
    fireEvent.pointerDown(map, { clientX: 200, clientY: 140, button: 0, pointerId: 1 });
    expect(change.mock.lastCall?.[0].x).toBeLessThan(-1000);
    const calls = change.mock.calls.length;
    fireEvent.pointerMove(map, { clientX: 20, clientY: 30, pointerId: 2 });
    expect(change).toHaveBeenCalledTimes(calls);
  });

  it("keeps the projection fixed while a drag moves beyond the graph bounds", () => {
    const change = vi.fn();
    const { rerender } = render(<CanvasMinimap nodes={[node]} viewport={viewport} onViewportChange={change} />);
    const map = minimapElement();
    const point = { clientX: 210, clientY: 140, button: 0, pointerId: 1 };
    fireEvent.pointerDown(map, point);
    const nextViewport = change.mock.lastCall?.[0];
    rerender(<CanvasMinimap nodes={[node]} viewport={nextViewport} onViewportChange={change} />);
    fireEvent.pointerMove(map, point);
    expect(change).toHaveBeenLastCalledWith(nextViewport);
  });

  it("ends a drag on cancellation, blur, or collapse and allows a new gesture", () => {
    const change = vi.fn();
    const props = { nodes: [node], viewport, onViewportChange: change };
    const { rerender } = render(<CanvasMinimap {...props} />);
    let map = minimapElement();
    const point = viewportGrabPoint();
    fireEvent.pointerDown(map, { ...point, button: 0, pointerId: 1 });
    fireEvent.pointerCancel(map, { pointerId: 1 });
    change.mockClear();
    fireEvent.pointerMove(map, { clientX: 200, clientY: 140, pointerId: 1 });
    expect(change).not.toHaveBeenCalled();
    fireEvent.pointerDown(map, { ...point, button: 0, pointerId: 2 });
    fireEvent.blur(window);
    change.mockClear();
    fireEvent.pointerMove(map, { clientX: 200, clientY: 140, pointerId: 2 });
    expect(change).not.toHaveBeenCalled();
    fireEvent.pointerDown(map, { ...point, button: 0, pointerId: 3 });
    rerender(<CanvasMinimap {...props} isOpen={false} />);
    rerender(<CanvasMinimap {...props} isOpen />);
    map = minimapElement();
    change.mockClear();
    fireEvent.pointerDown(map, { clientX: 200, clientY: 140, button: 0, pointerId: 4 });
    expect(change).toHaveBeenCalledTimes(1);
  });

  it("supports keyboard panning and marks radar controls as canvas UI", () => {
    const change = vi.fn();
    render(<CanvasMinimap nodes={[node]} viewport={{ x: 20, y: 30, zoom: 0.5 }} onViewportChange={change} />);
    const map = minimapElement();
    expect(map.closest("[data-canvas-ui]")).toBeTruthy();
    fireEvent.keyDown(map, { key: "ArrowRight", shiftKey: true });
    expect(change).toHaveBeenLastCalledWith({ x: -140, y: 30, zoom: 0.5 });
    fireEvent.keyDown(map, { key: "ArrowLeft", ctrlKey: true });
    expect(change).toHaveBeenCalledTimes(1);
  });
});

describe("canvas navigator", () => {
  const nodes: CanvasNode[] = [node, {
    ...node, id: "aws", title: "Orders", node_type: "aws_service",
    aws_metadata: { serviceId: "lambda", category: "compute", region: "eu-west-1" },
  }, { ...node, id: "note", title: "Notes", node_type: "annotation", annotation_metadata: { content: "Check PCI requirements" } }];

  function setup() {
    const jump = vi.fn();
    const close = vi.fn();
    render(<CanvasNavigator nodes={nodes} isOpen onToggle={vi.fn()} onClose={close} onJumpToNode={jump} />);
    return { jump, close, search: screen.getByRole("combobox", { name: "Search canvas" }) };
  }

  it("finds natural node types, resource metadata, and note content", () => {
    const { search } = setup();
    fireEvent.change(search, { target: { value: "aws service eu-west-1" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option").textContent).toContain("Orders");
    fireEvent.change(search, { target: { value: "pci requirements" } });
    expect(screen.getByRole("option").textContent).toContain("Notes");
  });

  it("returns focus to search when filtering or clearing and handles empty results", () => {
    const { search } = setup();
    const filter = screen.getByRole("button", { name: "AWS" });
    filter.focus();
    fireEvent.click(filter);
    expect(document.activeElement).toBe(search);
    expect(screen.getAllByRole("option")).toHaveLength(1);
    fireEvent.change(search, { target: { value: "no matching item" } });
    expect(screen.queryByRole("option")).toBeNull();
    expect(search.getAttribute("aria-activedescendant")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Clear canvas search" }));
    expect(document.activeElement).toBe(search);
    expect((search as HTMLInputElement).value).toBe("");
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("navigates results by keyboard and restores trigger focus after jumping", () => {
    const { search, jump, close } = setup();
    fireEvent.keyDown(search, { key: "ArrowUp" });
    expect(screen.getByRole("option", { selected: true }).textContent).toContain("Notes");
    fireEvent.keyDown(search, { key: "Home", ctrlKey: true });
    expect(screen.getByRole("option", { selected: true }).textContent).toContain("Ship checkout");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(jump).toHaveBeenCalledWith("aws");
    expect(close).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Find on canvas" }));
  });

  it("ignores composing Enter and closes from its keyboard shortcut", () => {
    const { search, jump, close } = setup();
    fireEvent.keyDown(search, { key: "Enter", isComposing: true });
    expect(jump).not.toHaveBeenCalled();
    fireEvent.keyDown(search, { key: "k", ctrlKey: true });
    expect(close).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Find on canvas" }));
  });
});
