"use client";

import React, { useState } from "react";
import { CanvasEdge, CanvasNode, HandlePosition } from "@/lib/canvas/types";
import {
  calculateBezierPath,
  getBezierPoint,
  getNodeHandlePosition,
  isNodeFullyComplete,
} from "@/lib/canvas/coordinate-math";
import { X } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

interface CanvasEdgeLayerProps {
  edges: CanvasEdge[];
  nodes: CanvasNode[];
  draftEdge: {
    sourceNode: CanvasNode;
    sourceHandle: HandlePosition;
    currentPos: { x: number; y: number };
  } | null;
  onDeleteEdge: (edgeId: string) => void;
  currentUserId?: string;
  isOwner?: boolean;
  isCycleDetected?: boolean;
  snappedHandle?: { node: CanvasNode; handle: HandlePosition } | null;
}

export default function CanvasEdgeLayer({
  edges,
  nodes,
  draftEdge,
  onDeleteEdge,
  currentUserId,
  isOwner,
  isCycleDetected = false,
  snappedHandle = null,
}: CanvasEdgeLayerProps) {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const padding = 200;

  const nodeMap = new Map<string, CanvasNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  const minX = Math.min(...nodes.map((node) => node.position_x), 0) - padding;
  const minY = Math.min(...nodes.map((node) => node.position_y), 0) - padding;
  const maxX = Math.max(...nodes.map((node) => node.position_x + (node.width || 280)), 1) + padding;
  const maxY = Math.max(...nodes.map((node) => node.position_y + (node.height || 170)), 1) + padding;
  const width = maxX - minX;
  const height = maxY - minY;

  return (
    <svg
      aria-label="Milestone dependency wires"
      className="pointer-events-none absolute overflow-visible"
      width={width}
      height={height}
      viewBox={`${minX} ${minY} ${width} ${height}`}
      style={{
        position: "absolute",
        left: `${minX}px`,
        top: `${minY}px`,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <defs>
        {/* Default Gray Arrowhead */}
        <marker
          id="arrow-default"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 8 5 L 0 9 z" fill={isDark ? "#64748b" : "#9ca3af"} />
        </marker>

        {/* Emerald Neon Completed Arrowhead */}
        <marker
          id="arrow-neon"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 8 5 L 0 9 z" fill={isDark ? "#34d399" : "#10b981"} />
        </marker>
        
        {/* Data Flow Arrowhead */}
        <marker id="arrow-data-flow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill={isDark ? "#60a5fa" : "#3B48CC"} />
        </marker>
        {/* Network Arrowhead */}
        <marker id="arrow-network" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill={isDark ? "#34d399" : "#3F8624"} />
        </marker>
        {/* Event Arrowhead */}
        <marker id="arrow-event" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill={isDark ? "#fbbf24" : "#FF9900"} />
        </marker>
        {/* Interlocking Bridge Arrowhead */}
        <marker id="arrow-interlock" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill={isDark ? "#c084fc" : "#8b5cf6"} />
        </marker>
      </defs>

      {/* Render Established Edges */}
      {edges.map((edge) => {
        const sourceNode = nodeMap.get(edge.source_node_id);
        const targetNode = nodeMap.get(edge.target_node_id);
        if (!sourceNode || !targetNode) return null;

        const p1 = getNodeHandlePosition(sourceNode, edge.source_handle);
        const p2 = getNodeHandlePosition(targetNode, edge.target_handle);
        const pathData = calculateBezierPath(
          p1.x,
          p1.y,
          p2.x,
          p2.y,
          edge.source_handle,
          edge.target_handle
        );

        const isNeonActive = isNodeFullyComplete(sourceNode);
        const isHovered = hoveredEdgeId === edge.id;
        const canDelete =
          Boolean(isOwner) ||
          (Boolean(currentUserId) &&
            (sourceNode.claimed_by === currentUserId ||
              targetNode.claimed_by === currentUserId));
        
        // Exact geometric midpoint located on the actual cubic bezier curve path
        const center = getBezierPoint(
          0.5,
          p1.x,
          p1.y,
          p2.x,
          p2.y,
          edge.source_handle,
          edge.target_handle
        );

        const edgeType = edge.edge_type || "dependency";
        const isInterlockingBridge =
          (sourceNode.node_type === "milestone" && (targetNode.node_type === "aws_service" || targetNode.node_type === "group")) ||
          Boolean(edge.label && (edge.label.includes("Provisions") || edge.label.includes("Configures") || edge.label.includes("Deploys") || edge.label.includes("Instruments") || edge.label.includes("Runs")));
        
        let strokeColor = isDark ? "#64748b" : "#9ca3af";
        let strokeDasharray: string | undefined;
        let animationClass = "";
        let markerId = "url(#arrow-default)";

        if (isInterlockingBridge) {
          strokeColor = isDark ? "#c084fc" : "#8b5cf6"; // vibrant luminous violet/purple
          strokeDasharray = "5 3";
          markerId = "url(#arrow-interlock)";
        } else if (edgeType === "dependency") {
          if (isNeonActive) {
            strokeColor = isDark ? "#34d399" : "#10b981";
            strokeDasharray = "6 4";
            animationClass = "animate-[dash-flow_1.5s_linear_infinite]";
            markerId = "url(#arrow-neon)";
          }
        } else if (edgeType === "data_flow") {
          strokeColor = isDark ? "#60a5fa" : "#3B48CC"; // bright electric blue in dark mode
          strokeDasharray = "8 6";
          markerId = "url(#arrow-data-flow)";
          if (isNeonActive || sourceNode.status === "completed") {
            animationClass = "animate-[dash-flow_1.2s_linear_infinite]";
          }
        } else if (edgeType === "network") {
          strokeColor = isDark ? "#34d399" : "#3F8624"; // bright emerald green in dark mode
          strokeDasharray = "4 4";
          markerId = "url(#arrow-network)";
          if (isNeonActive || sourceNode.status === "completed") {
            animationClass = "animate-[dash-flow_1s_linear_infinite]";
          }
        } else if (edgeType === "event") {
          strokeColor = isDark ? "#fbbf24" : "#FF9900"; // luminous amber/yellow in dark mode
          strokeDasharray = "8 4 2 4";
          markerId = "url(#arrow-event)";
        }

        return (
          <g
            key={edge.id}
            className="pointer-events-auto cursor-pointer group"
            onMouseEnter={() => setHoveredEdgeId(edge.id)}
            onMouseLeave={() => setHoveredEdgeId(null)}
          >
            {/* Transparent wider hit area (32px) for easy hover & smooth cursor tracking */}
            <path
              d={pathData}
              fill="none"
              stroke="transparent"
              strokeWidth="32"
              strokeLinecap="round"
            />

            {/* Glowing Backdrop Outline on Hover */}
            {isHovered && (
              <path
                d={pathData}
                fill="none"
                stroke={isInterlockingBridge ? (isDark ? "#c084fc" : "#8b5cf6") : isNeonActive ? "#10b981" : isDark ? "#94a3b8" : "#6b7280"}
                strokeWidth="4"
                strokeOpacity="0.45"
                strokeLinecap="round"
                className="filter drop-shadow-[0_0_6px_rgba(139,92,246,0.5)]"
              />
            )}

            {/* Main Visual Bezier Wire */}
            <path
              d={pathData}
              fill="none"
              stroke={isHovered && canDelete ? "#ef4444" : strokeColor}
              strokeWidth={isHovered ? 2.5 : isInterlockingBridge ? 2 : 1.75}
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              className={`transition-colors duration-150 ${animationClass}`}
              markerEnd={markerId}
            />

            {/* Edge Label Badge */}
            {edge.label && (
              <foreignObject
                x={center.x - 70}
                y={center.y - 12}
                width="140"
                height="24"
                className="overflow-visible pointer-events-none"
              >
                <div className="flex w-full items-center justify-center">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold shadow-xs border ${
                      isInterlockingBridge
                        ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800"
                        : edgeType === "data_flow"
                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800"
                        : edgeType === "network"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800"
                        : edgeType === "event"
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800"
                        : "bg-white/95 text-neutral-600 border-neutral-200 dark:bg-[#161d27]/95 dark:text-neutral-300 dark:border-[#283548]"
                    }`}
                  >
                    {edge.label}
                  </span>
                </div>
              </foreignObject>
            )}

            {/* Delete link button centered directly on the bezier curve - only if user owns a connected node or is owner */}
            {isHovered && canDelete && (
              <foreignObject
                x={center.x - 13}
                y={center.y - 13}
                width="26"
                height="26"
                className="overflow-visible pointer-events-auto"
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteEdge(edge.id);
                  }}
                  title="Remove dependency wire"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md ring-2 ring-white hover:bg-red-700 transition-all hover:scale-115 cursor-pointer active:scale-95"
                >
                  <X className="h-3.5 w-3.5 stroke-[2.5]" />
                </button>
              </foreignObject>
            )}
          </g>
        );
      })}

      {/* Render Draft Connecting Line */}
      {draftEdge && (
        <g>
          {(() => {
            const p1 = getNodeHandlePosition(
              draftEdge.sourceNode,
              draftEdge.sourceHandle
            );
            const p2 = draftEdge.currentPos;
            const targetHandle = snappedHandle?.handle || "left";
            const pathData = calculateBezierPath(
              p1.x,
              p1.y,
              p2.x,
              p2.y,
              draftEdge.sourceHandle,
              targetHandle
            );

            const strokeColor = isCycleDetected
              ? "#ef4444"
              : snappedHandle
              ? "#10b981"
              : "#3b82f6";

            return (
              <>
                <path
                  d={pathData}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  className="animate-[dash-flow_1s_linear_infinite]"
                />
                {snappedHandle && (
                  <circle
                    cx={p2.x}
                    cy={p2.y}
                    r="8"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2"
                    className="animate-ping opacity-75"
                  />
                )}
              </>
            );
          })()}
        </g>
      )}

      {/* SVG Animation Keyframes */}
      <style jsx>{`
        @keyframes dash-flow {
          from {
            stroke-dashoffset: 20;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </svg>
  );
}
