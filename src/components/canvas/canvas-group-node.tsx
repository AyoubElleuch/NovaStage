"use client";

import React, { useRef, useState } from "react";
import { GripVertical, Lock, Plus } from "lucide-react";
import { CanvasNode, HandlePosition } from "@/lib/canvas/types";
import { getNodeDimensions } from "@/lib/canvas/coordinate-math";

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
  vpc: { border: "border-blue-400 dark:border-blue-600", bg: "bg-blue-50/20 dark:bg-blue-950/20", text: "text-blue-700 dark:text-blue-300", labelBg: "bg-blue-100 dark:bg-blue-950" },
  subnet: { border: "border-emerald-400 dark:border-emerald-600", bg: "bg-emerald-50/20 dark:bg-emerald-950/20", text: "text-emerald-700 dark:text-emerald-300", labelBg: "bg-emerald-100 dark:bg-emerald-950" },
  region: { border: "border-purple-400 dark:border-purple-600", bg: "bg-purple-50/20 dark:bg-purple-950/20", text: "text-purple-700 dark:text-purple-300", labelBg: "bg-purple-100 dark:bg-purple-950" },
  availability_zone: { border: "border-amber-400 dark:border-amber-600", bg: "bg-amber-50/20 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-300", labelBg: "bg-amber-100 dark:bg-amber-950" },
  custom: { border: "border-neutral-400 dark:border-neutral-600", bg: "bg-neutral-50/20 dark:bg-neutral-950/20", text: "text-neutral-700 dark:text-neutral-300", labelBg: "bg-neutral-100 dark:bg-neutral-900" },
};
const STYLE_LABELS: Record<string, string> = { vpc: "VPC", subnet: "Subnet", region: "Region", availability_zone: "Availability zone", custom: "Group" };
const HANDLE_STYLES: Record<HandlePosition, string> = {
  top: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
  right: "top-1/2 right-0 translate-x-1/2 -translate-y-1/2",
  bottom: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
  left: "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2",
};
type ResizeHandle = "se" | "e" | "s";
type ResizeState = { handle: ResizeHandle; startX: number; startY: number; startW: number; startH: number };

export default function CanvasGroupNode({ node, isSelected, isMultiSelected = false, isLinking, currentUserId, zoom = 1, onSelect, onDragStart, onDragEnd, onStartLink, onRequestClaim, onClaimNode, onResize }: CanvasGroupNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [currentDimensions, setCurrentDimensions] = useState<{ width: number; height: number } | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const dimensionsRef = useRef<{ width: number; height: number } | null>(null);
  const styleType = node.group_metadata?.style || "vpc";
  const colors = STYLE_COLORS[styleType] || STYLE_COLORS.custom;
  const label = node.group_metadata?.label || node.title;
  const locked = Boolean(node.claimed_by && node.claimed_by !== currentUserId);
  const dimensions = getNodeDimensions(node);
  const effectiveWidth = currentDimensions?.width ?? dimensions.width;
  const effectiveHeight = currentDimensions?.height ?? dimensions.height;
  const showControls = isSelected || isMultiSelected || isHovered || isFocused || resizing;

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]") || e.button !== 0) return;
    e.stopPropagation();
    if (isLinking) { onStartLink(node, "left", e); return; }
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelect(node, e.shiftKey);
    onDragStart(node, e);
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    onDragEnd();
  };
  const prepareResize = () => {
    if (locked) { onRequestClaim(node); return false; }
    if (!onResize || isLinking) return false;
    if (!node.claimed_by) onClaimNode?.(node.id);
    onSelect(node);
    return true;
  };
  const handleResizeStart = (handle: ResizeHandle, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.button !== 0 || !prepareResize()) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = { handle, startX: e.clientX, startY: e.clientY, startW: dimensions.width, startH: dimensions.height };
    dimensionsRef.current = dimensions;
    setCurrentDimensions(dimensionsRef.current);
    setResizing(true);
  };
  const handleResizeMove = (e: React.PointerEvent) => {
    const resize = resizeRef.current;
    if (!resize) return;
    e.stopPropagation();
    const scale = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
    dimensionsRef.current = {
      width: resize.handle === "s" ? resize.startW : Math.max(220, Math.round(resize.startW + (e.clientX - resize.startX) / scale)),
      height: resize.handle === "e" ? resize.startH : Math.max(160, Math.round(resize.startH + (e.clientY - resize.startY) / scale)),
    };
    setCurrentDimensions(dimensionsRef.current);
  };
  const handleResizeEnd = (e: React.PointerEvent, cancel = false) => {
    const resize = resizeRef.current;
    if (!resize) return;
    e.stopPropagation();
    const dimensions = dimensionsRef.current;
    resizeRef.current = null;
    dimensionsRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setResizing(false);
    setCurrentDimensions(null);
    if (!cancel && !locked && dimensions && (dimensions.width !== resize.startW || dimensions.height !== resize.startH)) onResize?.(node.id, dimensions.width, dimensions.height);
  };
  const handleKeyboardResize = (handle: ResizeHandle, e: React.KeyboardEvent) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    if (!prepareResize()) return;
    const step = e.shiftKey ? 50 : 10;
    const { width, height } = dimensions;
    const nextWidth = handle !== "s" && (e.key === "ArrowLeft" || e.key === "ArrowRight") ? Math.max(220, width + (e.key === "ArrowRight" ? step : -step)) : width;
    const nextHeight = handle !== "e" && (e.key === "ArrowUp" || e.key === "ArrowDown") ? Math.max(160, height + (e.key === "ArrowDown" ? step : -step)) : height;
    if (nextWidth !== width || nextHeight !== height) onResize?.(node.id, nextWidth, nextHeight);
  };

  return (
    <div data-node-type="group" data-node-id={node.id} role="group" tabIndex={0} aria-label={`${STYLE_LABELS[styleType]}: ${label}. Drag the header to move. ${effectiveWidth} by ${effectiveHeight} pixels.`}
      onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsFocused(false); }}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.stopPropagation(); onSelect(node, e.shiftKey); } }}
      style={{ transform: `translate3d(${node.position_x}px, ${node.position_y}px, 0)`, width: `${effectiveWidth}px`, height: `${effectiveHeight}px` }}
      className={`pointer-events-none absolute top-0 left-0 select-none rounded-xl border-2 border-dashed transition-shadow duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500 ${colors.border} ${colors.bg} ${isLinking ? "ring-2 ring-emerald-500/40" : isSelected || isMultiSelected ? "shadow-md ring-2 ring-neutral-900/20 dark:ring-emerald-500/30" : ""}`}>
      {(Object.keys(HANDLE_STYLES) as HandlePosition[]).map((handle) => <div key={handle} data-no-drag="true" onPointerDown={(e) => { e.stopPropagation(); if (e.button === 0) onStartLink(node, handle, e); }}
        className={`absolute z-20 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 bg-white shadow-xs transition-all before:absolute before:-inset-2 before:content-[''] dark:border-[#384961] dark:bg-[#1e2634] ${HANDLE_STYLES[handle]} ${showControls || isLinking ? "pointer-events-auto cursor-pointer opacity-100 hover:scale-110 hover:border-emerald-600 hover:bg-emerald-600 hover:text-white" : "pointer-events-none scale-75 opacity-0"}`}
        title={`${isLinking ? "Connect to" : "Link from"} ${label}: ${handle} port`}><Plus className="h-3.5 w-3.5" /></div>)}
      <div className={`pointer-events-auto absolute left-4 top-0 flex max-w-[calc(100%-32px)] -translate-y-1/2 cursor-move items-center gap-2 rounded-lg border border-inherit px-2.5 py-1.5 shadow-xs ${colors.labelBg}`} title="Drag this header to move the group and its resources">
        <GripVertical className={`h-3.5 w-3.5 shrink-0 ${colors.text}`} aria-hidden="true" />
        <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider ${colors.text}`}>{STYLE_LABELS[styleType]}</span>
        <span title={label} className={`min-w-0 truncate text-xs font-semibold ${colors.text}`}>{label}</span>
        {locked && <button type="button" data-no-drag="true" aria-label={`Request edit access to ${label}`} onClick={(e) => { e.stopPropagation(); onRequestClaim(node); }} className="shrink-0 rounded p-0.5 text-amber-600 hover:bg-amber-200/50"><Lock className="h-3 w-3" /></button>}
      </div>
      {showControls && onResize && !locked && !isLinking && <>
        {([
          ["se", "Resize group", "-bottom-2 -right-2 h-5 w-5 cursor-se-resize rounded-md"],
          ["e", "Resize group width", "bottom-8 -right-1.5 h-8 w-3 cursor-e-resize rounded-full"],
          ["s", "Resize group height", "-bottom-1.5 right-8 h-3 w-8 cursor-s-resize rounded-full"],
        ] as const).map(([handle, name, styles]) => <button key={handle} type="button" data-no-drag="true" aria-label={name}
          onPointerDown={(e) => handleResizeStart(handle, e)} onPointerMove={handleResizeMove} onPointerUp={(e) => handleResizeEnd(e)} onPointerCancel={(e) => handleResizeEnd(e, true)} onLostPointerCapture={(e) => handleResizeEnd(e, true)} onKeyDown={(e) => handleKeyboardResize(handle, e)}
          className={`pointer-events-auto absolute z-30 border-2 border-blue-500 bg-white shadow-sm hover:border-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-blue-400 dark:bg-[#161d27] ${styles}`}
          title={`${name}. Drag or use arrow keys; Shift changes by 50px.`} />)}
        {resizing && <div role="status" className="absolute -bottom-9 right-0 z-40 rounded-md bg-neutral-900/90 px-2 py-1 font-mono text-[11px] text-white shadow-lg">{effectiveWidth} × {effectiveHeight}px</div>}
      </>}
    </div>
  );
}
