"use client";

import { useEffect, useId, useRef } from "react";
import { Keyboard, X } from "lucide-react";

const SHORTCUT_GROUPS = [
  { title: "Navigate", shortcuts: [
    ["Select tool", "V"],
    ["Hand tool", "H"],
    ["Pan temporarily", "Space + drag"],
    ["Find an item", "Ctrl / ⌘ + K"],
    ["Fit all items", "Shift + 1"],
    ["Fit selection", "Shift + 2"],
    ["Zoom in / out", "Ctrl / ⌘ + + / −"],
    ["Reset to 100%", "Ctrl / ⌘ + 0"],
  ] },
  { title: "Edit", shortcuts: [
    ["Add milestone", "N"],
    ["Select all items", "Ctrl / ⌘ + A"],
    ["Add / remove from selection", "Shift + click"],
    ["Rename focused item", "F2"],
    ["Delete selection", "Delete / Backspace"],
    ["Undo", "Ctrl / ⌘ + Z"],
    ["Redo", "Ctrl / ⌘ + Shift + Z"],
    ["Cancel / deselect", "Esc"],
  ] },
];

export default function CanvasShortcuts({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <div data-canvas-ui="true"
      className="absolute inset-0 z-50 flex items-center justify-center bg-neutral-950/30 p-3 backdrop-blur-sm sm:p-6"
      onPointerDown={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") { event.preventDefault(); onClose(); }
        if (event.key === "Tab") {
          event.preventDefault();
          if (document.activeElement === closeRef.current) contentRef.current?.focus();
          else closeRef.current?.focus();
        }
      }}>
      <section role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-[#283548] dark:bg-[#161d27]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 p-4 sm:px-6 dark:border-[#283548]">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"><Keyboard className="h-5 w-5" aria-hidden="true" /></span>
            <div><h2 id={titleId} className="text-base font-semibold text-neutral-900 dark:text-white">Keyboard shortcuts</h2>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">Keep your flow on the canvas.</p></div>
          </div>
          <button ref={closeRef} type="button" aria-label="Close keyboard shortcuts" onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-neutral-300 dark:hover:bg-[#1e2634]"><X className="h-4 w-4" aria-hidden="true" /></button>
        </div>
        <div ref={contentRef} tabIndex={0} role="region" aria-label="Canvas shortcut reference"
          className="grid min-h-0 gap-6 overflow-y-auto overscroll-contain p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 sm:grid-cols-2 sm:p-6">
          {SHORTCUT_GROUPS.map((group) => <div key={group.title}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{group.title}</h3>
            <dl className="divide-y divide-neutral-100 dark:divide-[#283548]">
              {group.shortcuts.map(([label, keys]) => <div key={label} className="flex min-h-10 items-center justify-between gap-3 py-2">
                <dt className="text-xs text-neutral-700 dark:text-neutral-300">{label}</dt>
                <dd className="shrink-0"><kbd className="rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-1 font-mono text-[10px] text-neutral-600 dark:border-[#384961] dark:bg-[#121721] dark:text-neutral-300">{keys}</kbd></dd>
              </div>)}
            </dl>
          </div>)}
        </div>
        <p className="shrink-0 border-t border-neutral-200 px-4 py-3 text-[11px] leading-5 text-neutral-500 sm:px-6 dark:border-[#283548] dark:text-neutral-400">Scroll to pan. Pinch or Ctrl / ⌘ + scroll to zoom at your pointer. Press <kbd className="font-mono">?</kbd> to open this guide.</p>
      </section>
    </div>
  );
}
