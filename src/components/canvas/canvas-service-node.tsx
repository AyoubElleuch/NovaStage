"use client";

import React, { useState, useRef, useEffect } from "react";
import { Lock, Plus, Unlock } from "lucide-react";
import { CanvasNode, HandlePosition, AWSServiceCategory } from "@/lib/canvas/types";
import { getUserColor } from "@/lib/canvas/coordinate-math";
import { AwsIcon } from "./aws-icons";

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

const CATEGORY_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  compute: { border: "border-orange-500", bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-400" },
  storage: { border: "border-green-500", bg: "bg-green-50 dark:bg-green-950/40", text: "text-green-700 dark:text-green-400" },
  database: { border: "border-blue-500", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-400" },
  networking: { border: "border-purple-500", bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-400" },
  security: { border: "border-red-500", bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-700 dark:text-red-400" },
  integration: { border: "border-pink-500", bg: "bg-pink-50 dark:bg-pink-950/40", text: "text-pink-700 dark:text-pink-400" },
  management: { border: "border-slate-500", bg: "bg-slate-50 dark:bg-slate-950/40", text: "text-slate-700 dark:text-slate-400" },
  ai_ml: { border: "border-teal-500", bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-700 dark:text-teal-400" },
  ml: { border: "border-teal-500", bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-700 dark:text-teal-400" },
};

export default function CanvasServiceNode({
  node,
  isSelected,
  isMultiSelected = false,
  isLinking,
  currentUserId,
  onSelect,
  onDragStart,
  onDragEnd,
  onStartLink,
  onRequestClaim,
  onClaimNode,
  onUpdateTitle,
}: CanvasServiceNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(node.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  const isClaimedByMe = node.claimed_by === currentUserId;
  const isClaimedByOther = Boolean(node.claimed_by && !isClaimedByMe);
  const claimColor = node.claimed_by ? getUserColor(node.claimed_by) : "#a3a3a3";
  const otherClaimName =
    node.claim_holder?.fullName && node.claim_holder.fullName !== "You"
      ? node.claim_holder.fullName
      : "Collaborator";
  const otherClaimFirstName = otherClaimName.split(" ")[0];

  const category = (node.aws_metadata?.category || "compute") as AWSServiceCategory;
  const categoryStyles = CATEGORY_COLORS[category] || CATEGORY_COLORS.compute;

  const handles: HandlePosition[] = ["top", "right", "bottom", "left"];

  const handlePointerDown = (e: React.PointerEvent) => {
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
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: `translate3d(${node.position_x}px, ${node.position_y}px, 0)`,
        width: `${node.width || 200}px`,
      }}
      className={`group absolute top-0 left-0 cursor-move rounded-xl border bg-white/95 p-3 shadow-sm backdrop-blur-md transition-shadow duration-150 select-none dark:bg-[#161d27]/95 flex flex-col border-l-4 ${
        categoryStyles.border
      } ${
        isSelected || isMultiSelected
          ? "ring-2 ring-neutral-900/20 shadow-md dark:ring-emerald-500/30"
          : isClaimedByOther
          ? "border-amber-300/80 hover:border-amber-400 dark:border-amber-700/60 dark:hover:border-amber-500"
          : "border-neutral-200/90 hover:border-neutral-300 hover:shadow-md dark:border-[#283548] dark:hover:border-[#384961] dark:hover:shadow-[0_8px_25px_rgba(0,0,0,0.4)]"
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

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 flex justify-center py-2">
          <AwsIcon serviceId={node.aws_metadata?.serviceId || ""} size={40} className="w-10 h-10" />
        </div>
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
          className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${
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
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: claimColor }} />
              <span>You</span>
            </>
          ) : isClaimedByOther ? (
            <>
              <Lock className="h-2.5 w-2.5 text-amber-700 dark:text-amber-400" />
              <span className="max-w-[50px] truncate">{otherClaimFirstName || "Locked"}</span>
            </>
          ) : (
            <>
              <Unlock className="h-2.5 w-2.5 text-neutral-400" />
            </>
          )}
        </div>
      </div>

      <div className="text-center mt-1">
        {isEditingTitle ? (
          <div data-no-drag="true">
            <input
              ref={titleInputRef}
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleCommitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCommitTitle();
                else if (e.key === "Escape") {
                  setIsEditingTitle(false);
                  setEditedTitle(node.title);
                }
              }}
              className="w-full text-center rounded border border-neutral-900 bg-white px-1.5 py-0.5 text-[13px] font-bold text-neutral-900 outline-none shadow-2xs dark:border-emerald-500 dark:bg-[#121721] dark:text-white"
            />
          </div>
        ) : (
          <h3
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (isClaimedByMe || !node.claimed_by) {
                if (!node.claimed_by && onClaimNode) onClaimNode(node.id);
                setIsEditingTitle(true);
              }
            }}
            className="text-[13px] font-bold text-neutral-900 line-clamp-1 leading-snug cursor-text dark:text-white"
          >
            {node.title}
          </h3>
        )}
      </div>

      <div className="flex flex-col items-center gap-1.5 mt-2">
        <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${categoryStyles.bg} ${categoryStyles.text}`}>
          {category.replace("_", " ")}
        </span>
        
        {node.aws_metadata?.region && (
          <span className="inline-block bg-neutral-100 text-neutral-600 border border-neutral-200 px-1.5 py-0.5 text-[10px] rounded dark:bg-[#1e2634] dark:text-neutral-300 dark:border-[#283548]">
            {node.aws_metadata.region}
          </span>
        )}
        
        {node.aws_metadata?.config && Object.entries(node.aws_metadata.config).length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mt-1">
            {Object.values(node.aws_metadata.config).slice(0, 2).map((val, idx) => (
              <span key={idx} className="inline-block bg-neutral-100 text-neutral-600 border border-neutral-200 px-1.5 py-0.5 text-[10px] rounded max-w-[80px] truncate dark:bg-[#1e2634] dark:text-neutral-300 dark:border-[#283548]">
                {val}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
