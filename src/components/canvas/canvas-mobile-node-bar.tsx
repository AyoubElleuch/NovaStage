"use client";

import React from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Lock,
  Unlock,
  X,
} from "lucide-react";
import { CanvasNode } from "@/lib/canvas/types";
import {
  calculateCompletionPercentage,
  isNodeFullyComplete,
  getUserColor,
} from "@/lib/canvas/coordinate-math";

interface CanvasMobileNodeBarProps {
  node: CanvasNode;
  stepIndex: number;
  currentUserId: string;
  onOpenDrawer: () => void;
  onDeselect: () => void;
  onClaimNode: (nodeId: string) => void;
  onReleaseNode: (nodeId: string) => void;
  onRequestClaim: (node: CanvasNode) => void;
  onToggleCheckpoint: (checkpointId: string, nodeId: string, nextCompleted: boolean) => void;
}

export default function CanvasMobileNodeBar({
  node,
  stepIndex,
  currentUserId,
  onOpenDrawer,
  onDeselect,
  onClaimNode,
  onReleaseNode,
  onRequestClaim,
  onToggleCheckpoint,
}: CanvasMobileNodeBarProps) {
  const completionPct = calculateCompletionPercentage(node.checkpoints);
  const isComplete = isNodeFullyComplete(node);
  const isClaimedByMe = node.claimed_by === currentUserId;
  const isClaimedByOther = Boolean(node.claimed_by && !isClaimedByMe);
  const claimColor = node.claimed_by ? getUserColor(node.claimed_by) : "#a3a3a3";
  const otherClaimName =
    node.claim_holder?.fullName && node.claim_holder.fullName !== "You"
      ? node.claim_holder.fullName
      : "Collaborator";

  const nextUnfinishedCheckpoint = node.checkpoints.find((c) => !c.is_completed);

  return (
    <div
      className="dash-pop pointer-events-auto fixed bottom-20 inset-x-3 z-30 mx-auto max-w-md rounded-2xl border border-neutral-200/90 bg-white/95 p-3.5 shadow-2xl backdrop-blur-xl md:hidden dark:border-[#283548] dark:bg-[#161d27]/95"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top row: step badge, title, and close button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              isComplete
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                : "bg-neutral-100 text-neutral-600 border border-neutral-200 dark:bg-[#1e2634] dark:text-neutral-300 dark:border-[#283548]"
            }`}
          >
            {isComplete ? "DONE" : `STEP ${String(stepIndex + 1).padStart(2, "0")}`}
          </span>
          <h3 className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
            {node.title}
          </h3>
        </div>

        <button
          type="button"
          onClick={onDeselect}
          aria-label="Deselect milestone"
          className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors dark:hover:bg-[#1e2634] dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Checkpoints snippet / quick toggle */}
      {node.checkpoints.length > 0 && (
        <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-neutral-100 dark:border-[#283548] pt-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {nextUnfinishedCheckpoint ? (
              <>
                <button
                  type="button"
                  disabled={!isClaimedByMe}
                  onClick={() => {
                    if (isClaimedByMe) {
                      onToggleCheckpoint(nextUnfinishedCheckpoint.id, node.id, true);
                    }
                  }}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center cursor-pointer transition-transform ${
                    isClaimedByMe ? "hover:scale-110" : "opacity-60 cursor-not-allowed"
                  }`}
                  title={isClaimedByMe ? "Mark next step complete" : "Claim to toggle steps"}
                >
                  <Circle className="h-3.5 w-3.5 text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300" />
                </button>
                <span className="truncate text-[11px] text-neutral-600 dark:text-neutral-400">
                  {nextUnfinishedCheckpoint.title}
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                All {node.checkpoints.length} checkpoints done!
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono font-semibold text-neutral-500 dark:text-neutral-400 shrink-0">
            {completionPct}%
          </span>
        </div>
      )}

      {/* Action buttons row: Claim / Release / Request Lock & View Details */}
      <div className="mt-3 flex items-center gap-2 pt-1 border-t border-neutral-100 dark:border-[#283548]">
        {isClaimedByMe ? (
          <button
            type="button"
            onClick={() => onReleaseNode(node.id)}
            className="flex-1 inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors dark:border-[#283548] dark:bg-[#1e2634] dark:text-neutral-300 dark:hover:bg-[#283548]"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: claimColor }}
            />
            <span>Release Edit Lock</span>
          </button>
        ) : isClaimedByOther ? (
          <button
            type="button"
            onClick={() => onRequestClaim(node)}
            className="flex-1 inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300"
          >
            <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span className="truncate">Request Edit ({otherClaimName.split(" ")[0]})</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onClaimNode(node.id)}
            className="flex-1 inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition-colors dark:border-[#283548] dark:bg-[#1e2634] dark:text-neutral-300 dark:hover:bg-[#283548]"
          >
            <Unlock className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
            <span>Claim to Edit</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenDrawer}
          className="inline-flex h-9 cursor-pointer items-center justify-center gap-1 rounded-xl bg-neutral-900 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 transition-all active:scale-[0.98] dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          <span>Details</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
