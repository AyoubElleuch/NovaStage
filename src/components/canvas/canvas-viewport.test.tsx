import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import CanvasViewportContainer from "./canvas-viewport";
import type { CanvasTool } from "@/lib/canvas/types";

vi.mock("@/lib/theme-context", () => ({ useTheme: () => ({ theme: "light" }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function setup(tool: CanvasTool = "hand") {
  const childDown = vi.fn();
  const childClick = vi.fn();
  const changed = vi.fn();
  function Harness() {
    const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
    return <CanvasViewportContainer viewport={viewport} onViewportChange={(next) => {
      changed(next); setViewport(next);
    }} activeTool={tool} isDraggingNode={false}>
      <div data-testid="group" onPointerDown={childDown} onClick={childClick}>Group</div>
    </CanvasViewportContainer>;
  }
  const result = render(<Harness />);
  const canvas = result.container.firstElementChild!;
  return { ...result, canvas, changed, childDown, childClick };
}

describe("canvas navigation", () => {
  it("continues one-finger panning after a pinch and stops on cancellation", () => {
    class TouchPointerEvent extends MouseEvent {
      pointerId: number;
      pointerType: string;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId || 0;
        this.pointerType = init.pointerType || "touch";
      }
    }
    vi.stubGlobal("PointerEvent", TouchPointerEvent);
    const { canvas, changed } = setup();
    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(canvas, { pointerId: 2, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(canvas, { pointerId: 2, clientX: 300, clientY: 100 });
    expect(changed).toHaveBeenLastCalledWith({ x: -100, y: -100, zoom: 2 });
    fireEvent.pointerUp(canvas, { pointerId: 2 });
    fireEvent.lostPointerCapture(canvas, { pointerId: 2 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 120, clientY: 130 });
    expect(changed).toHaveBeenLastCalledWith({ x: -80, y: -70, zoom: 2 });
    fireEvent.pointerCancel(canvas, { pointerId: 1 });
    changed.mockClear();
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 200, clientY: 200 });
    expect(changed).not.toHaveBeenCalled();
  });

  it("cancels browser Ctrl+wheel zoom and keeps the pointer anchored", () => {
    const { canvas, changed } = setup();
    const event = new WheelEvent("wheel", { bubbles: true, cancelable: true,
      ctrlKey: true, deltaY: -20, clientX: 200, clientY: 100 });
    fireEvent(canvas, event);
    expect(event.defaultPrevented).toBe(true);
    const next = changed.mock.calls[0][0];
    expect(next.zoom).toBeCloseTo(Math.exp(20 * 0.0025));
    expect(next.zoom).toBeLessThan(1.06);
    expect((200 - next.x) / next.zoom).toBeCloseTo(200);
    expect((100 - next.y) / next.zoom).toBeCloseTo(100);
  });

  it("pans over groups with the hand tool without selecting them", () => {
    vi.stubGlobal("PointerEvent", MouseEvent);
    const { getByTestId, changed, childDown, childClick } = setup();
    const group = getByTestId("group");
    fireEvent.pointerDown(group, { button: 0, clientX: 20, clientY: 30 });
    fireEvent.pointerMove(group, { clientX: 100, clientY: 90 });
    fireEvent.pointerUp(group);
    fireEvent.click(group);
    expect(changed).toHaveBeenLastCalledWith({ x: 80, y: 60, zoom: 1 });
    expect(childDown).not.toHaveBeenCalled();
    expect(childClick).not.toHaveBeenCalled();
  });

  it("preserves node interactions with the selection tool", () => {
    vi.stubGlobal("PointerEvent", MouseEvent);
    const { getByTestId, childDown, childClick } = setup("select");
    fireEvent.pointerDown(getByTestId("group"), { button: 0 });
    fireEvent.click(getByTestId("group"));
    expect(childDown).toHaveBeenCalledOnce();
    expect(childClick).toHaveBeenCalledOnce();
  });
});