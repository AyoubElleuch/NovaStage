"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Lock,
  Plus,
  Sparkles,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import { CanvasNode, CanvasEdge } from "@/lib/canvas/types";
import {
  calculateCompletionPercentage,
  isNodeFullyComplete,
  getUserColor,
} from "@/lib/canvas/coordinate-math";

interface CanvasDrawerProps {
  node: CanvasNode | null;
  allNodes: CanvasNode[];
  edges: CanvasEdge[];
  currentUserId: string;
  isProjectOwner: boolean;
  onClose: () => void;
  onUpdateNode: (nodeId: string, updates: Partial<CanvasNode>) => void;
  onDeleteNode: (nodeId: string) => void;
  onToggleCheckpoint: (checkpointId: string, nodeId: string, nextCompleted: boolean) => void;
  onAddCheckpoint: (nodeId: string, title: string) => void;
  onDeleteCheckpoint: (checkpointId: string, nodeId: string) => void;
  onClaimNode: (nodeId: string) => void;
  onReleaseNode: (nodeId: string) => void;
  onRequestClaim: (node: CanvasNode) => void;
  onForceUnlock?: (nodeId: string) => void;
  onJumpToNode: (nodeId: string) => void;
}

function MilestoneDrawerContent({
  node,
  allNodes,
  edges,
  currentUserId,
  isProjectOwner,
  onClose,
  onUpdateNode,
  onDeleteNode,
  onToggleCheckpoint,
  onAddCheckpoint,
  onDeleteCheckpoint,
  onClaimNode,
  onReleaseNode,
  onRequestClaim,
  onForceUnlock,
  onJumpToNode,
}: Omit<CanvasDrawerProps, "node"> & { node: CanvasNode }) {
  const [title, setTitle] = useState(node.title);
  const [description, setDescription] = useState(node.description || "");
  const [newCheckpointTitle, setNewCheckpointTitle] = useState("");

  const completionPct = calculateCompletionPercentage(node.checkpoints);
  const isComplete = isNodeFullyComplete(node);
  const isClaimedByMe = node.claimed_by === currentUserId;
  const isClaimedByOther = Boolean(node.claimed_by && !isClaimedByMe);
  const isUnclaimed = !node.claimed_by;
  const claimColor = node.claimed_by ? getUserColor(node.claimed_by) : "#a3a3a3";
  const otherClaimName =
    node.claim_holder?.fullName && node.claim_holder.fullName !== "You"
      ? node.claim_holder.fullName
      : "Collaborator";

  // Find incoming (prerequisite) and outgoing (unlocked) dependencies
  const incomingEdges = edges.filter((e) => e.target_node_id === node.id);
  const outgoingEdges = edges.filter((e) => e.source_node_id === node.id);

  const prerequisiteNodes = incomingEdges
    .map((e) => allNodes.find((n) => n.id === e.source_node_id))
    .filter((n): n is CanvasNode => Boolean(n));

  const unlockedNodes = outgoingEdges
    .map((e) => allNodes.find((n) => n.id === e.target_node_id))
    .filter((n): n is CanvasNode => Boolean(n));

  const handleTitleBlur = () => {
    if (title.trim() && title !== node.title && isClaimedByMe) {
      onUpdateNode(node.id, { title: title.trim() });
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== node.description && isClaimedByMe) {
      onUpdateNode(node.id, { description });
    }
  };

  const handleAddCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckpointTitle.trim()) return;
    if (isClaimedByMe || isUnclaimed) {
      onAddCheckpoint(node.id, newCheckpointTitle.trim());
      setNewCheckpointTitle("");
    } else {
      onRequestClaim(node);
    }
  };

  return (
    <aside
      aria-label="Milestone inspector drawer"
      className="fixed top-0 right-0 z-30 flex h-dvh w-full max-w-[420px] flex-col border-l border-neutral-200 bg-white/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
            Milestone Details
          </span>
          {isComplete && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
              <Sparkles className="h-3 w-3" /> Complete
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Close drawer (Esc)"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Claim Lock Notification Banner */}
      <div className="border-b border-neutral-100 bg-neutral-50/60 px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {isClaimedByMe ? (
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: claimColor }}
              />
            ) : isClaimedByOther ? (
              <Lock className="h-4 w-4 shrink-0 text-amber-600" />
            ) : (
              <Unlock className="h-4 w-4 shrink-0 text-neutral-400" />
            )}

            <div className="min-w-0 text-xs">
              {isClaimedByMe ? (
                <p className="font-semibold text-emerald-700 truncate">
                  You are editing this box
                </p>
              ) : isClaimedByOther ? (
                <p className="font-medium text-amber-800 truncate">
                  Claimed by{" "}
                  <strong>{otherClaimName}</strong>
                </p>
              ) : (
                <p className="font-medium text-neutral-500 truncate">
                  Unclaimed milestone
                </p>
              )}
            </div>
          </div>

          {/* Claim Action Button */}
          <div className="shrink-0">
            {isClaimedByMe ? (
              <button
                type="button"
                onClick={() => onReleaseNode(node.id)}
                className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer shadow-2xs"
              >
                Release
              </button>
            ) : isClaimedByOther ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onRequestClaim(node)}
                  className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 transition-colors cursor-pointer shadow-2xs"
                >
                  Request Edit
                </button>
                {isProjectOwner && onForceUnlock && (
                  <button
                    type="button"
                    onClick={() => onForceUnlock(node.id)}
                    title="Owner Override: Force unlock"
                    className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                  >
                    Force Free
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onClaimNode(node.id)}
                className="rounded-lg bg-neutral-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-neutral-800 transition-colors cursor-pointer shadow-2xs"
              >
                Claim to Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Drawer Body Scroll */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {/* Title Input */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
            Step Title
          </label>
          <input
            type="text"
            value={title}
            disabled={!isClaimedByMe}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="e.g. Setup Supabase Database"
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-2xs outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed"
          />
        </div>

        {/* Progress Bar & Readout */}
        {node.checkpoints.length > 0 && (
          <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-neutral-700">Milestone Completion</span>
              <span className={isComplete ? "text-emerald-600 font-bold" : "text-neutral-900"}>
                {completionPct}% ({node.checkpoints.filter((c) => c.is_completed).length}/{node.checkpoints.length})
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
              <div
                className={`h-full transition-all duration-300 ease-out rounded-full ${
                  isComplete
                    ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
                    : completionPct > 0
                    ? "bg-neutral-900"
                    : "bg-transparent"
                }`}
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Description Field */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
            Description & Notes
          </label>
          <textarea
            rows={3}
            value={description}
            disabled={!isClaimedByMe}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            placeholder="Document technical requirements, schema links, or guidelines for this milestone…"
            className="w-full rounded-lg border border-neutral-200 bg-white p-3 text-xs leading-relaxed text-neutral-800 shadow-2xs outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed resize-none"
          />
        </div>

        {/* Checkpoints Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Checkpoints ({node.checkpoints.length})
            </label>
            {!isClaimedByMe && (
              <span className="text-[10px] text-neutral-400 font-medium italic">
                (View-only)
              </span>
            )}
          </div>

          <div className="space-y-2">
            {node.checkpoints.length === 0 && (
              <p className="text-xs text-neutral-400 italic py-1">
                No checkpoints yet. {isClaimedByMe ? "Add your first step below." : "Claim this milestone to add checklist steps."}
              </p>
            )}
            {node.checkpoints.map((cp) => (
              <div
                key={cp.id}
                className={`group relative flex items-start justify-between gap-3 rounded-xl border p-3 transition-all ${
                  cp.is_completed
                    ? "border-emerald-100 bg-emerald-50/30"
                    : "border-neutral-200/90 bg-white hover:border-neutral-300 hover:shadow-2xs"
                }`}
              >
                {/* Dedicated Checkbox Toggle Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isClaimedByMe) {
                      onToggleCheckpoint(cp.id, node.id, !cp.is_completed);
                    } else if (isClaimedByOther) {
                      onRequestClaim(node);
                    } else {
                      onClaimNode(node.id);
                    }
                  }}
                  aria-label={cp.is_completed ? "Mark checkpoint as incomplete" : "Mark checkpoint as complete"}
                  title={
                    isClaimedByMe
                      ? cp.is_completed
                        ? "Click to mark as incomplete"
                        : "Click to mark as complete"
                      : isClaimedByOther
                      ? "Claimed by collaborator. Click to request edit."
                      : "Unclaimed milestone. Click to claim edit lock."
                  }
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 ${
                    cp.is_completed
                      ? "text-emerald-600 hover:text-emerald-700 hover:scale-110"
                      : "text-neutral-300 hover:text-neutral-600 hover:scale-110"
                  }`}
                >
                  {cp.is_completed ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0" />
                  )}
                </button>

                {/* Checkpoint Text Content */}
                <div className="flex-1 min-w-0 pr-1">
                  <p
                    className={`text-xs leading-relaxed break-words select-text ${
                      cp.is_completed
                        ? "text-neutral-400 line-through decoration-neutral-300"
                        : "text-neutral-800 font-medium"
                    }`}
                  >
                    {cp.title}
                  </p>
                </div>

                {/* Delete Checkpoint Button - Only when Claimed */}
                {isClaimedByMe && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCheckpoint(cp.id, node.id);
                    }}
                    title="Delete checkpoint"
                    className="opacity-0 group-hover:opacity-100 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}

            {/* Inline Add Checkpoint Form - Only available to Claim holder */}
            {isClaimedByMe && (
              <form onSubmit={handleAddCheckpoint} className="mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCheckpointTitle}
                    onChange={(e) => setNewCheckpointTitle(e.target.value)}
                    placeholder="Add new checkpoint item (press Enter)…"
                    className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 shadow-2xs outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                  />
                  <button
                    type="submit"
                    disabled={!newCheckpointTitle.trim()}
                    className="inline-flex h-8 items-center justify-center rounded-lg bg-neutral-900 px-3 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Dependency Chain Section */}
        <div className="border-t border-neutral-100 pt-5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-3">
            Dependency Flow
          </label>

          {/* Prerequisites */}
          <div className="mb-3">
            <p className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1.5 mb-1.5">
              <ArrowLeft className="h-3 w-3 text-neutral-400" />
              Prerequisites ({prerequisiteNodes.length})
            </p>
            {prerequisiteNodes.length === 0 ? (
              <p className="text-xs text-neutral-400 italic pl-4">No prerequisites (Root step)</p>
            ) : (
              <div className="space-y-1.5 pl-2">
                {prerequisiteNodes.map((pn) => {
                  const prereqComplete = isNodeFullyComplete(pn);
                  return (
                    <div
                      key={pn.id}
                      onClick={() => onJumpToNode(pn.id)}
                      className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50/70 px-3 py-2 text-xs transition-colors hover:bg-neutral-100 cursor-pointer"
                    >
                      <span className="font-medium text-neutral-800 truncate">{pn.title}</span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          prereqComplete
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-neutral-200 text-neutral-600"
                        }`}
                      >
                        {prereqComplete ? "Done" : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unlocked Downstream Steps */}
          <div>
            <p className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1.5 mb-1.5">
              <ArrowRight className="h-3 w-3 text-neutral-400" />
              Unlocks Downstream ({unlockedNodes.length})
            </p>
            {unlockedNodes.length === 0 ? (
              <p className="text-xs text-neutral-400 italic pl-4">No downstream steps</p>
            ) : (
              <div className="space-y-1.5 pl-2">
                {unlockedNodes.map((un) => (
                  <div
                    key={un.id}
                    onClick={() => onJumpToNode(un.id)}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50/70 px-3 py-2 text-xs transition-colors hover:bg-neutral-100 cursor-pointer"
                  >
                    <span className="font-medium text-neutral-800 truncate">{un.title}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      {isComplete ? "Wire Glowing" : "Waiting"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer Footer Actions - Only available if claimed or owner */}
      {(isClaimedByMe || isProjectOwner) && (
        <div className="border-t border-neutral-100 p-4 bg-neutral-50/50">
          <button
            type="button"
            onClick={() => onDeleteNode(node.id)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white py-2 text-xs font-semibold text-red-600 shadow-2xs hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Milestone Box</span>
          </button>
        </div>
      )}
    </aside>
  );
}

export default function CanvasDrawer(props: CanvasDrawerProps) {
  if (!props.node) return null;
  return (
    <MilestoneDrawerContent
      key={`${props.node.id}:${props.node.title}:${props.node.description || ""}`}
      {...props}
      node={props.node}
    />
  );
}
