// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CanvasShortcuts from "./canvas-shortcuts";
import CanvasDock from "./canvas-dock";

afterEach(cleanup);

it("keeps keyboard focus in the guide and restores the invoking control on close", () => {
  const trigger = document.createElement("button");
  document.body.append(trigger);
  trigger.focus();
  const close = vi.fn();
  const view = render(<CanvasShortcuts onClose={close} />);
  const button = screen.getByRole("button", { name: "Close keyboard shortcuts" });
  expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" }).getAttribute("aria-modal")).toBe("true");
  expect(document.activeElement).toBe(button);
  expect(screen.getByText("Fit selection")).toBeTruthy();
  expect(screen.getByText("Shift + 2")).toBeTruthy();
  expect(fireEvent.keyDown(button, { key: "Tab", shiftKey: true })).toBe(false);
  const reference = screen.getByRole("region", { name: "Canvas shortcut reference" });
  expect(document.activeElement).toBe(reference);
  fireEvent.keyDown(reference, { key: "Tab" });
  expect(document.activeElement).toBe(button);
  fireEvent.keyDown(button, { key: "Escape" });
  expect(close).toHaveBeenCalledOnce();
  view.unmount();
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});

it("isolates canvas shortcuts and dismisses only from the backdrop or close button", () => {
  const close = vi.fn();
  const canvasKeyDown = vi.fn();
  render(<div onKeyDown={canvasKeyDown}><CanvasShortcuts onClose={close} /></div>);
  const dialog = screen.getByRole("dialog");
  fireEvent.pointerDown(dialog);
  expect(close).not.toHaveBeenCalled();
  fireEvent.keyDown(dialog, { key: "Delete" });
  expect(canvasKeyDown).not.toHaveBeenCalled();
  fireEvent.pointerDown(dialog.parentElement!);
  expect(close).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Close keyboard shortcuts" }));
  expect(close).toHaveBeenCalledTimes(2);
});

it("opens the guide from desktop and mobile dock controls", () => {
  const open = vi.fn();
  render(<CanvasDock activeTool="select" viewport={{ x: 0, y: 0, zoom: 1 }}
    onSelectTool={vi.fn()} onZoomIn={vi.fn()} onZoomOut={vi.fn()} onResetZoom={vi.fn()}
    onFitView={vi.fn()} onAddNode={vi.fn()} onTidyLayout={vi.fn()} snapGrid onToggleSnapGrid={vi.fn()} onOpenShortcuts={open} />);
  fireEvent.click(screen.getByRole("button", { name: "Keyboard shortcuts" }));
  expect(open).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Canvas tools" }));
  const tools = screen.getByRole("region", { name: "Canvas tools" });
  fireEvent.click(tools.querySelector("button.col-span-2")!);
  expect(open).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("region", { name: "Canvas tools" })).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Canvas tools" }));
});
