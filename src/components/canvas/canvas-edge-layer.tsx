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
}

export default function CanvasEdgeLayer({
  edges,
  nodes,
  draftEdge,
  onDeleteEdge,
  currentUserId,
  isOwner,
}: CanvasEdgeLayerProps) {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const padding = 200;

  const nodeMap = new Map<string, CanvasNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  const minX = Math.min(...nodes.map((node) => node.position_x), 0) - padding;
  const minY = Math.min(...nodes.map((node) => node.position_y), 0) - padding;
  const maxX = Math.max(...nodes.map((node) => node.position_x + node.width), 1) + padding;
  const maxY = Math.max(...nodes.map((node) => node.position_y + node.height), 1) + padding;
  const width = maxX - minX;
  const height = maxY - minY;

  return (
    <svg
      aria-label="Milestone dependency wires"
      className="pointer-events-none absolute overflow-visible"
      width={width}
      height={height}
      viewBox={`${minX} ${minY} ${width} ${height}`}
      style={{ left: minX, top: minY }}
    >
      <defs>
        {/* Default arrowhead marker */}
        <marker
          id="arrow-default"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#a3a3a3" />
        </marker>

        {/* Active Neon Arrowhead */}
        <marker
          id="arrow-neon"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#10b981" />
        </marker>

        {/* Multi-layer Neon Glow Filter */}
        <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur1" />
          <feGaussianBlur stdDeviation="8" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
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

            {/* Neon Glow Underlay (when completed) */}
            {isNeonActive && (
              <path
                d={pathData}
                fill="none"
                stroke="#10b981"
                strokeWidth="4"
                strokeOpacity="0.6"
                filter="url(#neon-glow)"
              />
            )}

            {/* Main Visual Path */}
            <path
              d={pathData}
              fill="none"
              stroke={
                isHovered && canDelete
                  ? "#ef4444"
                  : isNeonActive
                  ? "#10b981"
                  : "#9ca3af"
              }
              strokeWidth={isNeonActive ? "3" : "2.5"}
              strokeDasharray={isNeonActive ? "6 4" : undefined}
              className={isNeonActive ? "animate-[dash-flow_1.5s_linear_infinite]" : ""}
              markerEnd={isNeonActive ? "url(#arrow-neon)" : "url(#arrow-default)"}
            />

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
            const pathData = calculateBezierPath(
              p1.x,
              p1.y,
              p2.x,
              p2.y,
              draftEdge.sourceHandle,
              "left"
            );
            return (
              <path
                d={pathData}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeDasharray="4 4"
                className="animate-[dash-flow_1s_linear_infinite]"
              />
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
