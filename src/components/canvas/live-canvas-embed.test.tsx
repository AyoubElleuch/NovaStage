// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import LiveCanvasEmbed from "./live-canvas-embed";
import type { CanvasNode } from "@/lib/canvas/types";

vi.mock("./shared-canvas-viewer", () => ({ default: ({ nodes, embedded }: { nodes: CanvasNode[]; embedded: boolean }) => <div>{embedded && "Embedded"} {nodes.map(node => node.title).join(",")}</div> }));
const initialCanvas = { nodes: [{ id: "one", title: "Original" } as CanvasNode], edges: [] };
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it("refreshes saved content without remounting and omits visitor credentials", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => initialCanvas });
  vi.stubGlobal("fetch", fetcher);
  render(<LiveCanvasEmbed token="token" initialCanvas={initialCanvas} />);
  await act(async () => {});
  expect(screen.getByText("Embedded Original")).toBeTruthy();
  expect(fetcher).toHaveBeenCalledWith("/share/token/data", expect.objectContaining({ credentials: "omit", cache: "no-store" }));
  fetcher.mockResolvedValue({ ok: true, status: 200, json: async () => ({ nodes: [{ id: "one", title: "Changed" }], edges: [] }) });
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(screen.getByText("Embedded Changed")).toBeTruthy();
});

it("clears previously displayed content when sharing is revoked and stops polling", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockResolvedValue({ status: 404 });
  vi.stubGlobal("fetch", fetcher);
  render(<LiveCanvasEmbed token="token" initialCanvas={initialCanvas} />);
  await act(async () => {});
  expect(screen.queryByText(/Original/)).toBeNull();
  expect(screen.getByRole("status").textContent).toMatch(/no longer available/);
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("retains the last canvas during an outage and recovers on retry", async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
  vi.stubGlobal("fetch", fetcher);
  render(<LiveCanvasEmbed token="token" initialCanvas={initialCanvas} />);
  await act(async () => {});
  expect(screen.getByText("Embedded Original")).toBeTruthy();
  expect(screen.getByRole("status").textContent).toMatch(/Reconnecting/);
  fetcher.mockResolvedValue({ ok: true, status: 200, json: async () => initialCanvas });
  await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
  expect(screen.queryByRole("status")).toBeNull();
});
