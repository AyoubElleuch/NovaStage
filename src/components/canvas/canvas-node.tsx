"use client";

import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, Lock, Pencil, Plus, Unlock } from "lucide-react";
import { CanvasNode, HandlePosition } from "@/lib/canvas/types";
import { calculateCompletionPercentage, getNodeDimensions, getUserColor, isNodeFullyComplete } from "@/lib/canvas/coordinate-math";
import CanvasServiceNode from "./canvas-service-node";
import CanvasGroupNode from "./canvas-group-node";
import CanvasAnnotationNode from "./canvas-annotation-node";

export interface CanvasNodeComponentProps {
  node: CanvasNode;
  stepIndex: number;
  isSelected: boolean;
  isMultiSelected?: boolean;
  isLinking: boolean;
  currentUserId: string;
  onSelect: (node: CanvasNode, isShiftKey?: boolean) => void;
  onDragStart: (node: CanvasNode, e: React.PointerEvent) => void;
  onDragEnd: () => void;
  onStartLink: (node: CanvasNode, handle: HandlePosition, e: React.PointerEvent) => void;
  onToggleCheckpoint: (checkpointId: string, nodeId: string, nextCompleted: boolean) => void;
  onRequestClaim: (node: CanvasNode) => void;
  onClaimNode?: (nodeId: string) => void;
  onUpdateTitle?: (nodeId: string, newTitle: string) => void;
  onUpdateAnnotation?: (nodeId: string, content: string) => void;
  zoom?: number;
  onResize?: (nodeId: string, width: number, height: number) => void;
}

export default function CanvasNodeComponent(props: CanvasNodeComponentProps) {
  switch (props.node.node_type || "milestone") {
    case "aws_service": return <CanvasServiceNode {...props} />;
    case "group": return <CanvasGroupNode {...props} />;
    case "annotation": return <CanvasAnnotationNode {...props} />;
    default: return <CanvasMilestoneNode {...props} />;
  }
}

const PORT_POSITION: Record<HandlePosition, string> = {
  top: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
  right: "top-1/2 right-0 translate-x-1/2 -translate-y-1/2",
  bottom: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
  left: "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2",
};

function CanvasMilestoneNode({ node, stepIndex, isSelected, isMultiSelected = false, isLinking, currentUserId,
  onSelect, onDragStart, onDragEnd, onStartLink, onToggleCheckpoint, onRequestClaim, onClaimNode, onUpdateTitle,
}: CanvasNodeComponentProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(node.title);
  const [sourceTitle, setSourceTitle] = useState(node.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleCancelled = useRef(false);
  const titleCommitted = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (sourceTitle !== node.title) {
    setSourceTitle(node.title);
    if (!isEditingTitle) setEditedTitle(node.title);
  }

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  const completionPct = calculateCompletionPercentage(node.checkpoints);
  const dimensions = getNodeDimensions(node);
  const completedCount = node.checkpoints.filter((checkpoint) => checkpoint.is_completed).length;
  const isComplete = isNodeFullyComplete(node);
  const isClaimedByMe = node.claimed_by === currentUserId;
  const isClaimedByOther = Boolean(node.claimed_by && !isClaimedByMe);
  const holderName = node.claim_holder?.fullName && node.claim_holder.fullName !== "You" ? node.claim_holder.fullName : "Collaborator";
  const statusLabel = isComplete ? "Complete" : node.status === "blocked" ? "Blocked" : completionPct > 0 || node.status === "in_progress" ? "In progress" : "Planned";
  const previewCount = (node.height || 170) >= 220 ? 2 : 1;
  const canRename = Boolean(onUpdateTitle) && !isClaimedByOther;

  const handleClaimAction = () => {
    if (isClaimedByOther) onRequestClaim(node);
    else if (!node.claimed_by && onClaimNode) onClaimNode(node.id);
    else onSelect(node);
  };

  const beginRename = () => {
    if (!canRename) return;
    if (!node.claimed_by && onClaimNode) onClaimNode(node.id);
    titleCancelled.current = false;
    titleCommitted.current = false;
    setEditedTitle(node.title);
    setIsEditingTitle(true);
  };

  const commitTitle = () => {
    if (titleCommitted.current) return;
    titleCommitted.current = true;
    setIsEditingTitle(false);
    const trimmed = editedTitle.trim();
    if (!titleCancelled.current && trimmed && trimmed !== node.title && !isClaimedByOther) onUpdateTitle?.(node.id, trimmed);
    else setEditedTitle(node.title);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      onDragEnd();
    }
  };

  return <div
    ref={cardRef}
    role="group"
    tabIndex={0}
    aria-label={`Milestone ${stepIndex + 1}: ${node.title}. ${statusLabel}. ${completedCount} of ${node.checkpoints.length} checkpoints complete.`}
    onPointerDown={(event) => {
      event.stopPropagation();
      if (event.button !== 0 || (event.target as HTMLElement).closest("[data-no-drag]")) return;
      if (isLinking) { onStartLink(node, "left", event); return; }
      event.currentTarget.setPointerCapture(event.pointerId);
      onSelect(node, event.shiftKey);
      onDragStart(node, event);
    }}
    onPointerUp={endDrag}
    onPointerCancel={endDrag}
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
    onKeyDown={(event) => {
      if (event.target !== event.currentTarget) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault(); event.stopPropagation(); onSelect(node, event.shiftKey);
      } else if (event.key === "F2") {
        event.preventDefault(); event.stopPropagation(); beginRename();
      }
    }}
    style={{ transform: `translate3d(${node.position_x}px, ${node.position_y}px, 0)`, width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
    className={`group absolute top-0 left-0 flex cursor-move flex-col rounded-xl border bg-white/95 p-3 shadow-sm backdrop-blur-md select-none dark:bg-[#161d27]/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
      isLinking ? "cursor-pointer ring-2 ring-emerald-500/30 hover:border-emerald-500" : isSelected || isMultiSelected ? "border-neutral-900 ring-2 ring-neutral-900/20 shadow-md dark:border-emerald-500 dark:ring-emerald-500/30" : isComplete ? "border-emerald-300/80 dark:border-emerald-700/60" : node.status === "blocked" ? "border-red-300 dark:border-red-800" : isClaimedByOther ? "border-amber-300/80 dark:border-amber-700/60" : "border-neutral-200/90 hover:border-neutral-400 dark:border-[#283548] dark:hover:border-[#384961]"
    }`}
  >
    {(Object.keys(PORT_POSITION) as HandlePosition[]).map((handle) => <button
      key={handle} type="button" data-no-drag="true"
      aria-label={`${isLinking ? "Connect to" : "Link from"} ${handle} port of ${node.title}`}
      onPointerDown={(event) => { event.stopPropagation(); if (event.button === 0) onStartLink(node, handle, event); }}
      onClick={(event) => {
        event.stopPropagation();
        if (event.detail === 0) {
          const bounds = event.currentTarget.getBoundingClientRect();
          onStartLink(node, handle, Object.assign(event, { clientX: bounds.left + bounds.width / 2, clientY: bounds.top + bounds.height / 2, pointerId: 0, pointerType: "keyboard" }) as unknown as React.PointerEvent);
        }
      }}
      className={`absolute z-20 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 bg-white shadow-xs dark:border-[#384961] dark:bg-[#1e2634] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${PORT_POSITION[handle]} ${isHovered || isLinking || isSelected || isMultiSelected ? "opacity-100 cursor-crosshair hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950" : "opacity-0 pointer-events-none focus-visible:pointer-events-auto"}`}
      title={`${isLinking ? "Connect to" : "Link from"} ${handle} port`}
    ><Plus className="h-3 w-3 text-neutral-500 dark:text-neutral-300" aria-hidden="true" /></button>)}

    <div className="flex shrink-0 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${isComplete ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" : "border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-[#283548] dark:bg-[#1e2634] dark:text-neutral-300"}`}>{isComplete ? "DONE" : `STEP ${String(stepIndex + 1).padStart(2, "0")}`}</span>
        {!isComplete && <span className={`truncate text-[10px] font-medium ${node.status === "blocked" ? "text-red-600 dark:text-red-400" : "text-neutral-500 dark:text-neutral-400"}`}>{statusLabel}</span>}
      </div>
      <button type="button" data-no-drag="true" onClick={(event) => { event.stopPropagation(); handleClaimAction(); }}
        aria-label={isClaimedByMe ? `You are editing ${node.title}` : isClaimedByOther ? `Request edit access from ${holderName}` : `Claim ${node.title} to edit`}
        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${isClaimedByMe ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" : isClaimedByOther ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400" : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-[#283548] dark:text-neutral-400 dark:hover:bg-[#1e2634]"}`}
      >{isClaimedByMe ? <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getUserColor(currentUserId) }} /> : isClaimedByOther ? <Lock className="h-2.5 w-2.5" /> : <Unlock className="h-2.5 w-2.5" />}<span className="max-w-[70px] truncate">{isClaimedByMe ? "You" : isClaimedByOther ? holderName.split(" ")[0] : "Free"}</span></button>
    </div>

    <div className="mt-2 flex min-h-0 shrink-0 items-start gap-1">
      {isEditingTitle ? <input ref={titleInputRef} data-no-drag="true" aria-label="Milestone title" maxLength={200} value={editedTitle}
        onChange={(event) => setEditedTitle(event.target.value)} onBlur={commitTitle}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") { event.preventDefault(); commitTitle(); cardRef.current?.focus(); }
          if (event.key === "Escape") { event.preventDefault(); titleCancelled.current = true; setIsEditingTitle(false); setEditedTitle(node.title); cardRef.current?.focus(); }
        }} className="min-w-0 flex-1 rounded border border-emerald-500 bg-white px-1.5 py-1 text-[13px] font-semibold outline-none dark:bg-[#121721] dark:text-white"
      /> : <h3 onDoubleClick={(event) => { event.stopPropagation(); beginRename(); }} title={node.title} className="min-w-0 flex-1 line-clamp-2 break-words text-[14px] font-semibold leading-[18px] text-neutral-900 dark:text-white">{node.title}</h3>}
      {canRename && !isEditingTitle && <button type="button" data-no-drag="true" onClick={(event) => { event.stopPropagation(); beginRename(); }} aria-label={`Rename ${node.title}`} title="Rename milestone (F2)" className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-[#1e2634] dark:hover:text-white"><Pencil className="h-3 w-3" /></button>}
    </div>

    {node.checkpoints.length > 0 ? <div className="mt-2 shrink-0">
      <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-neutral-500 dark:text-neutral-400"><span>{completedCount} of {node.checkpoints.length} done</span><span className={isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-700 dark:text-neutral-300"}>{completionPct}%</span></div>
      <div role="progressbar" aria-label="Milestone completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionPct} className="h-1 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-[#1e2634]"><div className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${isComplete ? "bg-emerald-500" : "bg-neutral-800 dark:bg-emerald-500"}`} style={{ width: `${completionPct}%` }} /></div>
    </div> : <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">No checkpoints yet · Add steps in Details</p>}

    <div className="mt-2 min-h-0 flex-1 overflow-hidden border-t border-neutral-100 pt-1.5 dark:border-[#283548]">
      {node.checkpoints.slice(0, previewCount).map((checkpoint, index) => <div key={checkpoint.id} data-no-drag="true" className="flex min-w-0 items-center gap-1.5">
        <button type="button" onClick={(event) => { event.stopPropagation(); if (isClaimedByMe) onToggleCheckpoint(checkpoint.id, node.id, !checkpoint.is_completed); else handleClaimAction(); }}
          aria-label={isClaimedByMe ? `Mark "${checkpoint.title}" as ${checkpoint.is_completed ? "incomplete" : "complete"}` : isClaimedByOther ? `Request access to edit "${checkpoint.title}"` : `Claim to edit "${checkpoint.title}"`}
          aria-pressed={checkpoint.is_completed} title={isClaimedByMe ? "Toggle checkpoint" : "Claim to edit checkpoints"}
          className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 hover:bg-neutral-100 dark:hover:bg-[#1e2634]"
        >{checkpoint.is_completed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Circle className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />}</button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onSelect(node); }} title={checkpoint.title} className={`min-w-0 flex-1 truncate text-left text-[11px] focus-visible:outline-none focus-visible:underline ${checkpoint.is_completed ? "text-neutral-400 line-through dark:text-neutral-500" : "text-neutral-700 dark:text-neutral-300"}`}>{checkpoint.title}</button>
        {node.checkpoints.length > previewCount && index === previewCount - 1 && <button type="button" onClick={(event) => { event.stopPropagation(); onSelect(node); }} aria-label={`View all ${node.checkpoints.length} checkpoints`} className="shrink-0 rounded px-1 py-1 text-[10px] font-semibold text-neutral-500 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:text-white">+{node.checkpoints.length - previewCount}</button>}
      </div>)}
      {node.checkpoints.length === 0 && <button type="button" data-no-drag="true" onClick={(event) => { event.stopPropagation(); onSelect(node); }} className="rounded text-[11px] font-semibold text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-neutral-300">Open details →</button>}
    </div>
  </div>;
}
