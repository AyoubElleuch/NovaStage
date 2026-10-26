"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AIWorkflowResult } from "@/lib/ai/types";
import { buildGeneratedGraph } from "@/lib/canvas/generated-graph";
import CanvasNodeComponent from "./canvas-node";
import CanvasEdgeLayer from "./canvas-edge-layer";

/** Preview uses the exact geometry and card components that acceptance persists. */
export default function GeneratedDiagramPreview({ workflow }: { workflow: AIWorkflowResult }) {
  const frame = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(280);
  useEffect(() => {
    if (!frame.current) return;
    const observer = new ResizeObserver(entries => setFrameWidth(entries[0].contentRect.width));
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, [workflow]);
  const preview = useMemo(() => {
    try {
      const graph = buildGeneratedGraph(workflow, []);
      const minX = Math.min(...graph.nodes.map(node => node.position_x)) - 24;
      const minY = Math.min(...graph.nodes.map(node => node.position_y - (node.node_type === "group" ? 36 : 0))) - 24;
      const width = Math.max(...graph.nodes.map(node => node.position_x + node.width)) - minX + 24;
      const height = Math.max(...graph.nodes.map(node => node.position_y + node.height)) - minY + 24;
      return { graph, width, height, minX, minY, error: null };
    } catch (error) { return { error: error instanceof Error ? error.message : "Invalid diagram" }; }
  }, [workflow]);
  if (!preview.graph) return <p role="alert" className="text-xs text-amber-700 dark:text-amber-300">{preview.error}</p>;
  const scale = Math.min(Math.max(1, frameWidth) / preview.width, 240 / preview.height);
  const x = (frameWidth - preview.width * scale) / 2 - preview.minX * scale;
  const y = (240 - preview.height * scale) / 2 - preview.minY * scale;
  return <figure aria-label="Generated diagram preview" className="space-y-2">
    <div ref={frame} className="relative h-[240px] overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 dark:border-[#384961] dark:bg-[#10151f]">
      <div aria-hidden="true" inert className="pointer-events-none absolute origin-top-left" style={{ transform: `translate(${x}px, ${y}px) scale(${scale})`, width: preview.width, height: preview.height }}>
        <CanvasEdgeLayer nodes={preview.graph.nodes} edges={preview.graph.edges} draftEdge={null} readOnly onDeleteEdge={() => {}} />
        {preview.graph.nodes.map(node => <CanvasNodeComponent key={node.id} node={node} stepIndex={node.sort_order} readOnly isSelected={false} isLinking={false} currentUserId="preview" onSelect={() => {}} onDragStart={() => {}} onDragEnd={() => {}} onStartLink={() => {}} onToggleCheckpoint={() => {}} onRequestClaim={() => {}} />)}
      </div>
    </div>
    <figcaption className="text-[11px] text-neutral-500 dark:text-neutral-400">{preview.graph.nodes.length} cards · {preview.graph.edges.length} connections · Layout and containment checked. Added alongside existing work.</figcaption>
  </figure>;
}
