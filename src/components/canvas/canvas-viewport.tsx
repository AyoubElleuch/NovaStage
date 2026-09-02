"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { CanvasViewport, CanvasTool } from "@/lib/canvas/types";
import { screenToWorld } from "@/lib/canvas/coordinate-math";
import { useTheme } from "@/lib/theme-context";

interface CanvasViewportProps {
  viewport: CanvasViewport;
  onViewportChange: (newViewport: CanvasViewport) => void;
  activeTool: CanvasTool;
  isDraggingNode: boolean;
  selectionMarquee?: { startX: number; startY: number; currentX: number; currentY: number } | null;
  children: React.ReactNode;
  onCanvasClick?: (worldPos: { x: number; y: number }) => void;
  onPointerMove?: (worldPos: { x: number; y: number }, screenPos: { x: number; y: number }) => void;
  onMarqueeStart?: (worldPos: { x: number; y: number }, screenPos: { x: number; y: number }) => void;
  onMarqueeChange?: (worldPos: { x: number; y: number }, screenPos: { x: number; y: number }) => void;
  onMarqueeEnd?: () => void;
}

export default function CanvasViewportContainer({
  viewport,
  onViewportChange,
  activeTool,
  isDraggingNode,
  selectionMarquee,
  children,
  onCanvasClick,
  onPointerMove,
  onMarqueeStart,
  onMarqueeChange,
  onMarqueeEnd,
}: CanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isMarqueeDragging, setIsMarqueeDragging] = useState(false);

  // Multi-touch tracking for pinch-to-zoom & smooth touch pan
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStateRef = useRef<{
    initialDistance: number;
    initialZoom: number;
    initialMidpoint: { x: number; y: number };
    initialViewport: CanvasViewport;
  } | null>(null);
  const dragDistanceRef = useRef(0);

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
    // Only pan or marquee if clicking on the background canvas (not a node/button)
    const isBackground =
      e.target === containerRef.current ||
      (e.target as HTMLElement).getAttribute("data-canvas-bg") === "true";

    if (!isBackground) return;

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-touch pinch-to-zoom start
    if (activePointersRef.current.size === 2) {
      setIsPanning(false);
      setIsMarqueeDragging(false);
      const [p1, p2] = Array.from(activePointersRef.current.values());
      const initialDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const initialMidpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      pinchStateRef.current = {
        initialDistance,
        initialZoom: viewport.zoom,
        initialMidpoint,
        initialViewport: { ...viewport },
      };
      try {
        containerRef.current?.setPointerCapture(e.pointerId);
      } catch {}
      return;
    }

    if (activePointersRef.current.size > 2) return;

    dragDistanceRef.current = 0;
    const isTouch = e.pointerType === "touch";
    const shouldPan =
      activeTool === "hand" ||
      isSpacePressed ||
      e.button === 1 ||
      (e.button === 0 && e.altKey) ||
      isTouch;

    if (shouldPan) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      try {
        containerRef.current?.setPointerCapture(e.pointerId);
      } catch {}
    } else if (e.button === 0 && (activeTool === "select" || e.shiftKey)) {
      // Marquee selection start
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPos = screenToWorld(screenX, screenY, viewport);

      setIsMarqueeDragging(true);
      onMarqueeStart?.(worldPos, { x: e.clientX, y: e.clientY });
      try {
        containerRef.current?.setPointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // 2-Finger Pinch Zoom & Pan
    if (activePointersRef.current.size === 2 && pinchStateRef.current && containerRef.current) {
      const [p1, p2] = Array.from(activePointersRef.current.values());
      const currentDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const currentMidpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      const rect = containerRef.current.getBoundingClientRect();
      const initialMidScreen = {
        x: pinchStateRef.current.initialMidpoint.x - rect.left,
        y: pinchStateRef.current.initialMidpoint.y - rect.top,
      };
      const currentMidScreen = {
        x: currentMidpoint.x - rect.left,
        y: currentMidpoint.y - rect.top,
      };

      const scale = currentDistance / (pinchStateRef.current.initialDistance || 1);
      const newZoom = Math.min(Math.max(pinchStateRef.current.initialZoom * scale, 0.15), 2.5);

      const worldMidX =
        (initialMidScreen.x - pinchStateRef.current.initialViewport.x) /
        pinchStateRef.current.initialZoom;
      const worldMidY =
        (initialMidScreen.y - pinchStateRef.current.initialViewport.y) /
        pinchStateRef.current.initialZoom;

      const newX = currentMidScreen.x - worldMidX * newZoom;
      const newY = currentMidScreen.y - worldMidY * newZoom;

      onViewportChange({ x: newX, y: newY, zoom: newZoom });
      return;
    }

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = screenToWorld(screenX, screenY, viewport);

    onPointerMove?.(worldPos, { x: e.clientX, y: e.clientY });

    if (isPanning) {
      dragDistanceRef.current += 1;
      onViewportChange({
        ...viewport,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (isMarqueeDragging) {
      onMarqueeChange?.(worldPos, { x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);

    if (activePointersRef.current.size < 2) {
      pinchStateRef.current = null;
    }

    if (isPanning) {
      setIsPanning(false);
      try {
        containerRef.current?.releasePointerCapture(e.pointerId);
      } catch {}
    }
    if (isMarqueeDragging) {
      setIsMarqueeDragging(false);
      onMarqueeEnd?.();
      try {
        containerRef.current?.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const isBackground =
      e.target === containerRef.current ||
      (e.target as HTMLElement).getAttribute("data-canvas-bg") === "true";

    if (isBackground && !isPanning && !isMarqueeDragging && containerRef.current && dragDistanceRef.current < 8) {
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

  // Compute selection marquee world box if present
  let marqueeStyle: React.CSSProperties | null = null;
  if (selectionMarquee) {
    const minX = Math.min(selectionMarquee.startX, selectionMarquee.currentX);
    const minY = Math.min(selectionMarquee.startY, selectionMarquee.currentY);
    const w = Math.abs(selectionMarquee.currentX - selectionMarquee.startX);
    const h = Math.abs(selectionMarquee.currentY - selectionMarquee.startY);
    marqueeStyle = {
      left: `${minX}px`,
      top: `${minY}px`,
      width: `${w}px`,
      height: `${h}px`,
    };
  }

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const dotColor = isDark
    ? `rgba(255, 255, 255, ${Math.min(0.2, Math.max(0.06, viewport.zoom * 0.12))})`
    : `rgba(160, 150, 140, ${Math.min(0.25, Math.max(0.08, viewport.zoom * 0.18))})`;

  return (
    <div
      ref={containerRef}
      data-canvas-bg="true"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      className={`relative h-full w-full select-none overflow-hidden bg-[#faf8f5] dark:bg-[#10151f] touch-none ${cursorClass}`}
      style={{
        backgroundImage: `
          radial-gradient(circle, ${dotColor} 1px, transparent 1px)
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

          {/* Marquee Selection Rectangle Box */}
          {marqueeStyle && (
            <div
              style={marqueeStyle}
              className="absolute rounded-sm border border-blue-500 bg-blue-500/10 pointer-events-none shadow-xs z-30"
            />
          )}
        </div>
      </div>
    </div>
  );
}
