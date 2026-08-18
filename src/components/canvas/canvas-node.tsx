"use client";

import React, { useState, useRef } from "react";
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

interface CanvasNodeComponentProps {
  node: CanvasNode;
  stepIndex: number;
  isSelected: boolean;
  isLinking: boolean;
  currentUserId: string;
  onSelect: (node: CanvasNode) => void;
  onDragStart: (node: CanvasNode, e: React.PointerEvent) => void;
  onDragEnd: () => void;
  onStartLink: (node: CanvasNode, handle: HandlePosition, e: React.PointerEvent) => void;
  onToggleCheckpoint: (checkpointId: string, nodeId: string, nextCompleted: boolean) => void;
  onRequestClaim: (node: CanvasNode) => void;
  onClaimNode?: (nodeId: string) => void;
}

export default function CanvasNodeComponent({
  node,
  stepIndex,
  isSelected,
  isLinking,
  currentUserId,
  onSelect,
  onDragStart,
  onDragEnd,
  onStartLink,
  onToggleCheckpoint,
  onRequestClaim,
  onClaimNode,
}: CanvasNodeComponentProps) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const completionPct = calculateCompletionPercentage(node.checkpoints);
  const isComplete = isNodeFullyComplete(node);
  const isClaimedByMe = node.claimed_by === currentUserId;
  const isClaimedByOther = Boolean(node.claimed_by && !isClaimedByMe);
  const claimColor = node.claimed_by ? getUserColor(node.claimed_by) : "#a3a3a3";

  // Handles list
  const handles: HandlePosition[] = ["top", "right", "bottom", "left"];

  const handlePointerDown = (e: React.PointerEvent) => {
    // If clicking on an interactive element like checkpoint checkbox or handle, don't trigger drag
    if ((e.target as HTMLElement).closest("[data-no-drag]")) {
      return;
    }
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelect(node);
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
      className={`group absolute top-0 left-0 cursor-move rounded-xl border bg-white/95 p-4 shadow-sm backdrop-blur-md transition-shadow duration-150 select-none ${
        isSelected
          ? "border-neutral-900 ring-2 ring-neutral-900/20 shadow-md"
          : isComplete
          ? "border-emerald-300/80 hover:border-emerald-400 hover:shadow-md"
          : isClaimedByOther
          ? "border-amber-300/80 hover:border-amber-400"
          : "border-neutral-200/90 hover:border-neutral-300 hover:shadow-md"
      }`}
    >
      {/* 4 Connection Ports / Anchor Handles - Only accessible if claimed by current user */}
      {isClaimedByMe &&
        handles.map((handle) => (
          <div
            key={handle}
            data-no-drag="true"
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartLink(node, handle, e);
            }}
            className={`absolute z-20 flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 bg-white shadow-xs transition-all duration-150 ${getHandlePositionStyles(
              handle
            )} ${
              isHovered || isLinking
                ? "opacity-100 scale-100 cursor-crosshair hover:bg-neutral-900 hover:text-white hover:scale-125 hover:border-neutral-900"
                : "opacity-0 scale-75 pointer-events-none"
            }`}
            title={`Link from ${handle} port`}
          >
            <Plus className="h-3 w-3 text-neutral-600 group-hover:text-white" />
          </div>
        ))}

      {/* Header Row: Step Number & Claim Pill */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
              isComplete
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                : "bg-neutral-100 text-neutral-600 border border-neutral-200/60"
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
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : isClaimedByOther
              ? "bg-amber-50 text-amber-800 border border-amber-200 cursor-pointer hover:bg-amber-100"
              : "bg-neutral-50 text-neutral-600 border border-neutral-200 cursor-pointer hover:bg-neutral-100 hover:border-neutral-300"
          }`}
          title={
            isClaimedByMe
              ? "You currently have exclusive edit lock on this box"
              : isClaimedByOther
              ? `Claimed by ${node.claim_holder?.fullName || "Collaborator"}. Click to request edit handoff.`
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
              <Lock className="h-2.5 w-2.5 text-amber-700" />
              <span className="max-w-[70px] truncate">
                {node.claim_holder?.fullName?.split(" ")[0] || "Locked"}
              </span>
            </>
          ) : (
            <>
              <Unlock className="h-2.5 w-2.5 text-neutral-400" />
              <span className="text-neutral-600">Free</span>
            </>
          )}
        </div>
      </div>

      {/* Node Title */}
      <h3
        className="mt-2.5 text-[13px] font-semibold text-neutral-900 line-clamp-1 leading-snug"
        title={node.title}
      >
        {node.title}
      </h3>

      {/* Progress Section or Empty State */}
      {node.checkpoints.length > 0 ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-medium text-neutral-500 mb-1">
            <span>
              {node.checkpoints.filter((c) => c.is_completed).length} of{" "}
              {node.checkpoints.length} done
            </span>
            <span
              className={
                isComplete
                  ? "font-semibold text-emerald-600"
                  : "font-semibold text-neutral-700"
              }
            >
              {completionPct}%
            </span>
          </div>
          {/* Animated Progress Bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className={`h-full transition-all duration-300 ease-out rounded-full ${
                isComplete
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                  : completionPct > 0
                  ? "bg-neutral-800"
                  : "bg-transparent"
              }`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-3 border-t border-neutral-100/80 pt-2 flex items-center justify-between text-[11px] text-neutral-400">
          <span>0 checkpoints</span>
          <span className="text-[10px] text-neutral-400 font-normal">
            {isClaimedByMe ? "Add steps in drawer" : "Claim to edit"}
          </span>
        </div>
      )}

      {/* Mini Checkpoints List (Preview first 2 items) */}
      {node.checkpoints.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-neutral-100 pt-2.5">
          {node.checkpoints.slice(0, 2).map((cp) => (
            <div
              key={cp.id}
              data-no-drag="true"
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
              title={
                isClaimedByMe
                  ? "Toggle checkpoint"
                  : isClaimedByOther
                  ? "Claimed by collaborator. Click to request edit."
                  : "Unclaimed box. Click to claim edit lock to check steps."
              }
              className={`flex items-center gap-2 rounded px-1.5 py-0.5 text-[11px] transition-colors ${
                isClaimedByMe
                  ? "cursor-pointer hover:bg-neutral-50"
                  : "cursor-pointer opacity-75 hover:bg-neutral-100"
              }`}
            >
              {cp.is_completed ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-neutral-300" />
              )}
              <span
                className={`truncate ${
                  cp.is_completed
                    ? "text-neutral-400 line-through"
                    : "text-neutral-700"
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
              className="px-1.5 text-[10px] font-medium text-neutral-400 hover:text-neutral-900 cursor-pointer"
            >
              +{node.checkpoints.length - 2} more checkpoints…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
