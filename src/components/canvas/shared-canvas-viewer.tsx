"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Circle, Eye, Maximize2, Minus, Moon, Plus, Sun, X } from "lucide-react";
import type { CanvasEdge, CanvasNode, CanvasViewport } from "@/lib/canvas/types";
import { getNodeDimensions } from "@/lib/canvas/coordinate-math";
import { fitCanvasNodes, zoomAroundCenter } from "@/lib/canvas/workspace";
import { useTheme } from "@/lib/theme-context";
import CanvasViewportContainer from "./canvas-viewport";
import CanvasEdgeLayer from "./canvas-edge-layer";
import CanvasNavigator from "./canvas-navigator";
import CanvasNodeComponent from "./canvas-node";

const BUTTON = "grid h-11 min-w-11 place-items-center rounded-xl border border-neutral-200 bg-white/95 px-3 text-sm shadow-sm hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-[#283548] dark:bg-[#161d27] dark:hover:bg-[#1e2634]";

/** Deliberately has no auth client, realtime subscriptions, or mutation callbacks. */
export default function SharedCanvasViewer({ nodes, edges }: { nodes: CanvasNode[]; edges: CanvasEdge[] }) {
  const root = useRef<HTMLElement>(null);
  const [viewport, setViewport] = useState<CanvasViewport>({ x: 0, y: 0, zoom: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const details = useRef<HTMLDialogElement>(null);
  const selected = nodes.find(node => node.id === selectedId);
  const milestoneIndex = useMemo(() => new Map(nodes.filter(node => !node.node_type || node.node_type === "milestone").map((node, index) => [node.id, index])), [nodes]);
  const { theme, toggleTheme } = useTheme();
  const area = () => ({ width: root.current?.clientWidth || window.innerWidth, height: root.current?.clientHeight || window.innerHeight });
  const fit = useCallback(() => { if (root.current) setViewport(fitCanvasNodes(nodes, { width: root.current.clientWidth, height: root.current.clientHeight })); }, [nodes]);
  useEffect(() => {
    fit();
    const element = root.current;
    if (!element) return;
    let previous = { width: element.clientWidth, height: element.clientHeight };
    const observer = new ResizeObserver(() => {
      const next = { width: element.clientWidth, height: element.clientHeight };
      if (Math.abs(next.width - previous.width) > 80) fit();
      previous = next;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [fit]);
  useEffect(() => { if (selectedId) details.current?.showModal(); }, [selectedId]);
  const openNode = (id: string) => { setSearchOpen(false); setSelectedId(id); };

  return <main ref={root} aria-label="Shared canvas" className="relative h-dvh w-full overflow-hidden bg-[#faf8f5] text-neutral-900 dark:bg-[#10151f] dark:text-white">
    <header data-canvas-ui className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="pointer-events-auto flex min-w-0 items-center gap-2 rounded-xl border border-neutral-200 bg-white/95 px-3 py-2 shadow-sm dark:border-[#283548] dark:bg-[#161d27]"><Eye className="h-4 w-4 shrink-0 text-emerald-600" /><div><h1 className="text-sm font-semibold">Shared canvas</h1><p className="text-[11px] text-neutral-500 dark:text-neutral-400">View only · NovaStage</p></div></div>
      <button type="button" onClick={toggleTheme} aria-label="Toggle dark mode" className={`${BUTTON} pointer-events-auto`}>{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
    </header>
    <CanvasNavigator nodes={nodes} isOpen={searchOpen} onToggle={() => setSearchOpen(open => !open)} onClose={() => setSearchOpen(false)} onJumpToNode={id => {
      const node = nodes.find(item => item.id === id);
      if (node) { setViewport(fitCanvasNodes([node], area())); openNode(id); }
    }} />
    <CanvasViewportContainer viewport={viewport} onViewportChange={setViewport} activeTool="hand" allowHandToolClick isDraggingNode={false}
      onCanvasClick={point => {
        // Panning captures the pointer on the viewport; resolve a stationary tap
        // in world coordinates instead of depending on the retargeted click.
        const hit = [...nodes].sort((a, b) => Number(a.node_type === "group") - Number(b.node_type === "group")).find(node => {
          const size = getNodeDimensions(node);
          return point.x >= node.position_x && point.x <= node.position_x + size.width &&
            point.y >= node.position_y - (node.node_type === "group" ? 24 : 0) && point.y <= node.position_y + size.height;
        });
        if (hit) openNode(hit.id);
      }}>
      <CanvasEdgeLayer edges={edges} nodes={nodes} draftEdge={null} onDeleteEdge={() => {}} readOnly />
      {nodes.map(node => <CanvasNodeComponent key={node.id} node={node} readOnly
        stepIndex={milestoneIndex.get(node.id) ?? 0}
        isSelected={selectedId === node.id} isLinking={false} currentUserId="shared-viewer"
        onSelect={item => openNode(item.id)} onDragStart={() => {}} onDragEnd={() => {}}
        onStartLink={() => {}} onToggleCheckpoint={() => {}} onRequestClaim={() => {}} />)}
    </CanvasViewportContainer>
    {!nodes.length && <p role="status" className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-sm text-neutral-500">There is nothing on this canvas yet.</p>}
    <p className="pointer-events-none absolute inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] text-center text-[11px] text-neutral-500 dark:text-neutral-400">Tap a card for details · Drag to pan · Pinch to zoom</p>
    <nav data-canvas-ui aria-label="Canvas navigation" className="absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 flex items-center justify-center gap-2 px-3">
      <button type="button" aria-label="Zoom out" onClick={() => setViewport(vp => zoomAroundCenter(vp, vp.zoom / 1.2, area()))} className={BUTTON}><Minus className="h-4 w-4" /></button>
      <span className="min-w-12 text-center text-xs tabular-nums">{Math.round(viewport.zoom * 100)}%</span>
      <button type="button" aria-label="Zoom in" onClick={() => setViewport(vp => zoomAroundCenter(vp, vp.zoom * 1.2, area()))} className={BUTTON}><Plus className="h-4 w-4" /></button>
      <button type="button" aria-label="Fit canvas" onClick={fit} className={BUTTON}><Maximize2 className="h-4 w-4" /></button>
    </nav>
    {selected && <dialog ref={details} aria-labelledby="shared-node-title" onCancel={() => setSelectedId(null)} onClose={() => setSelectedId(null)} onClick={event => { if (event.target === event.currentTarget) setSelectedId(null); }} className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-neutral-200 bg-white p-5 text-neutral-900 shadow-2xl backdrop:bg-neutral-950/50 dark:border-[#283548] dark:bg-[#161d27] dark:text-white">
      <div className="flex items-start justify-between gap-3"><h2 id="shared-node-title" className="break-words text-lg font-semibold">{selected.title}</h2><button autoFocus type="button" aria-label="Close details" onClick={() => setSelectedId(null)} className={`${BUTTON} shrink-0`}><X className="h-4 w-4" /></button></div>
      <p className="mt-3 text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400">{selected.status.replaceAll("_", " ")}</p>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{selected.description}</p>
      {selected.annotation_metadata && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{selected.annotation_metadata.content}</p>}
      {selected.aws_metadata && <div className="mt-4 space-y-2"><p className="text-xs font-semibold">{selected.aws_metadata.serviceId} · {selected.aws_metadata.region || "No region specified"}</p><dl className="space-y-2 text-sm">{Object.entries(selected.aws_metadata.config || {}).map(([key, value]) => <div key={key} className="rounded-lg bg-neutral-50 p-3 dark:bg-[#10151f]"><dt className="text-xs text-neutral-500 dark:text-neutral-400">{key}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd></div>)}</dl></div>}
      {!!selected.checkpoints.length && <ul aria-label="Checkpoints" className="mt-4 space-y-3">{selected.checkpoints.map(cp => <li key={cp.id} className="flex items-start gap-2 text-sm">{cp.is_completed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />}<span className="break-words">{cp.title}<span className="sr-only">{cp.is_completed ? " (complete)" : " (incomplete)"}</span></span></li>)}</ul>}
      <div className="mt-5 space-y-2">{nodes.filter(node => selected.group_metadata?.childNodeIds.includes(node.id) || edges.some(edge => (edge.source_node_id === selected.id && edge.target_node_id === node.id) || (edge.target_node_id === selected.id && edge.source_node_id === node.id))).map(node => <button type="button" key={node.id} onClick={() => setSelectedId(node.id)} className="min-h-11 w-full break-words rounded-xl border border-neutral-200 p-3 text-left text-sm hover:bg-neutral-50 dark:border-[#283548] dark:hover:bg-[#1e2634]">Open {node.title} →</button>)}</div>
    </dialog>}
  </main>;
}
