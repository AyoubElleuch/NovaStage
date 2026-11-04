"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Compass, X } from "lucide-react";
import { CANVAS_GUIDE_TOPICS } from "@/lib/canvas/guide";

interface CanvasGuideProps {
  isTouch: boolean;
  onClose: () => void;
}

export default function CanvasGuide({ isTouch, onClose }: CanvasGuideProps) {
  const [index, setIndex] = useState(0);
  const topic = CANVAS_GUIDE_TOPICS[index];
  const isLast = index === CANVAS_GUIDE_TOPICS.length - 1;
  const previousFocus = useRef<Element | null>(null);

  // A guide opened by the person (rather than shown automatically) should not strand keyboard focus.
  useEffect(() => {
    previousFocus.current = document.activeElement;
    return () => {
      const target = previousFocus.current;
      if (target instanceof HTMLElement && target.isConnected && target.matches("[data-guide-trigger]")) target.focus({ preventScroll: true });
    };
  }, []);

  return (
    <section
      data-canvas-ui
      role="region"
      aria-label="Quick guide"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onClose();
      }}
      className="canvas-guide pointer-events-auto absolute left-3 right-3 top-[8.25rem] z-20 rounded-2xl border border-neutral-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-xl sm:right-auto sm:left-5 sm:top-[9rem] sm:w-80 dark:border-[#283548] dark:bg-[#161d27]/95"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"><Compass className="h-4 w-4" aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Quick guide · {index + 1} of {CANVAS_GUIDE_TOPICS.length}</p>
            <h2 className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{topic.title}</h2>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close canvas guide" title="Close guide"
          className="-mr-1 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:h-9 sm:w-9 dark:text-neutral-300 dark:hover:bg-[#1e2634]">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <p aria-live="polite" className="mt-3 text-xs leading-5 text-neutral-600 dark:text-neutral-300">{isTouch ? topic.touch : topic.pointer}</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex gap-1" aria-hidden="true">
          {CANVAS_GUIDE_TOPICS.map((item, dot) => <span key={item.id} className={`h-1.5 rounded-full transition-all ${dot === index ? "w-4 bg-emerald-500" : "w-1.5 bg-neutral-300 dark:bg-[#384961]"}`} />)}
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0} aria-label="Previous tip"
            className="grid h-11 w-11 place-items-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-40 sm:h-9 sm:w-9 dark:border-[#283548] dark:text-neutral-300 dark:hover:bg-[#1e2634]">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => (isLast ? onClose() : setIndex((value) => value + 1))}
            className="inline-flex h-11 min-w-20 items-center justify-center gap-1 rounded-lg bg-neutral-900 px-3 text-xs font-semibold text-white hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:h-9 dark:bg-emerald-600 dark:hover:bg-emerald-500">
            {isLast ? "Got it" : <>Next <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></>}
          </button>
        </div>
      </div>
    </section>
  );
}
