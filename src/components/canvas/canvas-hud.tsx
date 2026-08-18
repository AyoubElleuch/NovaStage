"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Crown,
  Share2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { CollaboratorPresence, CanvasNetworkStatus } from "@/lib/canvas/types";

interface CanvasHudProps {
  projectName: string;
  inviteCode?: string;
  isOwner: boolean;
  totalNodes: number;
  completedNodes: number;
  collaborators: CollaboratorPresence[];
  currentUserId: string;
  networkStatus?: CanvasNetworkStatus;
  latencyMs?: number | null;
  onCopyInvite: () => void;
}

export default function CanvasHud({
  projectName,
  inviteCode,
  isOwner,
  totalNodes,
  completedNodes,
  collaborators,
  currentUserId,
  networkStatus = "online",
  latencyMs = null,
  onCopyInvite,
}: CanvasHudProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopyInvite();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const overallProgress =
    totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

  return (
    <header className="pointer-events-none absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 sm:p-5">
      {/* Top Left: Project Identity & Breadcrumb */}
      <div className="pointer-events-auto flex items-center gap-3">
        <Link
          href="/dashboard"
          title="Back to Projects"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200/80 bg-white/90 text-neutral-600 shadow-sm backdrop-blur-md transition-colors hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200/80 bg-white/90 px-3.5 py-1.5 shadow-sm backdrop-blur-md">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs font-bold text-neutral-900 capitalize truncate max-w-[180px] sm:max-w-[260px]">
                {projectName}
              </h1>
              <span
                className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[9px] font-semibold ${
                  isOwner
                    ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                    : "bg-neutral-100 text-neutral-600 border border-neutral-200/60"
                }`}
              >
                {isOwner && <Crown className="h-2.5 w-2.5" />}
                {isOwner ? "Owner" : "Collab"}
              </span>
            </div>

            {/* Total Project Roadmap Progress */}
            <div className="flex items-center gap-2 text-[10px] font-medium text-neutral-500 mt-0.5">
              <span>
                {completedNodes}/{totalNodes} milestones ({overallProgress}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Right: Network Status, Live Collaborators Stack & Invite Code */}
      <div className="pointer-events-auto flex items-center gap-2">
        {/* Network Quality / Connection Pill */}
        <div
          title={
            networkStatus === "online"
              ? `Real-time connection active${latencyMs ? ` (${latencyMs}ms latency)` : ""}`
              : networkStatus === "slow"
              ? `Slow or high-latency connection (${latencyMs || 250}+ms). Cursors and edits are smoothly synchronized with jitter buffering.`
              : networkStatus === "reconnecting"
              ? "Reconnecting to realtime channel..."
              : "Offline. Actions will sync when connection returns."
          }
          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur-md transition-all ${
            networkStatus === "online"
              ? "border-neutral-200/80 bg-white/90 text-neutral-700"
              : networkStatus === "slow"
              ? "border-amber-200 bg-amber-50/90 text-amber-800"
              : networkStatus === "reconnecting"
              ? "border-orange-200 bg-orange-50/90 text-orange-800 animate-pulse"
              : "border-red-200 bg-red-50/90 text-red-700"
          }`}
        >
          {networkStatus === "online" ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="hidden sm:inline font-mono text-[10px]">
                {latencyMs ? `${latencyMs}ms` : "Live"}
              </span>
            </>
          ) : networkStatus === "slow" ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
              <span className="font-semibold text-[10px]">
                Slow{latencyMs ? ` (${latencyMs}ms)` : ""}
              </span>
            </>
          ) : networkStatus === "reconnecting" ? (
            <>
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-spin" />
              <span className="font-semibold text-[10px]">Reconnecting…</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-red-500" />
              <span className="font-semibold text-[10px]">Offline</span>
            </>
          )}
        </div>

        {/* Collaborators Avatar Stack */}
        {collaborators.length > 0 && (
          <div className="flex items-center -space-x-1.5 rounded-xl border border-neutral-200/80 bg-white/90 p-1 shadow-sm backdrop-blur-md">
            {collaborators.slice(0, 4).map((c) => (
              <span
                key={c.userId}
                title={`${c.fullName || c.email} ${c.userId === currentUserId ? "(You)" : ""}`}
                className="relative grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold text-white ring-2 ring-white shadow-2xs"
                style={{ backgroundColor: c.color }}
              >
                {(c.fullName?.[0] || c.email?.[0] || "U").toUpperCase()}
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white" />
              </span>
            ))}
            {collaborators.length > 4 && (
              <span className="grid h-7 w-7 place-items-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-600 ring-2 ring-white">
                +{collaborators.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Invite Code Quick Copy */}
        {inviteCode && (
          <button
            type="button"
            onClick={handleCopy}
            title="Click to copy invite code for collaborators"
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-sm backdrop-blur-md hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-neutral-500" />
                <span className="font-mono text-[11px] text-neutral-900">{inviteCode}</span>
              </>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
