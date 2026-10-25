"use client";

import React, { useEffect, useId, useRef, useState } from "react";
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
  UserPlus,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { CollaboratorPresence, CanvasNetworkStatus } from "@/lib/canvas/types";
import { useTheme } from "@/lib/theme-context";
import UserAvatar from "@/components/ui/user-avatar";
import CanvasShareDialog from "./canvas-share-dialog";
import CanvasMobileActions from "./canvas-mobile-actions";

interface CanvasHudProps {
  projectSlug?: string;
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
  onCopyInvite: () => void | Promise<void>;
  onToggleFollowUser?: (userId: string) => void;
  onExportMermaid?: () => void;
  onExportJSON?: () => void;
}

export default function CanvasHud({
  projectSlug,
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
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const exportTriggerRef = useRef<HTMLButtonElement>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportId = useId();

  const handleCopy = async () => {
    setIsCopying(true);
    try {
      await onCopyInvite();
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } finally { setIsCopying(false); }
  };

  useEffect(() => () => { if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current); }, []);
  useEffect(() => {
    if (!isExportOpen) return;
    const outside = (event: PointerEvent) => {
      if (!exportRef.current?.contains(event.target as Node)) setIsExportOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [isExportOpen]);

  const { theme, toggleTheme } = useTheme();

  const overallProgress =
    totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

  const followedUser = collaborators.find((c) => c.userId === followingUserId);

  return (
    <header data-canvas-ui="true" onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key === "Escape" && isExportOpen) { event.preventDefault(); setIsExportOpen(false); exportTriggerRef.current?.focus(); }
    }} className="pointer-events-none absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-2.5 md:p-5 select-none gap-2 [&_button:focus-visible]:outline-none [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-emerald-500">
      {/* Top Left: Project Identity & Breadcrumb */}
      <div className="pointer-events-auto flex flex-1 items-center gap-1.5 md:gap-3 min-w-0 md:flex-initial">
        <Link
          href="/dashboard"
          title="Back to Projects"
          className="flex h-11 w-11 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-xl border border-neutral-200/80 bg-white/90 text-neutral-600 shadow-sm backdrop-blur-md transition-colors hover:bg-neutral-100 hover:text-neutral-900 cursor-pointer dark:border-[#283548] dark:bg-[#161d27]/90 dark:text-neutral-300 dark:hover:bg-[#1e2634] dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="flex min-h-11 flex-1 md:flex-initial items-center gap-2 rounded-xl border border-neutral-200/80 bg-white/90 px-2.5 py-1 md:px-3.5 md:py-1.5 shadow-sm backdrop-blur-md min-w-0 dark:border-[#283548] dark:bg-[#161d27]/90">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 title={projectName} className="text-xs font-bold text-neutral-900 capitalize truncate md:max-w-[260px] dark:text-white">
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
              <span className="hidden md:inline">
                {completedNodes}/{totalNodes} milestones ({overallProgress}%)
              </span>
              <span className="md:hidden">
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

      <CanvasMobileActions canShare={Boolean(isOwner && projectSlug)} onShare={() => setIsShareOpen(true)}
        inviteCode={inviteCode} onCopyInvite={() => { void handleCopy().catch(() => setCopied(false)); }} copied={copied} isCopying={isCopying}
        onExportMermaid={onExportMermaid} onExportJSON={onExportJSON} networkStatus={networkStatus} latencyMs={latencyMs}
        collaborators={collaborators} currentUserId={currentUserId} followingUserId={followingUserId} onToggleFollowUser={onToggleFollowUser} />
      {/* Top Right: Export, Theme Toggle, Network Status, Live Collaborators Stack & Invite Code */}
      <div className="pointer-events-auto hidden md:flex items-center gap-1.5 md:gap-2 shrink-0">
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
          <div ref={exportRef} className="relative">
            <button
              type="button"
              ref={exportTriggerRef}
              onClick={() => setIsExportOpen((prev) => !prev)}
              aria-label="Export canvas"
              aria-expanded={isExportOpen}
              aria-controls={exportId}
              title="Export Roadmap"
              className="flex h-9 w-9 md:w-auto items-center justify-center md:justify-start gap-1.5 rounded-xl border border-neutral-200/80 bg-white/90 px-0 md:px-3 text-xs font-semibold text-neutral-700 shadow-sm backdrop-blur-md hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer dark:border-[#283548] dark:bg-[#161d27]/90 dark:text-neutral-300 dark:hover:bg-[#1e2634] dark:hover:text-white"
            >
              <Download className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
              <span className="hidden md:inline">Export</span>
            </button>

            {isExportOpen && (
              <div
                id={exportId}
                role="region"
                aria-label="Canvas export options"
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
          role="status"
          aria-label={`Connection ${networkStatus}${latencyMs !== null ? `, ${latencyMs} milliseconds` : ""}`}
          title={
            networkStatus === "online"
              ? `Real-time connection active${latencyMs ? ` (${latencyMs}ms latency)` : ""}`
              : networkStatus === "slow"
              ? `Slow connection (${latencyMs || 250}+ms).`
              : networkStatus === "reconnecting"
              ? "Reconnecting to realtime channel..."
              : "Offline."
          }
          className={`flex items-center gap-1.5 rounded-xl border px-2 md:px-2.5 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur-md transition-all ${
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
              <span className="hidden md:inline font-mono text-[10px] font-medium text-neutral-700 dark:text-neutral-400">
                {latencyMs !== null && latencyMs !== undefined ? `${latencyMs}ms` : "—"}
              </span>
            </>
          ) : networkStatus === "slow" ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
              <span className="hidden md:inline font-mono text-[10px] font-medium text-amber-800">
                {latencyMs !== null && latencyMs !== undefined ? `${latencyMs}ms` : "Slow"}
              </span>
            </>
          ) : networkStatus === "reconnecting" ? (
            <>
              <span className="h-2 w-2 rounded-full bg-orange-500 animate-spin" />
              <span className="hidden md:inline font-semibold text-[10px]">Reconnecting…</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-red-500" />
              <span className="font-semibold text-[10px]">Offline</span>
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
                  aria-label={isMe ? `${c.fullName || c.email}, you` : `${isFollowingThis ? "Stop following" : "Follow"} ${c.fullName || c.email}`}
                  aria-pressed={isFollowingThis}
                  title={
                    isMe
                      ? `${c.fullName || c.email} (You)`
                      : isFollowingThis
                      ? `Following ${c.fullName || c.email}. Click to stop.`
                      : `Click to follow ${c.fullName || c.email}`
                  }
                  className={`relative flex items-center justify-center rounded-full ring-2 shadow-2xs transition-transform cursor-pointer overflow-visible ${
                    isFollowingThis
                      ? "ring-blue-500 scale-115 z-10"
                      : "ring-white hover:scale-110 dark:ring-[#161d27]"
                  }`}
                >
                  <UserAvatar
                    src={c.avatarUrl}
                    name={c.fullName}
                    email={c.email}
                    size="sm"
                    className="border-none"
                  />
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

        {isOwner && projectSlug && <button type="button" onClick={() => setIsShareOpen(true)} aria-label="Share canvas" title="Share view-only canvas"
          className="flex h-9 w-9 md:w-auto items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-0 text-xs font-semibold text-emerald-800 shadow-sm md:px-3 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
          <Share2 className="h-4 w-4" /><span className="hidden md:inline">Share</span>
        </button>}
        {/* Invite Code Quick Copy */}
        {inviteCode && (
          <button
            type="button"
            onClick={() => { void handleCopy().catch(() => setCopied(false)); }}
            disabled={isCopying}
            aria-label={copied ? "Invite code copied" : "Copy invite code"}
            title={copied ? "Copied!" : `Copy invite code: ${inviteCode}`}
            className="flex h-9 w-9 md:w-auto items-center justify-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white/90 px-0 md:px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-sm backdrop-blur-md hover:bg-neutral-100 transition-colors cursor-pointer dark:border-[#283548] dark:bg-[#161d27]/90 dark:text-neutral-200 dark:hover:bg-[#1e2634]"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden md:inline text-emerald-700 dark:text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
                <span className="hidden md:inline font-mono text-[11px] text-neutral-900 dark:text-white">{inviteCode}</span>
              </>
            )}
          </button>
        )}
      </div>
      {isShareOpen && projectSlug && <CanvasShareDialog slug={projectSlug} onClose={() => setIsShareOpen(false)} />}
    </header>
  );
}
