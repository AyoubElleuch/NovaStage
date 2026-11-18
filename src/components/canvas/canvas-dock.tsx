"use client";
import AWSLogo from "@/components/aws-logo";

import React, { useEffect, useId, useRef, useState } from "react";
import {
  Activity,
  CircleHelp,
  Grid,
  Hand,
  Keyboard,
  MapPin,
  Maximize2,
  Minus,
  MousePointer,
  Plus,
  Redo2,
  SlidersHorizontal,
  Undo2,
  X,
  Square,
} from "lucide-react";
import { CanvasTool, CanvasViewport } from "@/lib/canvas/types";

interface CanvasDockProps {
  className?: string;
  isBusy?: boolean;
  activeTool: CanvasTool;
  onSelectTool: (tool: CanvasTool) => void;
  viewport: CanvasViewport;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitView: () => void;
  onAddNode: () => void;
  onAddGroup?: () => void;
  snapGrid: boolean;
  onToggleSnapGrid: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  isMinimapOpen?: boolean;
  onToggleMinimap?: () => void;
  isReleasePulseOpen?: boolean;
  onToggleReleasePulse?: () => void;
  onToggleServicePalette?: () => void;
  onOpenShortcuts?: () => void;
  onOpenGuide?: () => void;
  isGuideOpen?: boolean;
}

export default function CanvasDock({
  className,
  isBusy = false,
  activeTool,
  onSelectTool,
  viewport,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitView,
  onAddNode,
  onAddGroup,
  snapGrid,
  onToggleSnapGrid,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isMinimapOpen,
  onToggleMinimap,
  isReleasePulseOpen,
  onToggleReleasePulse,
  onToggleServicePalette,
  onOpenShortcuts,
  onOpenGuide,
  isGuideOpen,
}: CanvasDockProps) {
  const [isQuickToolsOpen, setIsQuickToolsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const quickToolsRef = useRef<HTMLButtonElement>(null);
  const quickToolsId = useId();
  const zoomPct = Math.round(viewport.zoom * 100);

  useEffect(() => {
    if (!isQuickToolsOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsQuickToolsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [isQuickToolsOpen]);

  return (
    <div
      ref={rootRef}
      data-canvas-ui="true"
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape" && isQuickToolsOpen) {
          event.preventDefault();
          setIsQuickToolsOpen(false);
          quickToolsRef.current?.focus();
        }
      }}
      className="relative min-w-0 max-w-full [&_button:focus-visible]:outline-none [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-emerald-500 [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-40"
    >
      {/* Secondary canvas controls */}
      {isQuickToolsOpen && (
        <div
          id={quickToolsId}
          role="region"
          aria-label="Canvas tools"
          className="dash-pop absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-30 flex max-h-[calc(100dvh-10rem)] w-[min(340px,calc(100vw-24px))] flex-col gap-2 overflow-y-auto overscroll-contain rounded-2xl border border-neutral-200/90 bg-white/95 p-3 shadow-2xl backdrop-blur-xl [&_button]:min-h-11 dark:border-[#283548] dark:bg-[#161d27]/95"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100 dark:border-[#283548]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Canvas Controls
            </span>
            <button
              type="button"
              onClick={() => setIsQuickToolsOpen(false)}
              aria-label="Close tools menu"
              className="grid h-6 w-6 place-items-center rounded-md text-neutral-400 hover:bg-neutral-100 cursor-pointer dark:hover:bg-[#1e2634] dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Zoom controls for compact layouts */}
          <div className="flex @[950px]/controls:hidden items-center justify-between gap-1 rounded-xl bg-neutral-100/80 p-1 dark:bg-[#121721]">
            <button
              type="button"
              onClick={onZoomOut}
              title="Zoom Out"
              className="grid h-8 w-8 place-items-center rounded-lg text-neutral-700 hover:bg-white cursor-pointer dark:text-neutral-300 dark:hover:bg-[#1e2634]"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onResetZoom}
              title="Reset Zoom"
              className="px-2 py-1 font-mono text-xs font-semibold text-neutral-800 hover:bg-white rounded-md cursor-pointer dark:text-neutral-200 dark:hover:bg-[#1e2634]"
            >
              {zoomPct}%
            </button>
            <button
              type="button"
              onClick={onZoomIn}
              title="Zoom In"
              className="grid h-8 w-8 place-items-center rounded-lg text-neutral-700 hover:bg-white cursor-pointer dark:text-neutral-300 dark:hover:bg-[#1e2634]"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                onFitView();
                setIsQuickToolsOpen(false);
              }}
              title="Fit to Screen"
              className="grid h-8 w-8 place-items-center rounded-lg text-neutral-700 hover:bg-white cursor-pointer dark:text-neutral-300 dark:hover:bg-[#1e2634]"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Actions and view options */}
          <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs">
            {onAddGroup && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  onAddGroup();
                  setIsQuickToolsOpen(false);
                }}
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5 text-neutral-700 dark:border-[#283548] dark:text-neutral-300"
              >
                <Square className="h-4 w-4" />
                Add group
              </button>
            )}
            {onUndo && (
              <button
                type="button"
                disabled={!canUndo || isBusy}
                onClick={onUndo}
                className="flex @[950px]/controls:hidden items-center justify-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5 text-neutral-700 dark:border-[#283548] dark:text-neutral-300"
              >
                <Undo2 className="h-4 w-4" />
                Undo
              </button>
            )}
            {onRedo && (
              <button
                type="button"
                disabled={!canRedo || isBusy}
                onClick={onRedo}
                className="flex @[950px]/controls:hidden items-center justify-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5 text-neutral-700 dark:border-[#283548] dark:text-neutral-300"
              >
                <Redo2 className="h-4 w-4" />
                Redo
              </button>
            )}
            {onOpenGuide && (
              <button
                type="button"
                data-guide-trigger
                aria-pressed={Boolean(isGuideOpen)}
                onClick={() => {
                  setIsQuickToolsOpen(false);
                  quickToolsRef.current?.focus();
                  onOpenGuide();
                }}
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5 text-neutral-700 hover:bg-neutral-50 dark:border-[#283548] dark:text-neutral-300 dark:hover:bg-[#1e2634]"
              >
                <CircleHelp className="h-3.5 w-3.5" />
                {isGuideOpen ? "Hide canvas guide" : "Canvas guide"}
              </button>
            )}
            {onOpenShortcuts && (
              <button
                type="button"
                onClick={() => {
                  quickToolsRef.current?.focus();
                  setIsQuickToolsOpen(false);
                  onOpenShortcuts();
                }}
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5 text-neutral-700 hover:bg-neutral-50 dark:border-[#283548] dark:text-neutral-300 dark:hover:bg-[#1e2634]"
              >
                <Keyboard className="h-3.5 w-3.5" />
                Keyboard shortcuts
              </button>
            )}
            <button
              type="button"
              onClick={onToggleSnapGrid}
              aria-label="Snap to grid"
              aria-pressed={snapGrid}
              className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 font-medium cursor-pointer transition-colors ${
                snapGrid
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-emerald-600 dark:bg-emerald-600"
                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-[#283548] dark:bg-[#161d27] dark:text-neutral-300 dark:hover:bg-[#1e2634]"
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span>{snapGrid ? "Grid: ON" : "Grid: OFF"}</span>
            </button>
            {onToggleMinimap && (
              <button
                type="button"
                onClick={() => {
                  onToggleMinimap();
                  setIsQuickToolsOpen(false);
                }}
                className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 font-medium cursor-pointer transition-colors ${
                  isMinimapOpen
                    ? "border-neutral-900 bg-neutral-900 text-white dark:border-emerald-600 dark:bg-emerald-600"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-[#283548] dark:bg-[#161d27] dark:text-neutral-300 dark:hover:bg-[#1e2634]"
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Minimap</span>
              </button>
            )}
            {onToggleReleasePulse && (
              <button
                type="button"
                onClick={() => {
                  onToggleReleasePulse();
                  setIsQuickToolsOpen(false);
                }}
                className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 font-medium cursor-pointer transition-colors ${
                  isReleasePulseOpen
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-[#283548] dark:bg-[#161d27] dark:text-neutral-300 dark:hover:bg-[#1e2634]"
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                <span>{isReleasePulseOpen ? "Close Release Pulse" : "Open Release Pulse"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      <nav
        aria-label="Canvas control dock"
        className={
          className ||
          "flex min-w-0 shrink-0 items-center gap-1 @[950px]/controls:gap-1.5 rounded-2xl border border-neutral-200/80 bg-white/90 p-1 @[950px]/controls:p-1.5 shadow-[0_2px_5px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all select-none max-w-full overflow-x-auto no-scrollbar dark:border-[#283548] dark:bg-[#161d27]/90 dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
        }
      >
        {/* Primary Interaction Tools (Pan & Select) */}
        <div className="flex items-center gap-0.5 @[950px]/controls:gap-1 border-r border-neutral-200/80 dark:border-[#283548] pr-1 @[950px]/controls:pr-1.5">
          <button
            type="button"
            onClick={() => onSelectTool("select")}
            aria-label="Select and move nodes"
            aria-pressed={activeTool === "select"}
            title="Select & Marquee tool (V)"
            className={`flex h-11 w-11 @[950px]/controls:h-9 @[950px]/controls:w-9 items-center justify-center rounded-xl transition-colors cursor-pointer ${
              activeTool === "select"
                ? "bg-neutral-900 text-white shadow-xs dark:bg-emerald-600"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-[#1e2634] dark:hover:text-white"
            }`}
          >
            <MousePointer className="h-3.5 w-3.5 @[950px]/controls:h-4 @[950px]/controls:w-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTool("hand")}
            aria-label="Pan canvas"
            aria-pressed={activeTool === "hand"}
            title="Hand / Pan tool (H or Spacebar)"
            className={`flex h-11 w-11 @[950px]/controls:h-9 @[950px]/controls:w-9 items-center justify-center rounded-xl transition-colors cursor-pointer ${
              activeTool === "hand"
                ? "bg-neutral-900 text-white shadow-xs dark:bg-emerald-600"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-[#1e2634] dark:hover:text-white"
            }`}
          >
            <Hand className="h-3.5 w-3.5 @[950px]/controls:h-4 @[950px]/controls:w-4" />
          </button>
        </div>

        {/* Add Node Action Button */}
        <button
          type="button"
          onClick={onAddNode}
          disabled={isBusy}
          aria-label="Add milestone"
          title="Add Milestone Node (N)"
          className="inline-flex h-11 @[950px]/controls:h-9 shrink-0 items-center gap-1 @[950px]/controls:gap-1.5 whitespace-nowrap rounded-xl bg-neutral-900 px-3 text-xs font-semibold text-white shadow-xs transition-all hover:bg-neutral-800 hover:scale-[1.02] cursor-pointer dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden @[950px]/controls:inline">Milestone</span>
        </button>

        {/* AWS Services Button */}
        {onToggleServicePalette && (
          <button
            type="button"
            onClick={onToggleServicePalette}
            disabled={isBusy}
            title="AWS Services"
            aria-label="AWS Services"
            className="inline-flex h-11 @[950px]/controls:h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl border border-[#FF9900]/30 bg-[#FF9900]/10 px-2 @[950px]/controls:px-2.5 text-xs font-bold text-[#FF9900] shadow-[0_2px_5px_rgba(255,153,0,0.08)] transition-all hover:bg-[#FF9900]/20 hover:scale-[1.02] cursor-pointer"
          >
            <AWSLogo className="h-6 w-7" />
          </button>
        )}

        {/* Tools stay available at every width */}
        <button
          ref={quickToolsRef}
          data-guide-trigger
          type="button"
          onClick={() => setIsQuickToolsOpen((v) => !v)}
          aria-label="Canvas tools"
          aria-expanded={isQuickToolsOpen}
          aria-controls={quickToolsId}
          title="Open Canvas Tools"
          className={`flex h-11 @[950px]/controls:h-9 shrink-0 items-center gap-1 rounded-xl px-3 text-xs font-semibold transition-colors cursor-pointer ${
            isQuickToolsOpen
              ? "bg-neutral-900 text-white dark:bg-emerald-600"
              : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-[#1e2634]"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="font-mono text-[11px] @[950px]/controls:hidden">{zoomPct}%</span>
        </button>

        {/* Desktop-only Zoom Controls */}
        <div className="hidden @[950px]/controls:flex items-center gap-0.5 border-l border-neutral-200/80 dark:border-[#283548] pl-1.5">
          <button
            type="button"
            onClick={onZoomOut}
            title="Zoom Out (Ctrl -)"
            aria-label="Zoom out"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer dark:text-neutral-400 dark:hover:bg-[#1e2634] dark:hover:text-white"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onResetZoom}
            title="Reset Zoom to 100%"
            aria-label={`Reset zoom, currently ${zoomPct}%`}
            className="min-w-11 px-1 py-1 text-center font-mono text-[11px] font-semibold text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer dark:text-neutral-300 dark:hover:bg-[#1e2634]"
          >
            {zoomPct}%
          </button>

          <button
            type="button"
            onClick={onZoomIn}
            title="Zoom In (Ctrl +)"
            aria-label="Zoom in"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer dark:text-neutral-400 dark:hover:bg-[#1e2634] dark:hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onFitView}
            title="Fit to screen (Shift 1)"
            aria-label="Fit all items to screen"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer dark:text-neutral-400 dark:hover:bg-[#1e2634] dark:hover:text-white"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Undo / Redo (Both Desktop & Mobile) */}
        {(onUndo || onRedo) && (
          <div className="hidden @[950px]/controls:flex items-center gap-0.5 border-l border-neutral-200/80 dark:border-[#283548] pl-1.5">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo || isBusy}
              title="Undo (Ctrl Z)"
              aria-label="Undo"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer dark:text-neutral-400 dark:hover:bg-[#1e2634] dark:hover:text-white"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo || isBusy}
              title="Redo (Ctrl Shift Z)"
              aria-label="Redo"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer dark:text-neutral-400 dark:hover:bg-[#1e2634] dark:hover:text-white"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}
