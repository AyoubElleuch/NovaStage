"use client";

import { Check, CloudOff, LoaderCircle, TriangleAlert } from "lucide-react";
import type { SaveIndicator } from "@/lib/canvas/save-status";

const TONES: Record<SaveIndicator["tone"], string> = {
  ok: "text-neutral-500 dark:text-neutral-400",
  busy: "text-neutral-500 dark:text-neutral-400",
  warn: "text-amber-700 dark:text-amber-400",
  error: "text-red-600 dark:text-red-400",
};

interface CanvasSaveStatusProps {
  indicator: SaveIndicator;
  onAction?: (action: NonNullable<SaveIndicator["action"]>) => void;
}

/** Always-visible save state. Routine "Saving/Saved" changes are not announced; problems are. */
export default function CanvasSaveStatus({ indicator, onAction }: CanvasSaveStatusProps) {
  const quiet = indicator.tone === "ok" || indicator.tone === "busy";
  const Icon = indicator.kind === "saving" ? LoaderCircle : indicator.kind === "offline" ? CloudOff : indicator.tone === "ok" ? Check : TriangleAlert;
  return (
    <span role="status" aria-live={quiet ? "off" : "polite"} data-save-state={indicator.kind} title={indicator.detail}
      className={`inline-flex min-w-0 items-center gap-1 text-[10px] font-medium ${TONES[indicator.tone]}`}>
      <Icon className={`h-3 w-3 shrink-0 ${indicator.kind === "saving" ? "animate-spin" : ""}`} aria-hidden="true" />
      <span className="truncate">{indicator.label}</span>
      <span className="sr-only">. {indicator.detail}</span>
      {indicator.action && onAction && (
        <button type="button" onClick={() => onAction(indicator.action!)}
          className="-my-1 ml-0.5 shrink-0 rounded px-1.5 py-1 font-semibold underline underline-offset-2 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-[#1e2634]">
          {indicator.action === "sync" ? "Reload" : "Dismiss"}
        </button>
      )}
    </span>
  );
}
