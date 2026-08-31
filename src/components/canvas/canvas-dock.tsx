"use client";

import React from "react";
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
  Undo2,
  Waypoints,
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
  const zoomPct = Math.round(viewport.zoom * 100);

  return (
    <nav
      aria-label="Canvas control dock"
      className={
        className ||
        "flex shrink-0 items-center gap-1.5 rounded-2xl border border-neutral-200/80 bg-white/90 p-1.5 shadow-[0_2px_5px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all select-none"
      }
    >
      {/* Primary Interaction Tools */}
      <div className="flex items-center gap-1 border-r border-neutral-200/80 pr-1.5">
        <button
          type="button"
          onClick={() => onSelectTool("select")}
          title="Select & Marquee tool (V)"
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors cursor-pointer ${
            activeTool === "select"
              ? "bg-neutral-900 text-white shadow-xs"
              : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
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
              ? "bg-neutral-900 text-white shadow-xs"
              : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
          }`}
        >
          <Hand className="h-4 w-4" />
        </button>
      </div>

      {/* Add Node Action Button (Matching App Theme) */}
      <button
        type="button"
        onClick={onAddNode}
        title="Add Milestone Node (N)"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-neutral-900 px-3 text-xs font-semibold text-white shadow-xs transition-all hover:bg-neutral-800 hover:scale-[1.02] cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        <span>Add Node</span>
      </button>

      {/* Graph Helpers: Auto-Layout & Snap Grid & Radar Toggle */}
      <div className="flex items-center gap-1 border-l border-neutral-200/80 pl-1.5">
        <button
          type="button"
          onClick={onTidyLayout}
          title="Auto-Layout / Tidy Graph"
          className="flex h-9 items-center gap-1 rounded-xl px-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer"
        >
          <Waypoints className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Tidy</span>
        </button>

        <button
          type="button"
          onClick={onToggleSnapGrid}
          title={snapGrid ? "Snap to Grid: ON" : "Snap to Grid: OFF"}
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors cursor-pointer ${
            snapGrid
              ? "bg-neutral-100 text-neutral-900 font-semibold"
              : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
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
                ? "bg-neutral-100 text-neutral-900 font-semibold"
                : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
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
                : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            }`}
          >
            <Activity className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-0.5 border-l border-neutral-200/80 pl-1.5">
        <button
          type="button"
          onClick={onZoomOut}
          title="Zoom Out (Ctrl -)"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onResetZoom}
          title="Reset Zoom to 100%"
          className="min-w-11 px-1 py-1 text-center font-mono text-[11px] font-semibold text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
        >
          {zoomPct}%
        </button>

        <button
          type="button"
          onClick={onZoomIn}
          title="Zoom In (Ctrl +)"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onFitView}
          title="Fit to screen (Shift 1)"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Undo / Redo */}
      {(onUndo || onRedo) && (
        <div className="flex items-center gap-0.5 border-l border-neutral-200/80 pl-1.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl Z)"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl Shift Z)"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </nav>
  );
}
