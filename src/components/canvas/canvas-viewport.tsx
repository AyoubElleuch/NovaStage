"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { CanvasViewport, CanvasTool } from "@/lib/canvas/types";
import { screenToWorld } from "@/lib/canvas/coordinate-math";

interface CanvasViewportProps {
  viewport: CanvasViewport;
  onViewportChange: (newViewport: CanvasViewport) => void;
  activeTool: CanvasTool;
  isDraggingNode: boolean;
  children: React.ReactNode;
  onCanvasClick?: (worldPos: { x: number; y: number }) => void;
  onPointerMove?: (worldPos: { x: number; y: number }, screenPos: { x: number; y: number }) => void;
}

export default function CanvasViewportContainer({
  viewport,
  onViewportChange,
  activeTool,
  isDraggingNode,
  children,
  onCanvasClick,
  onPointerMove,
}: CanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Keyboard Spacebar for Pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !isSpacePressed &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSpacePressed]);

  // Mouse Wheel Zoom centered around pointer
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!containerRef.current) return;
      e.preventDefault();

      const rect = containerRef.current.getBoundingClientRect();
      const mouseScreenX = e.clientX - rect.left;
      const mouseScreenY = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        // Pinch / Ctrl + Wheel Zoom
        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.15), 2.5);

        const newX = mouseScreenX - (mouseScreenX - viewport.x) * (newZoom / viewport.zoom);
        const newY = mouseScreenY - (mouseScreenY - viewport.y) * (newZoom / viewport.zoom);

        onViewportChange({ x: newX, y: newY, zoom: newZoom });
      } else {
        // Standard Trackpad 2-finger pan or Shift+Wheel
        const dx = e.shiftKey ? e.deltaY : e.deltaX;
        const dy = e.shiftKey ? 0 : e.deltaY;
        onViewportChange({
          ...viewport,
          x: viewport.x - dx,
          y: viewport.y - dy,
        });
      }
    },
    [viewport, onViewportChange]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only pan if clicking on the background canvas (not a node/button)
    const isBackground =
      e.target === containerRef.current ||
      (e.target as HTMLElement).getAttribute("data-canvas-bg") === "true";

    const shouldPan =
      isBackground &&
      (activeTool === "hand" || isSpacePressed || e.button === 1 || e.button === 0);

    if (shouldPan) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      containerRef.current?.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = screenToWorld(screenX, screenY, viewport);

    onPointerMove?.(worldPos, { x: e.clientX, y: e.clientY });

    if (isPanning) {
      onViewportChange({
        ...viewport,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      try {
        containerRef.current?.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const isBackground =
      e.target === containerRef.current ||
      (e.target as HTMLElement).getAttribute("data-canvas-bg") === "true";

    if (isBackground && !isPanning && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPos = screenToWorld(screenX, screenY, viewport);
      onCanvasClick?.(worldPos);
    }
  };

  const cursorClass =
    isPanning || (activeTool === "hand" && !isDraggingNode)
      ? "cursor-grabbing"
      : isSpacePressed || activeTool === "hand"
      ? "cursor-grab"
      : activeTool === "add_node"
      ? "cursor-crosshair"
      : activeTool === "link"
      ? "cursor-cell"
      : "cursor-default";

  // Dynamic grid scaling with zoom
  const gridSize = 24 * viewport.zoom;
  const gridOffsetX = viewport.x % gridSize;
  const gridOffsetY = viewport.y % gridSize;

  return (
    <div
      ref={containerRef}
      data-canvas-bg="true"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      className={`relative h-full w-full select-none overflow-hidden bg-[#faf8f5] ${cursorClass}`}
      style={{
        backgroundImage: `
          radial-gradient(circle, rgba(160, 150, 140, ${Math.min(0.25, Math.max(0.08, viewport.zoom * 0.18))}) 1px, transparent 1px)
        `,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
      }}
    >
      {/* World Transform Layer */}
      <div
        data-canvas-bg="true"
        className="absolute top-0 left-0 h-full w-full origin-top-left pointer-events-none"
        style={{
          transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.zoom})`,
          willChange: isPanning || isDraggingNode ? "transform" : "auto",
        }}
      >
        <div className="relative h-0 w-0 pointer-events-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
