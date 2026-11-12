"use client";

import { useEffect, useState } from "react";
import type { CanvasNode, CanvasEdge } from "@/lib/canvas/types";
import SharedCanvasViewer from "./shared-canvas-viewer";

type Canvas = { nodes: CanvasNode[]; edges: CanvasEdge[] };

/** Poll through the public allowlist; never subscribe visitors to private tables. */
export default function LiveCanvasEmbed({ token, initialCanvas }: { token: string; initialCanvas: Canvas }) {
  const [canvas, setCanvas] = useState(initialCanvas);
  const [unavailable, setUnavailable] = useState(false);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    let previous = JSON.stringify(initialCanvas);
    async function refresh() {
      try {
        const response = await fetch(`/share/${encodeURIComponent(token)}/data`, {
          cache: "no-store", credentials: "omit", signal: controller.signal,
        });
        if (stopped) return;
        if (response.status === 404) { setUnavailable(true); stopped = true; return; }
        if (!response.ok) throw new Error("Refresh failed");
        const next: Canvas = await response.json();
        if (stopped) return;
        const serialized = JSON.stringify(next);
        if (serialized !== previous) { previous = serialized; setCanvas(next); }
        setStale(false);
      } catch {
        if (!stopped) setStale(true);
      } finally {
        if (!stopped) timer = setTimeout(refresh, 5000);
      }
    }
    void refresh();
    return () => { stopped = true; clearTimeout(timer); controller.abort(); };
  }, [token, initialCanvas]);

  if (unavailable) return <main className="grid h-dvh place-items-center p-6 text-center" role="status">This canvas is no longer available.</main>;
  return <>
    <SharedCanvasViewer nodes={canvas.nodes} edges={canvas.edges} embedded />
    {stale && <p role="status" className="absolute left-3 top-3 z-30 rounded-lg bg-white p-2 text-xs text-neutral-700 shadow">Reconnecting to live canvas…</p>}
  </>;
}
