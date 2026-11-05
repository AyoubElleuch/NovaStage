"use client";

import { Sparkles, Undo2, X } from "lucide-react";

interface CanvasChangeBannerProps {
  label: string;
  text: string;
  onUndo: () => void;
  onDismiss: () => void;
}

/** Stays on screen after a built-in generation so the person can see what changed and take it back. */
export default function CanvasChangeBanner({ label, text, onUndo, onDismiss }: CanvasChangeBannerProps) {
  return (
    <div data-canvas-ui role="status" data-change-banner
      onPointerDown={(event) => event.stopPropagation()}
      className="pointer-events-auto absolute left-1/2 top-[7.25rem] z-30 flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 items-center gap-2 rounded-xl border border-violet-200 bg-white/95 py-1.5 pl-3 pr-1.5 text-xs text-neutral-800 shadow-lg backdrop-blur sm:top-[5.5rem] dark:border-violet-500/30 dark:bg-[#161d27]/95 dark:text-neutral-100">
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden="true" />
      <p className="min-w-0 flex-1 leading-snug"><span className="font-semibold">{label}.</span> {text}.</p>
      <button type="button" onClick={onUndo}
        className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg px-2.5 font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:h-8 dark:text-violet-300 dark:hover:bg-violet-500/10">
        <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />Undo
      </button>
      <button type="button" onClick={onDismiss} aria-label="Dismiss"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:h-8 sm:w-8 dark:text-neutral-300 dark:hover:bg-[#1e2634]">
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
