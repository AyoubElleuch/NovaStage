// @vitest-environment jsdom
import React from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CanvasViewportContainer from "./canvas-viewport";
import type { CanvasViewport } from "@/lib/canvas/types";

vi.mock("@/lib/theme-context", () => ({ useTheme: () => ({ theme: "light" }) }));

class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;
  readonly pointerType: string;

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? "mouse";
  }
}

beforeAll(() => vi.stubGlobal("PointerEvent", TestPointerEvent));
afterAll(() => vi.unstubAllGlobals());
afterEach(cleanup);

function setup(overrides: Partial<React.ComponentProps<typeof CanvasViewportContainer>> = {}) {
  const onViewportChange = vi.fn();
  const onCanvasClick = vi.fn();
  const onMarqueeEnd = vi.fn();
  render(
    <CanvasViewportContainer
      viewport={{ x: 0, y: 0, zoom: 1 }}
      onViewportChange={onViewportChange}
      activeTool="select"
      isDraggingNode={false}
      onCanvasClick={onCanvasClick}
      onMarqueeEnd={onMarqueeEnd}
      {...overrides}
    >
      {overrides.children ?? <>
        <div data-testid="node">Node</div>
        <button type="button">Node action</button>
        <div contentEditable="plaintext-only" suppressContentEditableWarning data-testid="editable">Editable label</div>
      </>}
    </CanvasViewportContainer>,
  );
  const canvas = screen.getByRole("region", { name: "Interactive canvas" });
  Object.defineProperties(canvas, {
    clientWidth: { configurable: true, value: 800 },
    clientHeight: { configurable: true, value: 600 },
  });
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, toJSON: () => ({}),
  });
  return { canvas, onViewportChange, onCanvasClick, onMarqueeEnd };
}

function lastViewport(callback: ReturnType<typeof vi.fn>): CanvasViewport {
  return callback.mock.calls.at(-1)![0] as CanvasViewport;
}

describe("canvas navigation", () => {
  it("keeps the world point under the cursor fixed across rapid wheel zooms", () => {
    const initial = { x: 40, y: -20, zoom: 0.8 };
    const { canvas, onViewportChange } = setup({ viewport: initial });
    fireEvent.wheel(canvas, { clientX: 300, clientY: 200, deltaY: -60, ctrlKey: true });
    const first = lastViewport(onViewportChange);
    fireEvent.wheel(canvas, { clientX: 300, clientY: 200, deltaY: -60, ctrlKey: true });
    const second = lastViewport(onViewportChange);
    expect(second.zoom).toBeGreaterThan(first.zoom);
    expect((300 - second.x) / second.zoom).toBeCloseTo((300 - initial.x) / initial.zoom);
    expect((200 - second.y) / second.zoom).toBeCloseTo((200 - initial.y) / initial.zoom);
  });

  it("normalizes wheel line units and supports horizontal Shift-wheel panning", () => {
    const { canvas, onViewportChange } = setup();
    fireEvent.wheel(canvas, { deltaY: 3, deltaMode: 1, shiftKey: true });
    expect(lastViewport(onViewportChange)).toEqual({ x: -48, y: 0, zoom: 1 });
  });

  it("pans in local coordinates when the canvas is visually scaled and suppresses the resulting click", () => {
    const { canvas, onViewportChange, onCanvasClick } = setup({ activeTool: "hand" });
    vi.mocked(canvas.getBoundingClientRect).mockReturnValue({
      x: 100, y: 50, left: 100, top: 50, right: 500, bottom: 350, width: 400, height: 300, toJSON: () => ({}),
    });
    fireEvent.pointerDown(canvas, { pointerId: 1, button: 0, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 240, clientY: 130 });
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 240, clientY: 130 });
    fireEvent.click(canvas, { clientX: 240, clientY: 130 });
    expect(lastViewport(onViewportChange)).toEqual({ x: 80, y: 60, zoom: 1 });
    expect(onCanvasClick).not.toHaveBeenCalled();
  });

  it("allows the second pinch finger to land on a node, then continues a one-finger pan without jumping", () => {
    const nodePointerDown = vi.fn();
    const { canvas, onViewportChange, onCanvasClick } = setup({
      children: <div data-testid="node" onPointerDown={nodePointerDown}>Node</div>,
    });
    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: "touch", clientX: 100, clientY: 100 });
    fireEvent.pointerDown(screen.getByTestId("node"), { pointerId: 2, pointerType: "touch", clientX: 200, clientY: 100 });
    fireEvent.pointerMove(canvas, { pointerId: 2, pointerType: "touch", clientX: 300, clientY: 100 });
    expect(nodePointerDown).not.toHaveBeenCalled();
    expect(lastViewport(onViewportChange)).toEqual({ x: -100, y: -100, zoom: 2 });
    fireEvent.pointerUp(canvas, { pointerId: 2, pointerType: "touch", clientX: 300, clientY: 100 });
    fireEvent.pointerMove(canvas, { pointerId: 1, pointerType: "touch", clientX: 120, clientY: 130 });
    expect(lastViewport(onViewportChange)).toEqual({ x: -80, y: -70, zoom: 2 });
    fireEvent.pointerUp(canvas, { pointerId: 1, pointerType: "touch", clientX: 120, clientY: 130 });
    fireEvent.click(canvas, { clientX: 120, clientY: 130 });
    expect(onCanvasClick).not.toHaveBeenCalled();
  });

  it("does not turn simultaneous mouse and touch input into a pinch", () => {
    const { canvas, onViewportChange } = setup({ activeTool: "hand" });
    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: "mouse", button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(canvas, { pointerId: 2, pointerType: "touch", clientX: 200, clientY: 100 });
    fireEvent.pointerMove(canvas, { pointerId: 2, pointerType: "touch", clientX: 300, clientY: 100 });
    expect(onViewportChange).not.toHaveBeenCalled();
    fireEvent.pointerMove(canvas, { pointerId: 1, pointerType: "mouse", clientX: 120, clientY: 130 });
    expect(lastViewport(onViewportChange)).toEqual({ x: 20, y: 30, zoom: 1 });
  });

  it("clears canceled gestures so the next touch gesture starts cleanly", () => {
    const { canvas, onViewportChange } = setup();
    fireEvent.pointerDown(canvas, { pointerId: 1, pointerType: "touch", clientX: 100, clientY: 100 });
    fireEvent.pointerCancel(canvas, { pointerId: 1, pointerType: "touch" });
    fireEvent.pointerMove(canvas, { pointerId: 1, pointerType: "touch", clientX: 300, clientY: 300 });
    expect(onViewportChange).not.toHaveBeenCalled();
    fireEvent.pointerDown(canvas, { pointerId: 2, pointerType: "touch", clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { pointerId: 2, pointerType: "touch", clientX: 125, clientY: 115 });
    expect(lastViewport(onViewportChange)).toEqual({ x: 25, y: 15, zoom: 1 });
  });

  it("prevents browser scrolling on repeated Space keydowns and resets pan mode on blur", () => {
    const { canvas, onViewportChange } = setup();
    expect(fireEvent.keyDown(canvas, { key: " ", code: "Space" })).toBe(false);
    expect(fireEvent.keyDown(canvas, { key: " ", code: "Space", repeat: true })).toBe(false);
    fireEvent.blur(window);
    fireEvent.pointerDown(canvas, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 120, clientY: 130 });
    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it("keeps controls and editable labels usable while the hand tool is active", () => {
    const { onViewportChange } = setup({ activeTool: "hand" });
    for (const target of [screen.getByRole("button"), screen.getByTestId("editable")]) {
      fireEvent.pointerDown(target, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
      fireEvent.pointerMove(target, { pointerId: 1, clientX: 150, clientY: 130 });
      fireEvent.pointerUp(target, { pointerId: 1 });
    }
    expect(onViewportChange).not.toHaveBeenCalled();
  });
});
