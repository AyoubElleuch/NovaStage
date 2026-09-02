"use client";

import React, { useState } from "react";
import {
  Activity,
  Grid,
  Hand,
  MapPin,
  Maximize2,
  Minus,
  MousePointer,
  Plus,
  Redo2,
  SlidersHorizontal,
  Undo2,
  Waypoints,
  X,
} from "lucide-react";
import { CanvasTool, CanvasViewport } from "@/lib/canvas/types";

interface CanvasDockProps {
  className?: string;
  activeTool: CanvasTool;
  onSelectTool: (tool: CanvasTool) => void;
  viewport: CanvasViewport;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitView: () => void;
  onAddNode: () => void;
  onTidyLayout: () => void;
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
}

export default function CanvasDock({
  className,
  activeTool,
  onSelectTool,
  viewport,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitView,
  onAddNode,
  onTidyLayout,
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
}: CanvasDockProps) {
  const [isQuickToolsOpen, setIsQuickToolsOpen] = useState(false);
  const zoomPct = Math.round(viewport.zoom * 100);

  return (
    <div className="relative">
      {/* Mobile Quick Tools Popover */}
      {isQuickToolsOpen && (
        <div
          className="dash-pop absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-30 flex flex-col gap-2 rounded-2xl border border-neutral-200/90 bg-white/95 p-3 shadow-2xl backdrop-blur-xl sm:hidden min-w-[260px] dark:border-[#283548] dark:bg-[#161d27]/95"
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

          {/* Mobile Zoom Bar */}
          <div className="flex items-center justify-between gap-1 rounded-xl bg-neutral-100/80 p-1 dark:bg-[#121721]">
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

          {/* Mobile Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-1.5 pt-1 text-xs">
            <button
              type="button"
              onClick={() => {
                onTidyLayout();
                setIsQuickToolsOpen(false);
              }}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-2.5 py-2 font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer dark:border-[#283548] dark:bg-[#161d27] dark:text-neutral-300 dark:hover:bg-[#1e2634]"
            >
              <Waypoints className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
              <span>Tidy Layout</span>
            </button>
            <button
              type="button"
              onClick={onToggleSnapGrid}
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
                <span>Release Pulse</span>
              </button>
            )}
          </div>
        </div>
      )}

      <nav
        aria-label="Canvas control dock"
        className={
          className ||
          "flex shrink-0 items-center gap-1.5 rounded-2xl border border-neutral-200/80 bg-white/90 p-1.5 shadow-[0_2px_5px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all select-none dark:border-[#283548] dark:bg-[#161d27]/90 dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
        }
      >
        {/* Primary Interaction Tools (Pan & Select) */}
        <div className="flex items-center gap-1 border-r border-neutral-200/80 dark:border-[#283548] pr-1.5">
          <button
            type="button"
            onClick={() => onSelectTool("select")}
            title="Select & Marquee tool (V)"
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors cursor-pointer ${
              activeTool === "select"
                ? "bg-neutral-900 text-white shadow-xs dark:bg-emerald-600"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-[#1e2634] dark:hover:text-white"
            }`}
          >
            <MousePointer className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTool("hand")}
            title="Hand / Pan tool (H or Spacebar)"
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors cursor-pointer ${
              activeTool === "hand"
                ? "bg-neutral-900 text-white shadow-xs dark:bg-emerald-600"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-[#1e2634] dark:hover:text-white"
            }`}
          >
            <Hand className="h-4 w-4" />
          </button>
        </div>

        {/* Add Node Action Button */}
        <button
          type="button"
          onClick={onAddNode}
          title="Add Milestone Node (N)"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-neutral-900 px-3 text-xs font-semibold text-white shadow-xs transition-all hover:bg-neutral-800 hover:scale-[1.02] cursor-pointer dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span>Add Node</span>
        </button>

        {/* Mobile Tools Trigger Button (Replaces 8 desktop buttons on mobile screens) */}
        <button
          type="button"
          onClick={() => setIsQuickToolsOpen((v) => !v)}
          title="Open Canvas Tools"
          className={`sm:hidden flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold transition-colors cursor-pointer ${
            isQuickToolsOpen
              ? "bg-neutral-900 text-white dark:bg-emerald-600"
              : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-[#1e2634]"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="font-mono text-[11px]">{zoomPct}%</span>
        </button>

        {/* Desktop-only tool controls: Graph Helpers, Zoom & Minimap */}
        <div className="hidden sm:flex items-center gap-1 border-l border-neutral-200/80 dark:border-[#283548] pl-1.5">
          <button
            type="button"
            onClick={onTidyLayout}
            title="Auto-Layout / Tidy Graph"
            className="flex h-9 items-center gap-1 rounded-xl px-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer dark:text-neutral-400 dark:hover:bg-[#1e2634] dark:hover:text-white"
          >
            <Waypoints className="h-3.5 w-3.5" />
            <span>Tidy</span>
          </button>

          <button
            type="button"
            onClick={onToggleSnapGrid}
            title={snapGrid ? "Snap to Grid: ON" : "Snap to Grid: OFF"}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors cursor-pointer ${
              snapGrid
                ? "bg-neutral-100 text-neutral-900 font-semibold dark:bg-[#1e2634] dark:text-white"
                : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-[#1e2634] dark:hover:text-neutral-300"
            }`}
          >
            <Grid className="h-4 w-4" />
          </button>

          {onToggleMinimap && (
            <button
              type="button"
              onClick={onToggleMinimap}
              title={isMinimapOpen ? "Radar Minimap: Visible" : "Radar Minimap: Hidden"}
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors cursor-pointer ${
                isMinimapOpen
                  ? "bg-neutral-100 text-neutral-900 font-semibold dark:bg-[#1e2634] dark:text-white"
                  : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-[#1e2634] dark:hover:text-neutral-300"
              }`}
            >
              <MapPin className="h-4 w-4" />
            </button>
          )}

          {onToggleReleasePulse && (
            <button
              type="button"
              onClick={onToggleReleasePulse}
              title={isReleasePulseOpen ? "Close Release Pulse" : "Open Release Pulse"}
              aria-label={isReleasePulseOpen ? "Close Release Pulse" : "Open Release Pulse"}
              aria-expanded={isReleasePulseOpen}
              className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl transition-colors ${
                isReleasePulseOpen
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-[#1e2634] dark:hover:text-neutral-300"
              }`}
            >
              <Activity className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Desktop-only Zoom Controls */}
        <div className="hidden sm:flex items-center gap-0.5 border-l border-neutral-200/80 dark:border-[#283548] pl-1.5">
          <button
            type="button"
            onClick={onZoomOut}
            title="Zoom Out (Ctrl -)"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer dark:text-neutral-400 dark:hover:bg-[#1e2634] dark:hover:text-white"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onResetZoom}
            title="Reset Zoom to 100%"
            className="min-w-11 px-1 py-1 text-center font-mono text-[11px] font-semibold text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer dark:text-neutral-300 dark:hover:bg-[#1e2634]"
          >
            {zoomPct}%
          </button>

          <button
            type="button"
            onClick={onZoomIn}
            title="Zoom In (Ctrl +)"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer dark:text-neutral-400 dark:hover:bg-[#1e2634] dark:hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onFitView}
            title="Fit to screen (Shift 1)"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer dark:text-neutral-400 dark:hover:bg-[#1e2634] dark:hover:text-white"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Undo / Redo (Both Desktop & Mobile) */}
        {(onUndo || onRedo) && (
          <div className="flex items-center gap-0.5 border-l border-neutral-200/80 dark:border-[#283548] pl-1.5">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl Z)"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer dark:text-neutral-400 dark:hover:bg-[#1e2634] dark:hover:text-white"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl Shift Z)"
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
