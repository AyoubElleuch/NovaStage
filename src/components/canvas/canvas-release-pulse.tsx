"use client";

import React, { useMemo } from "react";
import { Activity, ArrowRight, CheckCircle2, GitBranch, ShieldAlert, X, Zap } from "lucide-react";
import { createPortal } from "react-dom";
import { analyzeReleasePulse } from "@/lib/canvas/release-pulse";
import type { CanvasEdge, CanvasNode } from "@/lib/canvas/types";

interface CanvasReleasePulseProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  onClose: () => void;
  onJumpToNode: (nodeId: string) => void;
}

function readinessLabel(readiness: number) {
  if (readiness === 100) return "Release ready";
  if (readiness >= 70) return "Closing in";
  if (readiness >= 35) return "In motion";
  return "Early stage";
}

export default function CanvasReleasePulse({
  nodes,
  edges,
  onClose,
  onJumpToNode,
}: CanvasReleasePulseProps) {
  const pulse = useMemo(() => analyzeReleasePulse(nodes, edges), [nodes, edges]);
  const circumference = 2 * Math.PI * 42;
  const progressOffset = circumference * (1 - pulse.readiness / 100);

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-xs md:hidden dark:bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        aria-label="Release pulse"
        className="fixed top-0 right-0 z-50 flex h-dvh w-full sm:max-w-105 flex-col border-l border-neutral-200 bg-white/95 shadow-2xl backdrop-blur-xl pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-[#283548] dark:bg-[#161d27]/95"
      >
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-[#283548] px-5 py-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">Release pulse</h2>
          <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 uppercase">
            Live
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close release pulse"
          aria-label="Close release pulse"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-[#1e2634] dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="flex items-center gap-5 border-b border-neutral-100 dark:border-[#283548] px-5 py-6">
          <div className="relative h-24 w-24 shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" className="text-neutral-200 dark:text-[#283548]" strokeWidth="7" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#059669"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={progressOffset}
              />
            </svg>
            <strong className="absolute inset-0 grid place-items-center text-xl font-semibold text-neutral-900 dark:text-white">
              {pulse.readiness}%
            </strong>
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-neutral-900 dark:text-white">{readinessLabel(pulse.readiness)}</p>
            <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
              {pulse.completedNodes} of {pulse.totalNodes} milestones complete, weighted by checkpoint progress.
            </p>
            {pulse.hasCycle && (
              <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">A dependency cycle needs attention.</p>
            )}
          </div>
        </section>

        {pulse.totalNodes === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center px-8 text-center">
            <Activity className="h-6 w-6 text-neutral-300 dark:text-neutral-600" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">No signal yet</h3>
            <p className="mt-1 max-w-64 text-xs leading-5 text-neutral-400 dark:text-neutral-500">
              Add milestones and dependencies to reveal release readiness and bottlenecks.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-[#283548]">
            <section className="px-5 py-5">
              <div className="mb-3 flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
                <h3 className="text-xs font-semibold text-neutral-900 dark:text-white">Critical path</h3>
                <span className="ml-auto text-[10px] text-neutral-400 dark:text-neutral-500">
                  {pulse.criticalPath.length} unfinished
                </span>
              </div>
              {pulse.criticalPath.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {pulse.criticalPath.map((node, index) => (
                    <React.Fragment key={node.id}>
                      {index > 0 && <ArrowRight className="h-3 w-3 text-neutral-300 dark:text-neutral-600" aria-hidden="true" />}
                      <button
                        type="button"
                        onClick={() => onJumpToNode(node.id)}
                        title={`Open ${node.title}`}
                        className="max-w-full cursor-pointer truncate rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[11px] font-medium text-neutral-700 hover:border-neutral-400 hover:bg-white dark:border-[#283548] dark:bg-[#121721] dark:text-neutral-200 dark:hover:border-[#384961] dark:hover:bg-[#1e2634]"
                      >
                        {node.title} <span className="text-neutral-400 dark:text-neutral-500">{node.completion}%</span>
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-700 dark:text-emerald-400">Every milestone on the path is complete.</p>
              )}
            </section>

            <section className="px-5 py-5">
              <div className="mb-3 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                <h3 className="text-xs font-semibold text-neutral-900 dark:text-white">Highest-impact blockers</h3>
              </div>
              {pulse.blockers.length > 0 ? (
                <div className="space-y-1">
                  {pulse.blockers.slice(0, 4).map((blocker) => (
                    <button
                      key={blocker.id}
                      type="button"
                      onClick={() => onJumpToNode(blocker.id)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-[#121721]"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${blocker.isExplicitlyBlocked ? "bg-red-500" : "bg-amber-500"}`} />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-neutral-800 dark:text-neutral-200">{blocker.title}</span>
                      <span className="shrink-0 text-[10px] text-neutral-400 dark:text-neutral-500">
                        holds {blocker.downstreamCount} downstream
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> No downstream work is blocked.
                </div>
              )}
            </section>

            <section className="px-5 py-5">
              <div className="mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
                <h3 className="text-xs font-semibold text-neutral-900 dark:text-white">Ready now</h3>
                <span className="ml-auto text-[10px] text-neutral-400 dark:text-neutral-500">{pulse.readyNow.length} actionable</span>
              </div>
              {pulse.readyNow.length > 0 ? (
                <div className="space-y-1">
                  {pulse.readyNow.slice(0, 5).map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => onJumpToNode(node.id)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-[#121721]"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full bg-cyan-500" />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-neutral-800 dark:text-neutral-200">{node.title}</span>
                      <span className="shrink-0 text-[10px] text-neutral-400 dark:text-neutral-500">{node.completion}% complete</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400 dark:text-neutral-500">Finish a prerequisite to unlock the next milestone.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </aside>
    </>,
    document.body
  );
}