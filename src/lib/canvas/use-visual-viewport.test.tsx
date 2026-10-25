// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { useCanvasVisualViewport } from "./use-visual-viewport";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("keeps panels inside the keyboard's visible area and restores document styles on exit", () => {
  const viewport = Object.assign(new EventTarget(), { height: 844, offsetTop: 0 });
  vi.stubGlobal("visualViewport", viewport);
  const root = document.documentElement;
  const { unmount } = renderHook(useCanvasVisualViewport);
  expect(root.style.getPropertyValue("--canvas-visible-height")).toBe("844px");
  viewport.height = 330;
  viewport.offsetTop = 52;
  viewport.dispatchEvent(new Event("resize"));
  expect(root.style.getPropertyValue("--canvas-visible-height")).toBe("330px");
  expect(root.style.getPropertyValue("--canvas-visible-top")).toBe("52px");
  unmount();
  expect(root.style.getPropertyValue("--canvas-visible-height")).toBe("");
  expect(root.style.getPropertyValue("--canvas-visible-top")).toBe("");
});
