"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { CanvasNode, HandlePosition } from "@/lib/canvas/types";

export interface CanvasGroupNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  isMultiSelected?: boolean;
  isLinking: boolean;
  currentUserId: string;
  zoom?: number;
  onSelect: (node: CanvasNode, isShiftKey?: boolean) => void;
  onDragStart: (node: CanvasNode, e: React.PointerEvent) => void;
  onDragEnd: () => void;
  onStartLink: (node: CanvasNode, handle: HandlePosition, e: React.PointerEvent) => void;
  onRequestClaim: (node: CanvasNode) => void;
  onClaimNode?: (nodeId: string) => void;
  onUpdateTitle?: (nodeId: string, newTitle: string) => void;
  onResize?: (nodeId: string, width: number, height: number) => void;
}

const STYLE_COLORS: Record<string, { border: string; bg: string; text: string; labelBg: string }> = {
  vpc: {
    border: "border-blue-400 dark:border-blue-600",
    bg: "bg-blue-50/20 dark:bg-blue-950/20",
    text: "text-blue-600 dark:text-blue-400",
    labelBg: "bg-blue-100 dark:bg-blue-900/50",
  },
  subnet: {
    border: "border-emerald-400 dark:border-emerald-600",
    bg: "bg-emerald-50/20 dark:bg-emerald-950/20",
    text: "text-emerald-600 dark:text-emerald-400",
    labelBg: "bg-emerald-100 dark:bg-emerald-900/50",
  },
  region: {
    border: "border-purple-400 dark:border-purple-600",
    bg: "bg-purple-50/20 dark:bg-purple-950/20",
    text: "text-purple-600 dark:text-purple-400",
    labelBg: "bg-purple-100 dark:bg-purple-900/50",
  },
  availability_zone: {
    border: "border-amber-400 dark:border-amber-600",
    bg: "bg-amber-50/20 dark:bg-amber-950/20",
    text: "text-amber-600 dark:text-amber-400",
    labelBg: "bg-amber-100 dark:bg-amber-900/50",
  },
  custom: {
    border: "border-neutral-400 dark:border-neutral-600",
    bg: "bg-neutral-50/20 dark:bg-neutral-950/20",
    text: "text-neutral-600 dark:text-neutral-400",
    labelBg: "bg-neutral-100 dark:bg-neutral-900/50",
  },
};

export default function CanvasGroupNode({
  node,
  isSelected,
  isMultiSelected = false,
  isLinking,
  zoom = 1,
  onSelect,
  onDragStart,
  onDragEnd,
  onStartLink,
  onResize,
}: CanvasGroupNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [resizing, setResizing] = useState<{
    handle: "se" | "e" | "s";
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const [currentDimensions, setCurrentDimensions] = useState<{ width: number; height: number } | null>(null);

  const styleType = node.group_metadata?.style || "vpc";
  const colors = STYLE_COLORS[styleType] || STYLE_COLORS.custom;

  const handles: HandlePosition[] = ["top", "right", "bottom", "left"];

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) {
      return;
    }
    e.stopPropagation();

    // If linking wire is active, clicking anywhere on this group completes connection!
    if (isLinking) {
      onStartLink(node, "left", e);
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    onSelect(node, e.shiftKey);
    onDragStart(node, e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    onDragEnd();
  };

  const handleResizeStart = (handle: "se" | "e" | "s", e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const initialW = node.width || 400;
    const initialH = node.height || 300;

    setResizing({
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startW: initialW,
      startH: initialH,
    });
    setCurrentDimensions({ width: initialW, height: initialH });
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!resizing) return;
    e.stopPropagation();

    const currentZoom = zoom && zoom > 0 ? zoom : 1;
    const dx = (e.clientX - resizing.startX) / currentZoom;
    const dy = (e.clientY - resizing.startY) / currentZoom;

    let newW = resizing.startW;
    let newH = resizing.startH;

    if (resizing.handle === "se" || resizing.handle === "e") {
      newW = Math.max(220, Math.round(resizing.startW + dx));
    }
    if (resizing.handle === "se" || resizing.handle === "s") {
      newH = Math.max(160, Math.round(resizing.startH + dy));
    }

    setCurrentDimensions({ width: newW, height: newH });
  };

  const handleResizeEnd = (e: React.PointerEvent) => {
    if (!resizing) return;
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const finalW = currentDimensions?.width || node.width || 400;
    const finalH = currentDimensions?.height || node.height || 300;

    setResizing(null);
    setCurrentDimensions(null);

    if (finalW !== node.width || finalH !== node.height) {
      onResize?.(node.id, finalW, finalH);
    }
  };

  const getHandlePositionStyles = (handle: HandlePosition) => {
    switch (handle) {
      case "top":
        return "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2";
      case "right":
        return "top-1/2 right-0 translate-x-1/2 -translate-y-1/2";
      case "bottom":
        return "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2";
      case "left":
        return "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2";
    }
  };

  const effectiveWidth = currentDimensions?.width ?? node.width ?? 400;
  const effectiveHeight = currentDimensions?.height ?? node.height ?? 300;
  const showControls = isSelected || isHovered || Boolean(resizing);

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: `translate3d(${node.position_x}px, ${node.position_y}px, 0)`,
        width: `${effectiveWidth}px`,
        height: `${effectiveHeight}px`,
      }}
      className={`absolute top-0 left-0 cursor-move rounded-xl border-2 border-dashed transition-all duration-150 select-none ${
        colors.border
      } ${colors.bg} ${
        isLinking
          ? "cursor-pointer ring-2 ring-emerald-500/40 hover:ring-emerald-500 hover:shadow-lg"
          : isSelected || isMultiSelected
          ? "ring-2 ring-neutral-900/20 shadow-md dark:ring-emerald-500/30"
          : "hover:shadow-md"
      }`}
    >
      {handles.map((handle) => {
        const isPortVisible = isHovered || isLinking || isSelected;
        return (
          <div
            key={handle}
            data-no-drag="true"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartLink(node, handle, e);
            }}
            className={`absolute z-20 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 bg-white shadow-xs transition-all duration-150 before:absolute before:-inset-3 before:content-[''] dark:border-[#283548] dark:bg-[#1e2634] ${getHandlePositionStyles(
              handle
            )} ${
              isPortVisible
                ? "opacity-100 scale-100 cursor-pointer hover:bg-neutral-900 hover:text-white hover:scale-125 hover:border-neutral-900 dark:hover:bg-emerald-600 dark:hover:border-emerald-600"
                : "opacity-0 scale-75 pointer-events-none"
            }`}
            title={isLinking ? `Connect to ${handle} port` : `Link from ${handle} port`}
          >
            <Plus className="h-3.5 w-3.5 text-neutral-600 group-hover:text-white dark:text-neutral-300" />
          </div>
        );
      })}

      {/* Group Title Badge */}
      <div className={`absolute top-0 left-0 -translate-y-1/2 ml-4 max-w-[calc(100%-32px)] flex items-center gap-2 px-2 py-0.5 rounded-md border border-inherit ${colors.labelBg}`}>
        <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
          {styleType.replace("_", " ")}
        </span>
        <span title={node.group_metadata?.label || node.title} className={`min-w-0 truncate text-sm font-semibold ${colors.text}`}>
          {node.group_metadata?.label || node.title}
        </span>
      </div>

      {/* Interactive Resize Handles */}
      {showControls && (
        <>
          {/* Bottom-Right Corner Handle */}
          <div
            data-no-drag="true"
            onPointerDown={(e) => handleResizeStart("se", e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            className="absolute -bottom-1.5 -right-1.5 z-30 h-4 w-4 rounded-sm border-2 border-blue-500 bg-white shadow-md cursor-se-resize transition-transform hover:scale-125 dark:border-blue-400 dark:bg-neutral-900"
            title="Drag to resize container"
          />

          {/* Right-Edge Handle */}
          <div
            data-no-drag="true"
            onPointerDown={(e) => handleResizeStart("e", e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            className="absolute top-1/2 -right-1.5 z-30 h-7 w-2 -translate-y-1/2 rounded-full border border-blue-500 bg-white shadow-xs cursor-e-resize transition-transform hover:scale-125 dark:border-blue-400 dark:bg-neutral-900"
            title="Drag to adjust width"
          />

          {/* Bottom-Edge Handle */}
          <div
            data-no-drag="true"
            onPointerDown={(e) => handleResizeStart("s", e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            className="absolute -bottom-1.5 left-1/2 z-30 h-2 w-7 -translate-x-1/2 rounded-full border border-blue-500 bg-white shadow-xs cursor-s-resize transition-transform hover:scale-125 dark:border-blue-400 dark:bg-neutral-900"
            title="Drag to adjust height"
          />

          {/* Dimension Tooltip when actively resizing */}
          {resizing && (
            <div className="absolute -bottom-8 right-0 z-40 rounded-md bg-neutral-900/90 px-2 py-0.5 font-mono text-[11px] font-medium text-white shadow-lg backdrop-blur-xs">
              {effectiveWidth} × {effectiveHeight}px
            </div>
          )}
        </>
      )}
    </div>
  );
}
