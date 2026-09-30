"use client";

import React, { useState, useRef, useEffect } from "react";
import { Lock, Plus, Unlock, Pencil } from "lucide-react";
import { CanvasNode, HandlePosition } from "@/lib/canvas/types";
import { getNodeDimensions, getUserColor } from "@/lib/canvas/coordinate-math";
import { AwsIcon, getAWSService, AWS_CATEGORIES } from "./aws-icons";

export interface CanvasServiceNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  isMultiSelected?: boolean;
  isLinking: boolean;
  currentUserId: string;
  onSelect: (node: CanvasNode, isShiftKey?: boolean) => void;
  onDragStart: (node: CanvasNode, e: React.PointerEvent) => void;
  onDragEnd: () => void;
  onStartLink: (node: CanvasNode, handle: HandlePosition, e: React.PointerEvent) => void;
  onRequestClaim: (node: CanvasNode) => void;
  onClaimNode?: (nodeId: string) => void;
  onUpdateTitle?: (nodeId: string, newTitle: string) => void;
}

const HANDLE_STYLES: Record<HandlePosition, string> = {
  top: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
  right: "top-1/2 right-0 translate-x-1/2 -translate-y-1/2",
  bottom: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
  left: "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2",
};
const STATUS_LABELS = { draft: "Planned", in_progress: "In progress", blocked: "Blocked", completed: "Ready" };
const STATUS_COLORS = { draft: "bg-neutral-400", in_progress: "bg-blue-500", blocked: "bg-amber-500", completed: "bg-emerald-500" };

export default function CanvasServiceNode({
  node, isSelected, isMultiSelected = false, isLinking, currentUserId,
  onSelect, onDragStart, onDragEnd, onStartLink, onRequestClaim, onClaimNode, onUpdateTitle,
}: CanvasServiceNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(node.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editingRef = useRef(false);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  const isClaimedByMe = node.claimed_by === currentUserId;
  const isClaimedByOther = Boolean(node.claimed_by && !isClaimedByMe);
  const claimColor = node.claimed_by ? getUserColor(node.claimed_by) : "#a3a3a3";
  const otherClaimName = node.claim_holder?.fullName && node.claim_holder.fullName !== "You" ? node.claim_holder.fullName : "Collaborator";
  const serviceId = node.aws_metadata?.serviceId?.toLowerCase() || "";
  const service = getAWSService(serviceId);
  const metadataCategory = node.aws_metadata?.category === "ai_ml" ? "ml" : node.aws_metadata?.category;
  const category = AWS_CATEGORIES[service?.category || metadataCategory || "compute"] || AWS_CATEGORIES.compute;
  const categoryColor = category?.color || "#FF9900";
  const configEntries = Object.entries(node.aws_metadata?.config || {});
  const dimensions = getNodeDimensions(node);
  const compact = dimensions.height < 190;
  const active = isSelected || isMultiSelected;
  const showControls = isHovered || isFocused || active || isLinking;

  const startEditingTitle = () => {
    if (!onUpdateTitle) return;
    if (isClaimedByOther) { onRequestClaim(node); return; }
    if (!node.claimed_by) onClaimNode?.(node.id);
    onSelect(node);
    setEditedTitle(node.title);
    editingRef.current = true;
    setIsEditingTitle(true);
  };

  const finishEditingTitle = (cancel = false) => {
    if (!editingRef.current) return;
    editingRef.current = false;
    setIsEditingTitle(false);
    const trimmed = editedTitle.trim();
    if (!cancel && !isClaimedByOther && trimmed && trimmed !== node.title) onUpdateTitle?.(node.id, trimmed);
    else setEditedTitle(node.title);
  };

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

  return (
    <div
      data-node-type="aws_service"
      data-node-id={node.id}
      role="group"
      tabIndex={0}
      aria-label={`${node.title}, ${service?.name || "AWS service"}, ${STATUS_LABELS[node.status]}${node.aws_metadata?.region ? `, ${node.aws_metadata.region}` : ""}${isClaimedByOther ? `, claimed by ${otherClaimName}` : ""}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsFocused(false); }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onSelect(node, e.shiftKey); }
        else if (e.key === "F2") { e.preventDefault(); e.stopPropagation(); startEditingTitle(); }
      }}
      style={{ transform: `translate3d(${node.position_x}px, ${node.position_y}px, 0)`, width: `${dimensions.width}px`, height: `${dimensions.height}px`, borderTopColor: categoryColor }}
      className={`group absolute top-0 left-0 flex cursor-move select-none flex-col rounded-xl border border-t-[3px] bg-white/95 p-3 shadow-sm transition-shadow duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500 dark:bg-[#161d27]/95 ${isLinking ? "cursor-pointer border-emerald-400 ring-2 ring-emerald-500/30 hover:ring-emerald-500" : active ? "border-neutral-900 shadow-md ring-2 ring-neutral-900/10 dark:border-emerald-500 dark:ring-emerald-500/20" : isClaimedByOther ? "border-amber-300 dark:border-amber-700" : "border-neutral-200 hover:shadow-md dark:border-[#283548]"}`}
    >
      {(Object.keys(HANDLE_STYLES) as HandlePosition[]).map((handle) => (
        <div key={handle} data-no-drag="true" onPointerDown={(e) => { e.stopPropagation(); if (e.button === 0) onStartLink(node, handle, e); }}
          className={`absolute z-20 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 bg-white shadow-xs transition-all before:absolute before:-inset-2 before:content-[''] dark:border-[#384961] dark:bg-[#1e2634] ${HANDLE_STYLES[handle]} ${showControls ? "cursor-pointer opacity-100 hover:scale-110 hover:border-emerald-600 hover:bg-emerald-600 hover:text-white" : "pointer-events-none scale-75 opacity-0"}`}
          title={`${isLinking ? "Connect to" : "Link from"} ${node.title}: ${handle} port`}>
          <Plus className="h-3.5 w-3.5" />
        </div>
      ))}
      <div className="flex items-start justify-between gap-2">
        <AwsIcon serviceId={serviceId} size={compact ? 32 : 40} className={compact ? "h-8 w-8 shrink-0" : "h-10 w-10 shrink-0"} />
        <span className="mt-1 inline-flex min-w-0 items-center gap-1 text-[9px] font-medium text-neutral-500 dark:text-neutral-400" title={`Architecture status: ${STATUS_LABELS[node.status]}`}><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_COLORS[node.status]}`} /><span className="truncate">{STATUS_LABELS[node.status]}</span></span>
        <button type="button" data-no-drag="true" aria-label={isClaimedByMe ? `You are editing ${node.title}` : isClaimedByOther ? `Request edit access to ${node.title} from ${otherClaimName}` : `Claim ${node.title} to edit`}
          onClick={(e) => { e.stopPropagation(); if (isClaimedByOther) onRequestClaim(node); else if (!node.claimed_by && onClaimNode) onClaimNode(node.id); else onSelect(node); }}
          className={`inline-flex max-w-[100px] items-center gap-1 rounded-full border px-1.5 py-1 text-[9px] font-medium focus-visible:outline-2 focus-visible:outline-emerald-500 ${isClaimedByMe ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" : isClaimedByOther ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400" : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-neutral-100 dark:border-[#283548] dark:bg-[#121721] dark:text-neutral-400"}`}
          title={isClaimedByMe ? "You have the edit lock" : isClaimedByOther ? `Claimed by ${otherClaimName}. Request edit access.` : "Claim edit access"}>
          {isClaimedByMe ? <><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: claimColor }} /><span>You</span></> : isClaimedByOther ? <><Lock className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{otherClaimName.split(" ")[0]}</span></> : <><Unlock className="h-2.5 w-2.5" /><span>Edit</span></>}
        </button>
      </div>
      <div className="mt-2 min-w-0">
        <p className="truncate text-[10px] font-medium text-neutral-500 dark:text-neutral-400" title={service?.name}>{service?.name || serviceId || "AWS service"}</p>
        {isEditingTitle ? <input ref={titleInputRef} data-no-drag="true" aria-label="Resource label" type="text" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} onBlur={() => finishEditingTitle()}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); finishEditingTitle(e.key === "Escape"); } }}
          className="mt-1 w-full rounded border border-emerald-500 bg-white px-1.5 py-0.5 text-sm font-bold text-neutral-900 outline-none dark:bg-[#121721] dark:text-white" /> :
          <div className="mt-1 flex items-start gap-1">
            <h3 onDoubleClick={(e) => { e.stopPropagation(); startEditingTitle(); }} className="min-w-0 flex-1 line-clamp-2 break-words text-sm font-bold leading-snug text-neutral-900 dark:text-white" title={node.title}>{node.title}</h3>
            {onUpdateTitle && showControls && <button type="button" data-no-drag="true" aria-label={`Rename ${node.title}`} title="Rename resource (F2)" onClick={(e) => { e.stopPropagation(); startEditingTitle(); }} className="shrink-0 rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-emerald-600 dark:hover:bg-[#283548]"><Pencil className="h-3 w-3" /></button>}
          </div>}
      </div>
      <div className="mt-auto min-w-0 pt-2">
        <div className="flex min-w-0 flex-wrap gap-1">
          <span className="max-w-full truncate rounded px-1.5 py-0.5 text-[9px] font-semibold text-neutral-700 dark:text-neutral-200" style={{ backgroundColor: `${categoryColor}20` }} title={category?.label}>{category?.label || "AWS"}</span>
          {node.aws_metadata?.region && <span className="max-w-full truncate rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[9px] text-neutral-600 dark:border-[#283548] dark:bg-[#1e2634] dark:text-neutral-300" title={`Region: ${node.aws_metadata.region}`}>{node.aws_metadata.region}</span>}
        </div>
        {!compact && configEntries.length > 0 && <div className="mt-2 space-y-1 border-t border-neutral-100 pt-1.5 dark:border-[#283548]">
          {configEntries.slice(0, 2).map(([key, value]) => <div key={key} className="flex min-w-0 justify-between gap-2 text-[9px]" title={`${key}: ${value}`}><span className="max-w-[50%] truncate text-neutral-500 dark:text-neutral-400">{key}</span><span className="min-w-0 truncate font-mono text-neutral-700 dark:text-neutral-200">{value}</span></div>)}
          {configEntries.length > 2 && <p className="text-[9px] text-neutral-400">+{configEntries.length - 2} more in details</p>}
        </div>}
      </div>
    </div>
  );
}
