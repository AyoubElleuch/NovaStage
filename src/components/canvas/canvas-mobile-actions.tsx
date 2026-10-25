"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, FileCode2, FileJson, MoreHorizontal, Moon, Share2, Sun, UserPlus, X } from "lucide-react";
import type { CanvasNetworkStatus, CollaboratorPresence } from "@/lib/canvas/types";
import { useTheme } from "@/lib/theme-context";
import UserAvatar from "@/components/ui/user-avatar";

interface Props {
  canShare: boolean;
  onShare: () => void;
  inviteCode?: string;
  onCopyInvite: () => void;
  copied: boolean;
  isCopying: boolean;
  onExportMermaid?: () => void;
  onExportJSON?: () => void;
  networkStatus: CanvasNetworkStatus;
  latencyMs: number | null;
  collaborators: CollaboratorPresence[];
  currentUserId: string;
  followingUserId: string | null;
  onToggleFollowUser?: (id: string) => void;
}
const ITEM = "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-[#1e2634]";

export default function CanvasMobileActions(props: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const { theme, toggleTheme } = useTheme();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [open]);
  return <div ref={root} className="pointer-events-auto flex shrink-0 items-center gap-1.5 md:hidden"
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); } }}>
    {props.canShare && <button type="button" onClick={() => { setOpen(false); props.onShare(); }} aria-label="Share canvas" title="Share view-only canvas" className="grid h-11 w-11 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300"><Share2 className="h-4 w-4" /></button>}
    <button ref={trigger} type="button" aria-label="Canvas options" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)} className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-200 bg-white/95 text-neutral-700 shadow-sm dark:border-[#283548] dark:bg-[#161d27] dark:text-neutral-200"><MoreHorizontal className="h-5 w-5" /></button>
    {open && <section id={id} aria-label="Canvas options" className="absolute right-2.5 top-full z-40 max-h-[calc(100dvh-6rem)] w-[calc(100%-1.25rem)] max-w-sm overflow-y-auto overscroll-contain rounded-2xl border border-neutral-200 bg-white p-2 text-neutral-800 shadow-xl dark:border-[#283548] dark:bg-[#161d27] dark:text-neutral-200">
      <div className="flex items-center justify-between px-3 py-1"><h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Canvas options</h2><button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }} aria-label="Close canvas options" className="grid h-11 w-11 place-items-center rounded-xl hover:bg-neutral-100 dark:hover:bg-[#1e2634]"><X className="h-4 w-4" /></button></div>
      <button type="button" onClick={toggleTheme} className={ITEM}>{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</button>
      {props.onExportMermaid && <button type="button" onClick={() => { props.onExportMermaid?.(); setOpen(false); }} className={ITEM}><FileCode2 className="h-4 w-4" />Copy Mermaid.js</button>}
      {props.onExportJSON && <button type="button" onClick={() => { props.onExportJSON?.(); setOpen(false); }} className={ITEM}><FileJson className="h-4 w-4" />Download canvas JSON</button>}
      {props.inviteCode && <button type="button" disabled={props.isCopying} onClick={props.onCopyInvite} className={ITEM}>{props.copied ? <Check className="h-4 w-4 text-emerald-600" /> : <UserPlus className="h-4 w-4" />}<span>{props.copied ? "Invite code copied" : "Copy project invite"}<span className="mt-0.5 block font-mono text-xs text-neutral-500 dark:text-neutral-400">{props.inviteCode}</span></span></button>}
      <p role="status" className="my-2 border-t border-neutral-100 px-3 pt-3 text-xs text-neutral-500 dark:border-[#283548] dark:text-neutral-400">{props.networkStatus === "online" ? `Connected${props.latencyMs !== null ? ` · ${props.latencyMs} ms` : ""}` : props.networkStatus === "slow" ? "Slow connection" : props.networkStatus === "offline" ? "Offline — changes may not save" : "Reconnecting…"}</p>
      {!!props.collaborators.length && <div className="border-t border-neutral-100 pt-2 dark:border-[#283548]"><h3 className="px-3 py-2 text-xs font-semibold text-neutral-500">People on this canvas</h3>{props.collaborators.map(user => <button type="button" key={user.userId} disabled={user.userId === props.currentUserId || !props.onToggleFollowUser} onClick={() => { props.onToggleFollowUser?.(user.userId); setOpen(false); }} className={ITEM}>
        <UserAvatar src={user.avatarUrl} name={user.fullName} email={user.email} size="sm" /><span className="min-w-0 truncate">{user.fullName || user.email}{user.userId === props.currentUserId ? " (you)" : props.followingUserId === user.userId ? " · Stop following" : " · Follow"}</span>
      </button>)}</div>}
    </section>}
  </div>;
}
