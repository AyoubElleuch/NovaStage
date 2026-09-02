"use client";

import React, { useRef, useState, useEffect } from "react";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { CanvasNode, CanvasViewport } from "@/lib/canvas/types";
import { getCanvasBoundingBox, isNodeFullyComplete } from "@/lib/canvas/coordinate-math";

interface CanvasMinimapProps {
  nodes: CanvasNode[];
  viewport: CanvasViewport;
  onViewportChange: (newViewport: CanvasViewport) => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
}

const MINIMAP_WIDTH = 190;
const MINIMAP_HEIGHT = 120;

export default function CanvasMinimap({
  nodes,
  viewport,
  onViewportChange,
  isOpen = true,
  onToggleOpen,
}: CanvasMinimapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 1280, height: 800 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const bounds = getCanvasBoundingBox(nodes, 80);
  const scaleX = MINIMAP_WIDTH / bounds.width;
  const scaleY = MINIMAP_HEIGHT / bounds.height;
  const mapScale = Math.min(scaleX, scaleY);

  // Compute offset to center content inside minimap
  const offsetX = (MINIMAP_WIDTH - bounds.width * mapScale) / 2;
  const offsetY = (MINIMAP_HEIGHT - bounds.height * mapScale) / 2;

  // World to Minimap converter
  const worldToMap = (wx: number, wy: number) => {
    return {
      x: offsetX + (wx - bounds.minX) * mapScale,
      y: offsetY + (wy - bounds.minY) * mapScale,
    };
  };

  // Minimap to World converter
  const mapToWorld = (mx: number, my: number) => {
    return {
      x: bounds.minX + (mx - offsetX) / mapScale,
      y: bounds.minY + (my - offsetY) / mapScale,
    };
  };

  // Viewport box in world coords
  const viewWorldW = windowSize.width / viewport.zoom;
  const viewWorldH = windowSize.height / viewport.zoom;
  const viewWorldX = -viewport.x / viewport.zoom;
  const viewWorldY = -viewport.y / viewport.zoom;

  const viewMapPos = worldToMap(viewWorldX, viewWorldY);
  const viewMapW = Math.max(14, viewWorldW * mapScale);
  const viewMapH = Math.max(10, viewWorldH * mapScale);

  const handlePointerAction = (e: React.PointerEvent) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const mapX = Math.max(0, Math.min(MINIMAP_WIDTH, e.clientX - rect.left));
    const mapY = Math.max(0, Math.min(MINIMAP_HEIGHT, e.clientY - rect.top));

    const worldTarget = mapToWorld(mapX, mapY);

    // Center screen on clicked world point
    const newViewportX = windowSize.width / 2 - worldTarget.x * viewport.zoom;
    const newViewportY = windowSize.height / 2 - worldTarget.y * viewport.zoom;

    onViewportChange({
      ...viewport,
      x: Math.round(newViewportX),
      y: Math.round(newViewportY),
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    try {
      mapRef.current?.setPointerCapture?.(e.pointerId);
    } catch {}
    handlePointerAction(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      handlePointerAction(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        mapRef.current?.releasePointerCapture?.(e.pointerId);
      } catch {}
    }
  };

  return (
    <aside
      aria-label="Canvas Minimap Radar"
      className={`absolute bottom-24 right-3 sm:bottom-6 sm:right-6 z-20 flex flex-col items-end pointer-events-auto ${
        !isOpen ? "hidden sm:flex" : ""
      }`}
    >
      {/* Header bar / toggle button */}
      <div className="flex items-center gap-1 mb-1.5">
        <button
          type="button"
          onClick={onToggleOpen}
          title={isOpen ? "Collapse Minimap" : "Expand Minimap"}
          className="flex items-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 shadow-sm backdrop-blur-md hover:bg-neutral-100 hover:text-neutral-900 transition-colors cursor-pointer dark:border-[#283548] dark:bg-[#161d27]/90 dark:text-neutral-300 dark:hover:bg-[#1e2634] dark:hover:text-white"
        >
          <MapPin className="h-3 w-3 text-neutral-500 dark:text-neutral-400" />
          <span>Radar</span>
          {isOpen ? (
            <ChevronDown className="h-3 w-3 text-neutral-400" />
          ) : (
            <ChevronUp className="h-3 w-3 text-neutral-400" />
          )}
        </button>
      </div>

      {/* Radar Map Container */}
      {isOpen && (
        <div
          ref={mapRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ width: `${MINIMAP_WIDTH}px`, height: `${MINIMAP_HEIGHT}px` }}
          className="relative overflow-hidden rounded-2xl border border-neutral-200/90 bg-white/95 shadow-xl backdrop-blur-xl transition-all select-none cursor-crosshair dark:border-[#283548] dark:bg-[#161d27]/95"
        >
          {/* Subtle grid background */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, #737373 1px, transparent 1px)",
              backgroundSize: "12px 12px",
            }}
          />

          {/* Render Miniature Nodes */}
          {nodes.map((node) => {
            const pos = worldToMap(node.position_x, node.position_y);
            const w = Math.max(6, (node.width || 280) * mapScale);
            const h = Math.max(4, (node.height || 170) * mapScale);
            const isDone = isNodeFullyComplete(node);
            const isClaimed = Boolean(node.claimed_by);

            return (
              <div
                key={node.id}
                title={node.title}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: `${w}px`,
                  height: `${h}px`,
                }}
                className={`absolute rounded-xs pointer-events-none transition-colors ${
                  isDone
                    ? "bg-emerald-500 ring-1 ring-emerald-600/50"
                    : isClaimed
                    ? "bg-amber-400 ring-1 ring-amber-500/50"
                    : "bg-neutral-800 ring-1 ring-neutral-900/30 dark:bg-slate-400 dark:ring-slate-500/30"
                }`}
              />
            );
          })}

          {/* Render Viewport Window Indicator */}
          <div
            style={{
              left: `${viewMapPos.x}px`,
              top: `${viewMapPos.y}px`,
              width: `${viewMapW}px`,
              height: `${viewMapH}px`,
            }}
            className="absolute rounded-sm border-2 border-blue-500 bg-blue-500/10 pointer-events-none shadow-xs transition-all duration-75 ease-out dark:border-emerald-400 dark:bg-emerald-400/15"
          />
        </div>
      )}
    </aside>
  );
}
