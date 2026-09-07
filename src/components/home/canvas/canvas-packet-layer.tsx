import { useId } from "react";
import type { CanvasEdge, CanvasNode } from "@/lib/canvas/types";
import { calculateBezierPath, getNodeHandlePosition } from "@/lib/canvas/coordinate-math";

export default function CanvasPacketLayer({ nodes, edges, active }: { nodes: CanvasNode[]; edges: CanvasEdge[]; active: boolean }) {
  const prefix = useId();
  if (!active) return null;
  return <svg className="home-packet-layer" width="1" height="1" aria-hidden="true">
    {edges.map((edge, index) => {
      const source = nodes.find((node) => node.id === edge.source_node_id);
      const target = nodes.find((node) => node.id === edge.target_node_id);
      if (!source || !target) return null;
      const from = getNodeHandlePosition(source, edge.source_handle);
      const to = getNodeHandlePosition(target, edge.target_handle);
      const path = calculateBezierPath(from.x, from.y, to.x, to.y, edge.source_handle, edge.target_handle);
      const id = `${prefix}-${edge.id}`;
      return <g key={edge.id}><defs><path id={id} d={path} /></defs><circle className="home-flow-packet" r="3" fill={edge.edge_type === "data_flow" ? "#60a5fa" : "var(--home-accent)"}>
        <animateMotion dur="2.4s" begin={`${index * -0.4}s`} repeatCount="indefinite"><mpath href={`#${id}`} /></animateMotion>
      </circle></g>;
    })}
  </svg>;
}