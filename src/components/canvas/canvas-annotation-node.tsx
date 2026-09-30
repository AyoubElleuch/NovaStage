"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, Lock, Pencil, StickyNote, X } from "lucide-react";
import { CanvasNode } from "@/lib/canvas/types";
import { getNodeDimensions } from "@/lib/canvas/coordinate-math";

export interface CanvasAnnotationNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  isMultiSelected?: boolean;
  currentUserId?: string;
  onSelect: (node: CanvasNode, isShiftKey?: boolean) => void;
  onDragStart: (node: CanvasNode, e: React.PointerEvent) => void;
  onDragEnd: () => void;
  onRequestClaim?: (node: CanvasNode) => void;
  onClaimNode?: (nodeId: string) => void;
  onUpdateAnnotation?: (nodeId: string, content: string) => void;
}

const ANNOTATION_COLORS: Record<string, string> = {
  yellow: "bg-yellow-100/95 dark:bg-yellow-900/70 border-yellow-200 dark:border-yellow-700/50 text-yellow-900 dark:text-yellow-100",
  blue: "bg-blue-100/95 dark:bg-blue-900/70 border-blue-200 dark:border-blue-700/50 text-blue-900 dark:text-blue-100",
  green: "bg-green-100/95 dark:bg-green-900/70 border-green-200 dark:border-green-700/50 text-green-900 dark:text-green-100",
  pink: "bg-pink-100/95 dark:bg-pink-900/70 border-pink-200 dark:border-pink-700/50 text-pink-900 dark:text-pink-100",
  gray: "bg-neutral-100/95 dark:bg-neutral-800/70 border-neutral-200 dark:border-neutral-700/50 text-neutral-900 dark:text-neutral-100",
};

export default function CanvasAnnotationNode({ node, isSelected, isMultiSelected = false, currentUserId, onSelect, onDragStart, onDragEnd, onRequestClaim, onClaimNode, onUpdateAnnotation }: CanvasAnnotationNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const content = node.annotation_metadata?.content || "";
  const [editedContent, setEditedContent] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editingRef = useRef(false);
  const locked = Boolean(node.claimed_by && currentUserId && node.claimed_by !== currentUserId);
  const colorStyles = ANNOTATION_COLORS[node.annotation_metadata?.color || "yellow"] || ANNOTATION_COLORS.yellow;
  const dimensions = getNodeDimensions(node);

  useEffect(() => {
    if (isEditing) {
      const textarea = textareaRef.current;
      textarea?.focus();
      if (textarea) textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }, [isEditing]);

  const startEditing = () => {
    if (!onUpdateAnnotation) return;
    if (locked) { onRequestClaim?.(node); return; }
    if (!node.claimed_by) onClaimNode?.(node.id);
    onSelect(node);
    setEditedContent(content);
    editingRef.current = true;
    setIsEditing(true);
  };
  const finishEditing = (cancel = false) => {
    if (!editingRef.current) return;
    editingRef.current = false;
    setIsEditing(false);
    if (!cancel && !locked && editedContent !== content) onUpdateAnnotation?.(node.id, editedContent);
    else setEditedContent(content);
  };
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]") || e.button !== 0) return;
    e.stopPropagation();
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
    <div data-node-type="annotation" data-node-id={node.id} role="group" tabIndex={0} aria-label={`Note: ${node.title}. ${content || "Empty note"}`}
      onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) finishEditing(); }}
      onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onSelect(node, e.shiftKey); } else if (e.key === "F2") { e.preventDefault(); e.stopPropagation(); startEditing(); } }}
      style={{ transform: `translate3d(${node.position_x}px, ${node.position_y}px, 0)`, width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
      className={`absolute top-0 left-0 flex cursor-move flex-col rounded-xl border p-3 shadow-sm backdrop-blur-md transition-shadow duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500 ${colorStyles} ${isSelected || isMultiSelected ? "shadow-md ring-2 ring-neutral-900/20 dark:ring-emerald-500/30" : "hover:shadow-md"}`}>
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2 border-b border-current/10 pb-1.5">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-semibold opacity-70"><StickyNote className="h-3 w-3 shrink-0" /><span className="truncate" title={node.title}>{node.title || "Note"}</span></span>
        {isEditing ? <div data-no-drag="true" className="flex items-center gap-1">
          <button type="button" aria-label="Save note" onPointerDown={(e) => e.preventDefault()} onClick={() => finishEditing()} className="rounded p-0.5 hover:bg-black/10"><Check className="h-3.5 w-3.5" /></button>
          <button type="button" aria-label="Cancel note editing" onPointerDown={(e) => e.preventDefault()} onClick={() => finishEditing(true)} className="rounded p-0.5 hover:bg-black/10"><X className="h-3.5 w-3.5" /></button>
        </div> : onUpdateAnnotation && <button type="button" data-no-drag="true" aria-label={locked ? "Request edit access to note" : "Edit note"} title="Edit note (F2)" onClick={(e) => { e.stopPropagation(); startEditing(); }} className="shrink-0 rounded p-0.5 opacity-60 hover:bg-black/10 hover:opacity-100">{locked ? <Lock className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}</button>}
      </div>
      {isEditing ? <textarea ref={textareaRef} data-no-drag="true" data-canvas-scroll="true" aria-label="Note content" value={editedContent} onChange={(e) => setEditedContent(e.target.value)}
        onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") { e.preventDefault(); finishEditing(true); } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey || e.shiftKey)) { e.preventDefault(); finishEditing(); } }}
        className="min-h-0 w-full flex-1 resize-none rounded bg-transparent text-xs font-medium leading-relaxed outline-none focus:ring-1 focus:ring-current/20" placeholder="Type your note here..." /> :
        <div data-canvas-scroll="true" onDoubleClick={(e) => { e.stopPropagation(); startEditing(); }} className="min-h-0 flex-1 overflow-y-auto overscroll-contain whitespace-pre-wrap break-words text-xs font-medium leading-relaxed" title={!content ? "Double-click or press F2 to edit" : undefined}>{content || <span className="italic opacity-60">Double-click to add a note...</span>}</div>}
    </div>
  );
}
