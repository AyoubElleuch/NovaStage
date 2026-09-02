"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Crown,
  Download,
  Eye,
  FileCode2,
  FileJson,
  Moon,
  Share2,
  Sun,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { CollaboratorPresence, CanvasNetworkStatus } from "@/lib/canvas/types";
import { useTheme } from "@/lib/theme-context";

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
  followingUserId?: string | null;
  onCopyInvite: () => void;
  onToggleFollowUser?: (userId: string) => void;
  onExportMermaid?: () => void;
  onExportJSON?: () => void;
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
  followingUserId = null,
  onCopyInvite,
  onToggleFollowUser,
  onExportMermaid,
  onExportJSON,
}: CanvasHudProps) {
  const [copied, setCopied] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const handleCopy = () => {
    onCopyInvite();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { theme, toggleTheme } = useTheme();

  const overallProgress =
    totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

  const followedUser = collaborators.find((c) => c.userId === followingUserId);

  return (
    <header className="pointer-events-none absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-2.5 sm:p-5 select-none gap-2">
      {/* Top Left: Project Identity & Breadcrumb */}
      <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-3 min-w-0">
        <Link
          href="/dashboard"
          title="Back to Projects"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-neutral-200/80 bg-white/90 text-neutral-600 shadow-sm backdrop-blur-md transition-colors hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer dark:border-[#283548] dark:bg-[#161d27]/90 dark:text-neutral-300 dark:hover:bg-[#1e2634] dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-white/90 px-2.5 py-1 sm:px-3.5 sm:py-1.5 shadow-sm backdrop-blur-md min-w-0 dark:border-[#283548] dark:bg-[#161d27]/90">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs font-bold text-neutral-900 capitalize truncate max-w-[100px] xs:max-w-[140px] sm:max-w-[260px] dark:text-white">
                {projectName}
              </h1>
              <span
                className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[9px] font-semibold ${
                  isOwner
                    ? "bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60"
                    : "bg-neutral-100 text-neutral-600 border border-neutral-200/60 dark:bg-[#1e2634] dark:text-neutral-300 dark:border-[#283548]"
                }`}
              >
                {isOwner && <Crown className="h-2.5 w-2.5" />}
                <span className="hidden xs:inline">{isOwner ? "Owner" : "Collab"}</span>
              </span>
            </div>

            {/* Total Project Roadmap Progress */}
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
              <span className="hidden sm:inline">
                {completedNodes}/{totalNodes} milestones ({overallProgress}%)
              </span>
              <span className="sm:hidden">
                {completedNodes}/{totalNodes} ({overallProgress}%)
              </span>
            </div>
          </div>
        </div>

        {/* Follow Mode Pill */}
        {followedUser && (
          <div className="hidden md:flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/90 px-3 py-1.5 text-xs font-semibold text-blue-800 shadow-sm backdrop-blur-md animate-pulse dark:border-blue-900/50 dark:bg-blue-950/60 dark:text-blue-300">
            <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Following {followedUser.fullName || "Collaborator"}</span>
            {onToggleFollowUser && (
              <button
                type="button"
                onClick={() => onToggleFollowUser(followedUser.userId)}
                title="Stop following"
                className="ml-1 rounded-full p-0.5 hover:bg-blue-100 text-blue-700 cursor-pointer dark:hover:bg-blue-900/50 dark:text-blue-300"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Top Right: Export, Theme Toggle, Network Status, Live Collaborators Stack & Invite Code */}
      <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Quick Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle dark mode"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200/80 bg-white/90 text-neutral-600 shadow-sm backdrop-blur-md transition-colors hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer dark:border-[#283548] dark:bg-[#161d27]/90 dark:text-neutral-300 dark:hover:bg-[#1e2634] dark:hover:text-white"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-neutral-600" />
          )}
        </button>

        {/* Export Dropdown */}
        {(onExportMermaid || onExportJSON) && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportOpen((prev) => !prev)}
              title="Export Roadmap"
              className="flex h-9 w-9 sm:w-auto items-center justify-center sm:justify-start gap-1.5 rounded-xl border border-neutral-200/80 bg-white/90 px-0 sm:px-3 text-xs font-semibold text-neutral-700 shadow-sm backdrop-blur-md hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer dark:border-[#283548] dark:bg-[#161d27]/90 dark:text-neutral-300 dark:hover:bg-[#1e2634] dark:hover:text-white"
            >
              <Download className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {isExportOpen && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl backdrop-blur-xl z-30 space-y-1 dark:border-[#283548] dark:bg-[#161d27]"
                onClick={() => setIsExportOpen(false)}
              >
                {onExportMermaid && (
                  <button
                    type="button"
                    onClick={onExportMermaid}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer text-left dark:text-neutral-300 dark:hover:bg-[#1e2634] dark:hover:text-white"
                  >
                    <FileCode2 className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                    <span>Copy Mermaid.js</span>
                  </button>
                )}
                {onExportJSON && (
                  <button
                    type="button"
                    onClick={onExportJSON}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer text-left dark:text-neutral-300 dark:hover:bg-[#1e2634] dark:hover:text-white"
                  >
                    <FileJson className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                    <span>Download JSON</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Network Quality / Connection Pill */}
        <div
          title={
            networkStatus === "online"
              ? `Real-time connection active${latencyMs ? ` (${latencyMs}ms latency)` : ""}`
              : networkStatus === "slow"
              ? `Slow connection (${latencyMs || 250}+ms).`
              : networkStatus === "reconnecting"
              ? "Reconnecting to realtime channel..."
              : "Offline."
          }
          className={`flex items-center gap-1.5 rounded-xl border px-2 sm:px-2.5 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur-md transition-all ${
            networkStatus === "online"
              ? "border-neutral-200/80 bg-white/90 text-neutral-700 dark:border-[#283548] dark:bg-[#161d27]/90 dark:text-neutral-300"
              : networkStatus === "slow"
              ? "border-amber-200 bg-amber-50/90 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-300"
              : networkStatus === "reconnecting"
              ? "border-orange-200 bg-orange-50/90 text-orange-800 animate-pulse dark:border-orange-900/50 dark:bg-orange-950/60 dark:text-orange-300"
              : "border-red-200 bg-red-50/90 text-red-700 dark:border-red-900/50 dark:bg-red-950/60 dark:text-red-400"
          }`}
        >
          {networkStatus === "online" ? (
            <>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="hidden sm:inline font-mono text-[10px] font-medium text-neutral-700 dark:text-neutral-400">
                {latencyMs !== null && latencyMs !== undefined ? `${latencyMs}ms` : "—"}
              </span>
            </>
          ) : networkStatus === "slow" ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
              <span className="hidden sm:inline font-mono text-[10px] font-medium text-amber-800">
                {latencyMs !== null && latencyMs !== undefined ? `${latencyMs}ms` : "Slow"}
              </span>
            </>
          ) : networkStatus === "reconnecting" ? (
            <>
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-spin" />
              <span className="hidden sm:inline font-semibold text-[10px]">Reconnecting…</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-red-500" />
              <span className="hidden sm:inline font-semibold text-[10px]">Offline</span>
            </>
          )}
        </div>

        {/* Collaborators Avatar Stack with Follow Mode Click */}
        {collaborators.length > 0 && (
          <div className="flex items-center -space-x-1.5 rounded-xl border border-neutral-200/80 bg-white/90 p-1 shadow-sm backdrop-blur-md dark:border-[#283548] dark:bg-[#161d27]/90">
            {collaborators.slice(0, 3).map((c) => {
              const isMe = c.userId === currentUserId;
              const isFollowingThis = followingUserId === c.userId;

              return (
                <button
                  key={c.userId}
                  type="button"
                  onClick={() => {
                    if (!isMe && onToggleFollowUser) {
                      onToggleFollowUser(c.userId);
                    }
                  }}
                  title={
                    isMe
                      ? `${c.fullName || c.email} (You)`
                      : isFollowingThis
                      ? `Following ${c.fullName || c.email}. Click to stop.`
                      : `Click to follow ${c.fullName || c.email}`
                  }
                  className={`relative grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold text-white ring-2 shadow-2xs transition-transform cursor-pointer ${
                    isFollowingThis
                      ? "ring-blue-500 scale-115 z-10"
                      : "ring-white hover:scale-110 dark:ring-[#161d27]"
                  }`}
                  style={{ backgroundColor: c.color }}
                >
                  {(c.fullName?.[0] || c.email?.[0] || "U").toUpperCase()}
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-[#161d27]" />
                </button>
              );
            })}
            {collaborators.length > 3 && (
              <span className="grid h-7 w-7 place-items-center rounded-full bg-neutral-100 text-[10px] font-semibold text-neutral-600 ring-2 ring-white dark:bg-[#1e2634] dark:text-neutral-300 dark:ring-[#161d27]">
                +{collaborators.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Invite Code Quick Copy */}
        {inviteCode && (
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? "Copied!" : `Copy invite code: ${inviteCode}`}
            className="flex h-9 w-9 sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white/90 px-0 sm:px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-sm backdrop-blur-md hover:bg-neutral-100 transition-colors cursor-pointer dark:border-[#283548] dark:bg-[#161d27]/90 dark:text-neutral-200 dark:hover:bg-[#1e2634]"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline text-emerald-700 dark:text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                <span className="hidden sm:inline font-mono text-[11px] text-neutral-900 dark:text-white">{inviteCode}</span>
              </>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
