"use client";

import React, { useRef, useState, useEffect, useId } from "react";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { CanvasNode, CanvasViewport } from "@/lib/canvas/types";
import { getCanvasBoundingBox, getNodeDimensions, isNodeFullyComplete } from "@/lib/canvas/coordinate-math";

interface CanvasMinimapProps {
  nodes: CanvasNode[];
  viewport: CanvasViewport;
  onViewportChange: (newViewport: CanvasViewport) => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  rightInset?: number;
}

const MINIMAP_WIDTH = 190;
const MINIMAP_HEIGHT = 120;

export default function CanvasMinimap({
  nodes,
  viewport,
  onViewportChange,
  isOpen = true,
  onToggleOpen,
  rightInset = 0,
}: CanvasMinimapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const mapId = useId();
  const [dragBounds, setDragBounds] = useState<ReturnType<typeof getCanvasBoundingBox> | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1280, height: 800 });

  useEffect(() => {
    const canvas = asideRef.current?.parentElement?.querySelector<HTMLElement>("[data-canvas-viewport]");
    const updateSize = () => {
      setCanvasSize({ width: canvas?.clientWidth || window.innerWidth, height: canvas?.clientHeight || window.innerHeight });
    };
    updateSize();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateSize) : null;
    if (canvas) observer?.observe(canvas);
    window.addEventListener("resize", updateSize);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  useEffect(() => {
    const cancelDrag = () => { activePointerRef.current = null; setDragBounds(null); };
    window.addEventListener("blur", cancelDrag);
    return () => window.removeEventListener("blur", cancelDrag);
  }, []);

  // Include the visible world so the view indicator remains visible even far from the graph.
  const visibleCanvasWidth = Math.max(1, canvasSize.width - rightInset);
  const viewWorldW = visibleCanvasWidth / viewport.zoom;
  const viewWorldH = canvasSize.height / viewport.zoom;
  const viewWorldX = -viewport.x / viewport.zoom;
  const viewWorldY = -viewport.y / viewport.zoom;
  const graphBounds = getCanvasBoundingBox(nodes, 80);
  const minX = Math.min(graphBounds.minX, viewWorldX);
  const minY = Math.min(graphBounds.minY, viewWorldY);
  const maxX = Math.max(graphBounds.maxX, viewWorldX + viewWorldW);
  const maxY = Math.max(graphBounds.maxY, viewWorldY + viewWorldH);
  // Freeze the map projection while dragging to prevent the target drifting under the pointer.
  const bounds = dragBounds || {
    minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY,
  };
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

  const viewMapPos = worldToMap(viewWorldX, viewWorldY);
  const viewMapW = viewWorldW * mapScale;
  const viewMapH = viewWorldH * mapScale;

  const handlePointerAction = (e: React.PointerEvent) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const mapX = Math.max(0, Math.min(MINIMAP_WIDTH, (e.clientX - rect.left) * MINIMAP_WIDTH / (rect.width || MINIMAP_WIDTH)));
    const mapY = Math.max(0, Math.min(MINIMAP_HEIGHT, (e.clientY - rect.top) * MINIMAP_HEIGHT / (rect.height || MINIMAP_HEIGHT)));

    const worldTarget = mapToWorld(mapX, mapY);

    // Center screen on clicked world point
    const newViewportX = visibleCanvasWidth / 2 - worldTarget.x * viewport.zoom;
    const newViewportY = canvasSize.height / 2 - worldTarget.y * viewport.zoom;

    onViewportChange({
      ...viewport,
      x: Math.round(newViewportX),
      y: Math.round(newViewportY),
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType !== "touch") return;
    if (activePointerRef.current !== null) return;
    e.preventDefault();
    e.stopPropagation();
    activePointerRef.current = e.pointerId;
    setDragBounds(bounds);
    try {
      mapRef.current?.setPointerCapture?.(e.pointerId);
    } catch {}
    handlePointerAction(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePointerRef.current === e.pointerId) {
      handlePointerAction(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activePointerRef.current === e.pointerId) {
      activePointerRef.current = null;
      setDragBounds(null);
      try {
        mapRef.current?.releasePointerCapture?.(e.pointerId);
      } catch {}
    }
  };

  return (
    <aside
      style={rightInset ? { right: rightInset + 16, bottom: 96 } : undefined}
      ref={asideRef}
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
          aria-expanded={isOpen}
          aria-controls={isOpen ? mapId : undefined}
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
          id={mapId}
          role="region"
          aria-label="Canvas overview. Click or drag to navigate."
          aria-describedby={`${mapId}-help`}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onLostPointerCapture={handlePointerUp}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 160 : 48;
            const delta: Record<string, { x: number; y: number }> = {
              ArrowLeft: { x: step, y: 0 }, ArrowRight: { x: -step, y: 0 },
              ArrowUp: { x: 0, y: step }, ArrowDown: { x: 0, y: -step },
            };
            if (!delta[e.key] || e.ctrlKey || e.metaKey || e.altKey) return;
            e.preventDefault();
            e.stopPropagation();
            onViewportChange({ ...viewport, x: viewport.x + delta[e.key].x, y: viewport.y + delta[e.key].y });
          }}
          style={{ width: `${MINIMAP_WIDTH}px`, height: `${MINIMAP_HEIGHT}px` }}
          className="relative overflow-hidden rounded-2xl border border-neutral-200/90 bg-white/95 shadow-xl backdrop-blur-xl select-none touch-none cursor-crosshair focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-[#283548] dark:bg-[#161d27]/95"
        >
          <span id={`${mapId}-help`} className="sr-only pointer-events-none">
            Use arrow keys to pan the canvas. Hold Shift to pan further.
          </span>
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
            const dimensions = getNodeDimensions(node);
            const w = Math.max(6, dimensions.width * mapScale);
            const h = Math.max(4, dimensions.height * mapScale);
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
                  node.node_type === "group"
                    ? "border border-dashed border-blue-400/80 bg-blue-400/10"
                    : node.node_type === "annotation"
                    ? "bg-yellow-300 ring-1 ring-yellow-500/50"
                    : isDone
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
            data-testid="minimap-viewport"
            className="absolute rounded-sm border-2 border-blue-500 bg-blue-500/10 pointer-events-none shadow-xs dark:border-emerald-400 dark:bg-emerald-400/15"
          />
        </div>
      )}
    </aside>
  );
}
