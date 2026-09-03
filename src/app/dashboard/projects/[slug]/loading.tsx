import React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Grid,
  Hand,
  HelpCircle,
  MapPin,
  Maximize2,
  Minus,
  MousePointer,
  Plus,
  Redo2,
  Sparkles,
  Square,
  Undo2,
  Waypoints,
} from "lucide-react";

export default function ProjectCanvasLoading() {
  return (
    <div
      className="relative h-full w-full overflow-hidden bg-[#faf8f5] dark:bg-[#0f141c] select-none"
      style={{
        backgroundImage:
          "radial-gradient(circle, var(--canvas-dot, rgba(160, 150, 140, 0.18)) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Top Floating HUD Placeholder */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200/80 bg-white/90 text-neutral-600 shadow-sm backdrop-blur-md transition-all hover:bg-neutral-50 hover:text-neutral-900 active:scale-95 dark:border-[#283548] dark:bg-[#161d27]/90 dark:text-neutral-300 dark:hover:bg-[#1e2634] dark:hover:text-white"
            title="Return to Dashboard"
            aria-label="Return to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-2.5 rounded-xl border border-neutral-200/80 bg-white/90 px-3.5 py-2 shadow-sm backdrop-blur-md dark:border-[#283548] dark:bg-[#161d27]/90">
            <div className="space-y-1">
              <div className="h-3.5 w-32 rounded-md bg-neutral-200/80 dark:bg-[#283548] animate-pulse" />
              <div className="h-2.5 w-20 rounded-md bg-neutral-100 dark:bg-[#1e2634] animate-pulse" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-9 w-24 rounded-xl border border-neutral-200/80 bg-white/90 shadow-sm backdrop-blur-md animate-pulse dark:border-[#283548] dark:bg-[#161d27]/90" />
        </div>
      </header>

      {/* Floating Action Dock, AI Assistant, and Notes at Bottom */}
      <div className="scrollbar-none absolute inset-x-0 bottom-6 z-20 overflow-x-auto px-3 pb-2">
        <div className="mx-auto flex w-max items-center gap-2.5">
          <nav
            aria-label="Canvas control dock"
            className="flex shrink-0 items-center gap-1 sm:gap-1.5 rounded-2xl border border-neutral-200/80 bg-white/90 p-1 sm:p-1.5 shadow-[0_2px_5px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-[#283548] dark:bg-[#161d27]/90"
          >
            <div className="flex items-center gap-0.5 sm:gap-1 border-r border-neutral-200/80 dark:border-[#283548] pr-1 sm:pr-1.5">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-xs dark:bg-emerald-600">
                <MousePointer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-neutral-400 dark:text-neutral-500">
                <Hand className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>

            <div className="inline-flex h-8 sm:h-9 shrink-0 items-center gap-1 sm:gap-1.5 whitespace-nowrap rounded-xl bg-neutral-900 px-2 sm:px-3 text-xs font-semibold text-white shadow-xs dark:bg-emerald-600">
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Add Node</span>
            </div>

            <div className="inline-flex h-8 sm:h-9 shrink-0 items-center gap-1 sm:gap-1.5 whitespace-nowrap rounded-xl border border-neutral-200/80 bg-white/90 px-2 sm:px-3 text-xs font-semibold text-neutral-700 shadow-[0_2px_5px_rgba(0,0,0,0.04)] dark:border-[#283548] dark:bg-[#161d27] dark:text-neutral-300">
              <Square className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Group</span>
            </div>

            <div className="inline-flex h-8 sm:h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl border border-[#FF9900]/30 bg-[#FF9900]/10 px-2 sm:px-2.5 text-xs font-bold text-[#FF9900] shadow-[0_2px_5px_rgba(255,153,0,0.08)]">
              AWS
            </div>

            <div className="flex items-center gap-1 border-l border-neutral-200/80 dark:border-[#283548] pl-1.5">
              <div className="flex h-9 items-center gap-1 rounded-xl px-2 text-xs font-medium text-neutral-400 dark:text-neutral-500">
                <Waypoints className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tidy</span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-[#1e2634] dark:text-neutral-400">
                <Grid className="h-4 w-4" />
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-[#1e2634] dark:text-neutral-400">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 dark:text-neutral-500">
                <Activity className="h-4 w-4" />
              </div>
            </div>

            <div className="flex items-center gap-0.5 border-l border-neutral-200/80 dark:border-[#283548] pl-1.5">
              <div className="flex h-8 w-8 items-center justify-center text-neutral-400 dark:text-neutral-500">
                <Minus className="h-3.5 w-3.5" />
              </div>
              <span className="min-w-11 px-1 py-1 text-center font-mono text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                100%
              </span>
              <div className="flex h-8 w-8 items-center justify-center text-neutral-400 dark:text-neutral-500">
                <Plus className="h-3.5 w-3.5" />
              </div>
              <div className="flex h-8 w-8 items-center justify-center text-neutral-400 dark:text-neutral-500">
                <Maximize2 className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="flex items-center gap-0.5 border-l border-neutral-200/80 dark:border-[#283548] pl-1.5">
              <div className="flex h-8 w-8 items-center justify-center text-neutral-300 dark:text-neutral-600">
                <Undo2 className="h-3.5 w-3.5" />
              </div>
              <div className="flex h-8 w-8 items-center justify-center text-neutral-300 dark:text-neutral-600">
                <Redo2 className="h-3.5 w-3.5" />
              </div>
            </div>
          </nav>

          <div className="flex h-12 shrink-0 items-center gap-2 rounded-2xl border border-neutral-200/80 bg-white/95 px-3.5 shadow-[0_2px_5px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-[#283548] dark:bg-[#161d27]/95">
            <Sparkles className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">AI Assistant</span>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-neutral-200/80 bg-white/95 text-neutral-500 shadow-[0_2px_5px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-[#283548] dark:bg-[#161d27]/95 dark:text-neutral-400">
            <HelpCircle className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Floating Canvas Skeleton Milestones with Gentle Shimmer */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-8 px-8">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="w-72 rounded-xl border border-neutral-200/70 bg-white/80 p-4 shadow-sm backdrop-blur-md animate-pulse dark:border-[#283548] dark:bg-[#161d27]/80"
              style={{ animationDelay: `${idx * 150}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-16 rounded bg-neutral-200/80 dark:bg-[#283548]" />
                <div className="h-4 w-12 rounded-full bg-neutral-100 dark:bg-[#1e2634]" />
              </div>
              <div className="mt-3 h-4 w-40 rounded bg-neutral-200/80 dark:bg-[#283548]" />
              <div className="mt-4 space-y-2 border-t border-neutral-100 dark:border-[#283548] pt-3">
                <div className="h-3 w-full rounded bg-neutral-100 dark:bg-[#1e2634]" />
                <div className="h-3 w-4/5 rounded bg-neutral-100 dark:bg-[#1e2634]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
