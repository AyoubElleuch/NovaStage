import { afterEach, describe, it, expect, vi } from "vitest";
import React, { useState } from "react";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import CanvasMinimap from "./canvas-minimap";
import type { CanvasNode, CanvasViewport } from "@/lib/canvas/types";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("CanvasMinimap Component", () => {
  const mockNodes: CanvasNode[] = [
    {
      id: "n1",
      project_id: "p1",
      title: "Step 1: Setup",
      description: "",
      status: "completed",
      position_x: 100,
      position_y: 100,
      width: 280,
      height: 170,
      color: "default",
      sort_order: 0,
      claimed_by: null,
      version: 1,
      created_at: "",
      updated_at: "",
      checkpoints: [
        { id: "c1", node_id: "n1", project_id: "p1", title: "DB", is_completed: true, sort_order: 0, completed_at: null, completed_by: null, created_at: "", updated_at: "" },
      ],
    },
    {
      id: "n2",
      project_id: "p1",
      title: "Step 2: API",
      description: "",
      status: "draft",
      position_x: 500,
      position_y: 100,
      width: 280,
      height: 170,
      color: "default",
      sort_order: 1,
      claimed_by: "user-1",
      version: 1,
      created_at: "",
      updated_at: "",
      checkpoints: [],
    },
  ];

  const mockViewport: CanvasViewport = { x: 0, y: 0, zoom: 1.0 };

  it("renders radar container when isOpen is true", () => {
    render(
      <CanvasMinimap
        nodes={mockNodes}
        viewport={mockViewport}
        onViewportChange={vi.fn()}
        isOpen={true}
      />
    );

    expect(screen.getByRole("complementary", { name: /radar/i })).not.toBeNull();
    expect(screen.getByTitle("Step 1: Setup")).not.toBeNull();
    expect(screen.getByTitle("Step 2: API")).not.toBeNull();
  });

  it("handles clicking to pan viewport", () => {
    const handleViewportChange = vi.fn();
    render(
      <CanvasMinimap
        nodes={mockNodes}
        viewport={mockViewport}
        onViewportChange={handleViewportChange}
        isOpen={true}
      />
    );

    const radar = screen.getByTitle("Step 1: Setup").parentElement;
    if (radar) {
      fireEvent.pointerDown(radar, { clientX: 50, clientY: 50, pointerId: 1 });
      expect(handleViewportChange).toHaveBeenCalled();
    }
  });

  it("toggles collapse/expand when radar button is clicked", () => {
    const handleToggle = vi.fn();
    render(
      <CanvasMinimap
        nodes={mockNodes}
        viewport={mockViewport}
        onViewportChange={vi.fn()}
        isOpen={true}
        onToggleOpen={handleToggle}
      />
    );

    const toggleBtn = screen.getByTitle(/collapse minimap/i);
    fireEvent.click(toggleBtn);
    expect(handleToggle).toHaveBeenCalled();
  });

  it("centers on the actual canvas area and keeps the map projection stable while dragging", () => {
    vi.stubGlobal("PointerEvent", MouseEvent);
    const changed = vi.fn();
    const observe = vi.fn();
    vi.stubGlobal("ResizeObserver", class { observe = observe; disconnect = vi.fn(); });
    function Harness() {
      const [viewport, setViewport] = useState(mockViewport);
      return <div>
        <div data-canvas-viewport ref={element => {
          if (element) Object.defineProperties(element, { clientWidth: { value: 600 }, clientHeight: { value: 400 } });
        }} />
        <CanvasMinimap nodes={mockNodes} viewport={viewport} onViewportChange={next => { changed(next); setViewport(next); }} />
      </div>;
    }
    render(<Harness />);
    expect(observe).toHaveBeenCalledOnce();
    const radar = screen.getByRole("region", { name: /canvas overview/i });
    // Bounds are x=0..860, y=0..400. Center is world (430, 200).
    fireEvent.pointerDown(radar, { button: 0, clientX: 95, clientY: 60 });
    expect(changed).toHaveBeenLastCalledWith({ x: -130, y: 0, zoom: 1 });
    const first = changed.mock.calls.at(-1)![0];
    fireEvent.pointerMove(radar, { clientX: 95, clientY: 60 });
    expect(changed).toHaveBeenLastCalledWith(first);
    fireEvent.pointerCancel(radar);
    changed.mockClear();
    fireEvent.pointerMove(radar, { clientX: 170, clientY: 100 });
    expect(changed).not.toHaveBeenCalled();
  });

  it("keeps the viewport indicator visible far from the graph and supports keyboard panning", () => {
    const changed = vi.fn();
    render(<CanvasMinimap nodes={mockNodes} viewport={{ x: -5000, y: -3000, zoom: 1 }} onViewportChange={changed} />);
    const indicator = screen.getByTestId("minimap-viewport");
    expect(parseFloat(indicator.style.left)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(indicator.style.left) + parseFloat(indicator.style.width)).toBeLessThanOrEqual(190.001);
    expect(parseFloat(indicator.style.top) + parseFloat(indicator.style.height)).toBeLessThanOrEqual(120.001);
    fireEvent.keyDown(screen.getByRole("region", { name: /canvas overview/i }), { key: "ArrowLeft", shiftKey: true });
    expect(changed).toHaveBeenLastCalledWith({ x: -4840, y: -3000, zoom: 1 });
  });

  it("centers radar navigation in the visible canvas space beside the inspector", () => {
    vi.stubGlobal("PointerEvent", MouseEvent);
    const changed = vi.fn();
    render(<div>
      <div data-canvas-viewport ref={element => {
        if (element) Object.defineProperties(element, { clientWidth: { value: 1000 }, clientHeight: { value: 400 } });
      }} />
      <CanvasMinimap nodes={mockNodes} viewport={mockViewport} rightInset={420} onViewportChange={changed} />
    </div>);
    const indicator = screen.getByTestId("minimap-viewport");
    expect(parseFloat(indicator.style.width)).toBeCloseTo(580 / 860 * 190);
    fireEvent.pointerDown(screen.getByRole("region", { name: /canvas overview/i }), { button: 0, clientX: 95, clientY: 60 });
    expect(changed).toHaveBeenLastCalledWith({ x: -140, y: 0, zoom: 1 });
  });
});
