"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  Lock,
  Plus,
  Sparkles,
  Unlock,
} from "lucide-react";
import { CanvasNode, HandlePosition } from "@/lib/canvas/types";
import {
  calculateCompletionPercentage,
  isNodeFullyComplete,
  getUserColor,
} from "@/lib/canvas/coordinate-math";

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
  zoom?: number;
  onResize?: (nodeId: string, width: number, height: number) => void;
}

export default function CanvasNodeComponent(props: CanvasNodeComponentProps) {
  const type = props.node.node_type || "milestone";
  
  switch (type) {
    case "aws_service":
      return <CanvasServiceNode {...props} />;
    case "group":
      return <CanvasGroupNode {...props} />;
    case "annotation":
      return <CanvasAnnotationNode {...props} />;
    case "milestone":
    default:
      return <CanvasMilestoneNode {...props} />;
  }
}

function CanvasMilestoneNode({
  node,
  stepIndex,
  isSelected,
  isMultiSelected = false,
  isLinking,
  currentUserId,
  onSelect,
  onDragStart,
  onDragEnd,
  onStartLink,
  onToggleCheckpoint,
  onRequestClaim,
  onClaimNode,
  onUpdateTitle,
}: CanvasNodeComponentProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(node.title);
  const [prevNodeTitle, setPrevNodeTitle] = useState(node.title);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  if (prevNodeTitle !== node.title) {
    setPrevNodeTitle(node.title);
    setEditedTitle(node.title);
  }

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  const completionPct = calculateCompletionPercentage(node.checkpoints);
  const isComplete = isNodeFullyComplete(node);
  const isClaimedByMe = node.claimed_by === currentUserId;
  const isClaimedByOther = Boolean(node.claimed_by && !isClaimedByMe);
  const claimColor = node.claimed_by ? getUserColor(node.claimed_by) : "#a3a3a3";
  const otherClaimName =
    node.claim_holder?.fullName && node.claim_holder.fullName !== "You"
      ? node.claim_holder.fullName
      : "Collaborator";
  const otherClaimFirstName = otherClaimName.split(" ")[0];

  // Handles list
  const handles: HandlePosition[] = ["top", "right", "bottom", "left"];

  const handlePointerDown = (e: React.PointerEvent) => {
    // If clicking on an interactive element like checkpoint checkbox or handle or editing title, don't trigger drag
    if ((e.target as HTMLElement).closest("[data-no-drag]")) {
      return;
    }
    e.stopPropagation();
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

  const handleCommitTitle = () => {
    setIsEditingTitle(false);
    const trimmed = editedTitle.trim();
    if (trimmed && trimmed !== node.title && onUpdateTitle) {
      onUpdateTitle(node.id, trimmed);
    } else {
      setEditedTitle(node.title);
    }
  };

  return (
    <div
      ref={cardRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: `translate3d(${node.position_x}px, ${node.position_y}px, 0)`,
        width: `${node.width}px`,
      }}
      className={`group absolute top-0 left-0 cursor-move rounded-xl border bg-white/95 p-4 shadow-sm backdrop-blur-md transition-shadow duration-150 select-none dark:bg-[#161d27]/95 ${
        isSelected || isMultiSelected
          ? "border-neutral-900 ring-2 ring-neutral-900/20 shadow-md dark:border-emerald-500 dark:ring-emerald-500/30"
          : isComplete
          ? "border-emerald-300/80 hover:border-emerald-400 hover:shadow-md dark:border-emerald-700/60 dark:hover:border-emerald-500"
          : isClaimedByOther
          ? "border-amber-300/80 hover:border-amber-400 dark:border-amber-700/60 dark:hover:border-amber-500"
          : "border-neutral-200/90 hover:border-neutral-300 hover:shadow-md dark:border-[#283548] dark:hover:border-[#384961] dark:hover:shadow-[0_8px_25px_rgba(0,0,0,0.4)]"
      }`}
    >
      {/* 4 Connection Ports / Anchor Handles */}
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
            className={`absolute z-20 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-300 bg-white shadow-xs transition-all duration-150 before:absolute before:-inset-2 before:content-[''] dark:border-[#283548] dark:bg-[#1e2634] ${getHandlePositionStyles(
              handle
            )} ${
              isPortVisible
                ? "opacity-100 scale-100 cursor-crosshair hover:bg-neutral-900 hover:text-white hover:scale-115 hover:border-neutral-900 dark:hover:bg-emerald-600 dark:hover:border-emerald-600"
                : "opacity-0 scale-75 pointer-events-none"
            }`}
            title={isLinking ? `Connect to ${handle} port` : `Link from ${handle} port`}
          >
            <Plus className="h-3.5 w-3.5 text-neutral-600 group-hover:text-white dark:text-neutral-300" />
          </div>
        );
      })}

      {/* Header Row: Step Number & Claim Pill */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
              isComplete
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60"
                : "bg-neutral-100 text-neutral-600 border border-neutral-200/60 dark:bg-[#1e2634] dark:text-neutral-300 dark:border-[#283548]"
            }`}
          >
            {isComplete ? "DONE" : `STEP ${String(stepIndex + 1).padStart(2, "0")}`}
          </span>
          {isComplete && (
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
          )}
        </div>

        {/* Claim Status Chip */}
        <div
          data-no-drag="true"
          onClick={(e) => {
            e.stopPropagation();
            if (isClaimedByOther) {
              onRequestClaim(node);
            } else if (!node.claimed_by && onClaimNode) {
              onClaimNode(node.id);
            } else {
              onSelect(node);
            }
          }}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${
            isClaimedByMe
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
              : isClaimedByOther
              ? "bg-amber-50 text-amber-800 border border-amber-200 cursor-pointer hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
              : "bg-neutral-50 text-neutral-600 border border-neutral-200 cursor-pointer hover:bg-neutral-100 hover:border-neutral-300 dark:bg-[#121721] dark:text-neutral-300 dark:border-[#283548] dark:hover:bg-[#1e2634]"
          }`}
          title={
            isClaimedByMe
              ? "You currently have exclusive edit lock on this box"
              : isClaimedByOther
              ? `Claimed by ${otherClaimName}. Click to request edit handoff.`
              : "Unclaimed box. Click to claim edit lock."
          }
        >
          {isClaimedByMe ? (
            <>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: claimColor }}
              />
              <span>You</span>
            </>
          ) : isClaimedByOther ? (
            <>
              <Lock className="h-2.5 w-2.5 text-amber-700 dark:text-amber-400" />
              <span className="max-w-[70px] truncate">
                {otherClaimFirstName || "Locked"}
              </span>
            </>
          ) : (
            <>
              <Unlock className="h-2.5 w-2.5 text-neutral-400" />
              <span className="text-neutral-600 dark:text-neutral-400">Free</span>
            </>
          )}
        </div>
      </div>

      {/* Node Title (Double-click to inline edit when claimed or free) */}
      {isEditingTitle ? (
        <div data-no-drag="true" className="mt-2">
          <input
            ref={titleInputRef}
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleCommitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCommitTitle();
              } else if (e.key === "Escape") {
                setIsEditingTitle(false);
                setEditedTitle(node.title);
              }
            }}
            className="w-full rounded border border-neutral-900 bg-white px-1.5 py-0.5 text-[13px] font-semibold text-neutral-900 outline-none shadow-2xs dark:border-emerald-500 dark:bg-[#121721] dark:text-white"
          />
        </div>
      ) : (
        <h3
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (isClaimedByMe || !node.claimed_by) {
              if (!node.claimed_by && onClaimNode) {
                onClaimNode(node.id);
              }
              setIsEditingTitle(true);
            }
          }}
          className="mt-2.5 text-[13px] font-semibold text-neutral-900 line-clamp-1 leading-snug cursor-text dark:text-white"
          title={`${node.title} (Double-click to rename)`}
        >
          {node.title}
        </h3>
      )}

      {/* Progress Section or Empty State */}
      {node.checkpoints.length > 0 ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 mb-1 dark:text-neutral-400">
            <span>
              {node.checkpoints.filter((c) => c.is_completed).length} of{" "}
              {node.checkpoints.length} done
            </span>
            <span
              className={
                isComplete
                  ? "font-semibold text-emerald-600 dark:text-emerald-400"
                  : "font-semibold text-neutral-700 dark:text-neutral-300"
              }
            >
              {completionPct}%
            </span>
          </div>
          {/* Animated Progress Bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-[#1e2634]">
            <div
              className={`h-full transition-all duration-300 ease-out rounded-full ${
                isComplete
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                  : completionPct > 0
                  ? "bg-neutral-800 dark:bg-emerald-500"
                  : "bg-transparent"
              }`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-3 border-t border-neutral-100/80 dark:border-[#283548] pt-2 flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500">
          <span>0 checkpoints</span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-normal">
            {isClaimedByMe ? "Add steps in drawer" : "Claim to edit"}
          </span>
        </div>
      )}

      {/* Mini Checkpoints List (Preview first 2 items) */}
      {node.checkpoints.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-neutral-100 dark:border-[#283548] pt-2.5">
          {node.checkpoints.slice(0, 2).map((cp) => (
            <div
              key={cp.id}
              data-no-drag="true"
              className="flex items-center gap-2 rounded px-1.5 py-0.5 text-[11px] transition-colors hover:bg-neutral-100/70 dark:hover:bg-[#1e2634]/70"
            >
              {/* Checkbox Toggle Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isClaimedByMe) {
                    onToggleCheckpoint(cp.id, node.id, !cp.is_completed);
                  } else if (isClaimedByOther) {
                    onRequestClaim(node);
                  } else if (onClaimNode) {
                    onClaimNode(node.id);
                  } else {
                    onSelect(node);
                  }
                }}
                aria-label={cp.is_completed ? `Mark "${cp.title}" as incomplete` : `Mark "${cp.title}" as complete`}
                title={
                  isClaimedByMe
                    ? cp.is_completed
                      ? "Click to mark as incomplete"
                      : "Click to mark as complete"
                    : isClaimedByOther
                    ? "Claimed by collaborator. Click to request edit."
                    : "Unclaimed box. Click to claim edit lock to check steps."
                }
                className="flex h-4 w-4 shrink-0 items-center justify-center cursor-pointer transition-transform hover:scale-110 focus-visible:outline-none"
              >
                {cp.is_completed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400" />
                )}
              </button>

              {/* Text label with tooltip */}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(node);
                }}
                title={cp.title}
                className={`truncate flex-1 cursor-pointer select-none ${
                  cp.is_completed
                    ? "text-neutral-400 line-through dark:text-neutral-500"
                    : "text-neutral-700 dark:text-neutral-300"
                }`}
              >
                {cp.title}
              </span>
            </div>
          ))}

          {node.checkpoints.length > 2 && (
            <p
              data-no-drag="true"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(node);
              }}
              className="px-1.5 text-[10px] font-medium text-neutral-400 hover:text-neutral-900 cursor-pointer dark:text-neutral-500 dark:hover:text-white"
            >
              +{node.checkpoints.length - 2} more checkpoints…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
