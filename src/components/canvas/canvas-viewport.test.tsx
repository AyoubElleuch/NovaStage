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
  const canvasClick = vi.fn();
  const marqueeStart = vi.fn();
  const marqueeChange = vi.fn();
  const marqueeEnd = vi.fn();
  const controlClick = vi.fn();
  function Harness() {
    const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
    return <CanvasViewportContainer viewport={viewport} onViewportChange={(next) => {
      changed(next); setViewport(next);
    }} activeTool={tool} isDraggingNode={false} onCanvasClick={canvasClick}
      onMarqueeStart={marqueeStart} onMarqueeChange={marqueeChange} onMarqueeEnd={marqueeEnd}>
      <div data-testid="group" onPointerDown={childDown} onClick={childClick}>Group
        <button onClick={controlClick}>Card action</button><input aria-label="Card title" />
        <div data-canvas-scroll data-testid="scrollable-note">Long note content</div>
        <div data-canvas-ui data-testid="connection-control" onClick={controlClick}>Connection control</div>
      </div>
    </CanvasViewportContainer>;
  }
  const result = render(<Harness />);
  const canvas = result.container.firstElementChild!;
  return { ...result, canvas, changed, childDown, childClick, canvasClick, marqueeStart, marqueeChange, marqueeEnd, controlClick };
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

  it("lets notes scroll natively while preserving Ctrl+wheel canvas zoom", () => {
    const { getByTestId, changed } = setup("select");
    const note = getByTestId("scrollable-note");
    const scroll = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 120 });
    fireEvent(note, scroll);
    expect(scroll.defaultPrevented).toBe(false);
    expect(changed).not.toHaveBeenCalled();
    const zoom = new WheelEvent("wheel", { bubbles: true, cancelable: true, ctrlKey: true,
      deltaY: -20, clientX: 100, clientY: 50 });
    fireEvent(note, zoom);
    expect(zoom.defaultPrevented).toBe(true);
    const next = changed.mock.calls[0][0];
    expect((100 - next.x) / next.zoom).toBeCloseTo(100);
    expect((50 - next.y) / next.zoom).toBeCloseTo(50);
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

  it("does not mistake a slow Alt drag for a click or block the next node interaction", () => {
    vi.stubGlobal("PointerEvent", MouseEvent);
    const { canvas, changed, canvasClick, getByTestId, childClick } = setup("select");
    fireEvent.pointerDown(canvas, { button: 0, altKey: true, clientX: 20, clientY: 30 });
    for (let x = 21; x <= 30; x++) fireEvent.pointerMove(canvas, { clientX: x, clientY: 30 });
    fireEvent.pointerUp(canvas);
    fireEvent.click(canvas);
    expect(changed).toHaveBeenLastCalledWith({ x: 10, y: 0, zoom: 1 });
    expect(canvasClick).not.toHaveBeenCalled();
    fireEvent.pointerDown(getByTestId("group"), { button: 0 });
    fireEvent.click(getByTestId("group"));
    expect(childClick).toHaveBeenCalledOnce();
  });

  it("retains marquee selection even when the pointer has no movementX data", () => {
    vi.stubGlobal("PointerEvent", MouseEvent);
    const { canvas, canvasClick, marqueeStart, marqueeChange, marqueeEnd } = setup("select");
    fireEvent.pointerDown(canvas, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { clientX: 180, clientY: 150 });
    fireEvent.pointerUp(canvas);
    fireEvent.click(canvas, { clientX: 180, clientY: 150 });
    expect(marqueeStart).toHaveBeenCalledOnce();
    expect(marqueeChange).toHaveBeenLastCalledWith({ x: 180, y: 150 }, { x: 180, y: 150 });
    expect(marqueeEnd).toHaveBeenCalledOnce();
    expect(canvasClick).not.toHaveBeenCalled();
    fireEvent.pointerDown(canvas, { button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerUp(canvas);
    fireEvent.click(canvas, { clientX: 50, clientY: 50 });
    expect(canvasClick).toHaveBeenCalledWith({ x: 50, y: 50 });
  });

  it("keeps card buttons working with the hand tool", () => {
    vi.stubGlobal("PointerEvent", MouseEvent);
    const { getByRole, controlClick, changed } = setup();
    const button = getByRole("button", { name: "Card action" });
    fireEvent.pointerDown(button, { button: 0 });
    fireEvent.click(button);
    expect(controlClick).toHaveBeenCalledOnce();
    expect(changed).not.toHaveBeenCalled();
  });

  it("keeps marked connection controls working with the hand tool", () => {
    vi.stubGlobal("PointerEvent", MouseEvent);
    const { getByTestId, controlClick, changed } = setup();
    const control = getByTestId("connection-control");
    fireEvent.pointerDown(control, { button: 0 });
    fireEvent.click(control);
    expect(controlClick).toHaveBeenCalledOnce();
    expect(changed).not.toHaveBeenCalled();
  });

  it("lets touch users interact with nodes in selection mode", () => {
    class TouchPointerEvent extends MouseEvent {
      pointerId = 1;
      pointerType = "touch";
    }
    vi.stubGlobal("PointerEvent", TouchPointerEvent);
    const { getByTestId, childDown, changed } = setup("select");
    fireEvent.pointerDown(getByTestId("group"), { button: 0 });
    expect(childDown).toHaveBeenCalledOnce();
    expect(changed).not.toHaveBeenCalled();
  });

  it("supports focused keyboard navigation while leaving card editing keys alone", () => {
    const { canvas, changed, getByRole } = setup("select");
    Object.defineProperties(canvas, { clientWidth: { value: 800 }, clientHeight: { value: 600 } });
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    expect(changed).toHaveBeenLastCalledWith({ x: -48, y: 0, zoom: 1 });
    fireEvent.keyDown(canvas, { key: "+" });
    const next = changed.mock.calls.at(-1)![0];
    expect((400 - next.x) / next.zoom).toBeCloseTo(448);
    expect((300 - next.y) / next.zoom).toBeCloseTo(300);
    changed.mockClear();
    fireEvent.keyDown(getByRole("textbox", { name: "Card title" }), { key: "ArrowRight" });
    fireEvent.keyDown(getByRole("textbox", { name: "Card title" }), { key: " ", code: "Space" });
    expect(changed).not.toHaveBeenCalled();
  });

  it("handles hovering with no active gesture", () => {
    vi.stubGlobal("PointerEvent", MouseEvent);
    const { canvas, changed } = setup("select");
    fireEvent.pointerMove(canvas, { clientX: 200, clientY: 100 });
    expect(changed).not.toHaveBeenCalled();
  });
});
