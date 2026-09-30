"use client";

import React, { useRef, useState, useCallback, useEffect, useId } from "react";
import { CanvasViewport, CanvasTool } from "@/lib/canvas/types";
import { screenToWorld } from "@/lib/canvas/coordinate-math";
import { useTheme } from "@/lib/theme-context";

const CTRL_WHEEL_ZOOM_SENSITIVITY = 0.0025;
const INTERACTIVE_SELECTOR = "button, input, textarea, select, a, [contenteditable='true'], [data-canvas-ui]";

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
  const navigationHelpId = useId();
  const viewportRef = useRef(viewport);
  useEffect(() => { viewportRef.current = viewport; }, [viewport]);
  const updateViewport = useCallback((next: CanvasViewport) => {
    viewportRef.current = next;
    onViewportChange(next);
  }, [onViewportChange]);
  const [isPanning, setIsPanning] = useState(false);
  const gestureRef = useRef<{
    mode: "pan" | "marquee";
    pointerId: number;
    start: { x: number; y: number };
    initialViewport: CanvasViewport;
  } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Multi-touch tracking for pinch-to-zoom & smooth touch pan
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStateRef = useRef<{
    initialDistance: number;
    initialZoom: number;
    initialMidpoint: { x: number; y: number };
    initialViewport: CanvasViewport;
  } | null>(null);
  const dragDistanceRef = useRef(0);
  const marqueeDistanceRef = useRef(0);
  const justFinishedMarqueeRef = useRef(false);
  const getScreenPoint = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    const rect = container?.getBoundingClientRect();
    if (!container || !rect) return { x: clientX, y: clientY };
    const scaleX = container.clientWidth ? rect.width / container.clientWidth : 1;
    const scaleY = container.clientHeight ? rect.height / container.clientHeight : 1;
    return { x: (clientX - rect.left) / (scaleX || 1), y: (clientY - rect.top) / (scaleY || 1) };
  }, []);

  // Keyboard Spacebar for Pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !isSpacePressed &&
        containerRef.current?.contains(e.target as Node) &&
        !(e.target instanceof Element && e.target.closest(INTERACTIVE_SELECTOR))
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
    const handleBlur = () => {
      setIsSpacePressed(false);
      setIsPanning(false);
      if (gestureRef.current?.mode === "marquee") onMarqueeEnd?.();
      gestureRef.current = null;
      activePointersRef.current.clear();
      pinchStateRef.current = null;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isSpacePressed, onMarqueeEnd]);

  // Mouse Wheel Zoom centered around pointer
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!containerRef.current) return;
      if (!e.ctrlKey && !e.metaKey && e.target instanceof Element && e.target.closest("[data-canvas-scroll]")) return;
      e.preventDefault();
      const viewport = viewportRef.current;
      const deltaScale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? containerRef.current.clientHeight : 1;
      const deltaX = e.deltaX * deltaScale;
      const deltaY = e.deltaY * deltaScale;

      const mouseScreen = getScreenPoint(e.clientX, e.clientY);
      const mouseScreenX = mouseScreen.x;
      const mouseScreenY = mouseScreen.y;

      if (e.ctrlKey || e.metaKey) {
        // Pinch / Ctrl + Wheel Zoom
        const zoomFactor = Math.exp(
          -Math.max(-100, Math.min(100, deltaY)) * CTRL_WHEEL_ZOOM_SENSITIVITY
        );
        const newZoom = Math.min(Math.max(viewport.zoom * zoomFactor, 0.15), 2.5);

        const newX = mouseScreenX - (mouseScreenX - viewport.x) * (newZoom / viewport.zoom);
        const newY = mouseScreenY - (mouseScreenY - viewport.y) * (newZoom / viewport.zoom);

        updateViewport({ x: newX, y: newY, zoom: newZoom });
      } else {
        // Standard Trackpad 2-finger pan or Shift+Wheel
        const dx = e.shiftKey && deltaX === 0 ? deltaY : deltaX;
        const dy = e.shiftKey ? 0 : deltaY;
        updateViewport({
          ...viewport,
          x: viewport.x - dx,
          y: viewport.y - dy,
        });
      }
    },
    [getScreenPoint, updateViewport]
  );

  useEffect(() => {
    const container = containerRef.current;
    container?.addEventListener("wheel", handleWheel, { passive: false });
    return () => container?.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only pan or marquee if clicking on the background canvas (not a node/button)
    const isBackground =
      e.target === containerRef.current ||
      (e.target as HTMLElement).getAttribute("data-canvas-bg") === "true";

    const isTouch = e.pointerType === "touch";
    // A fresh node interaction must not inherit click suppression from an earlier canvas drag.
    if (!activePointersRef.current.size && (e.button === 0 || isTouch)) {
      dragDistanceRef.current = 0;
      marqueeDistanceRef.current = 0;
      justFinishedMarqueeRef.current = false;
    }
    const shouldPan = activeTool === "hand" || isSpacePressed || e.button === 1 ||
      (e.button === 0 && e.altKey) || (isTouch && isBackground);
    if (!isBackground && !shouldPan) return;
    // Keep controls inside cards usable, including when the hand tool is active.
    if (!isBackground && e.target instanceof Element &&
      e.target.closest(INTERACTIVE_SELECTOR)) return;
    if (!isTouch && e.button !== 0 && e.button !== 1) return;
    if (activePointersRef.current.size >= 2) return;
    if (shouldPan) {
      e.stopPropagation();
      if (!isTouch) e.preventDefault();
    }

    const screenPoint = getScreenPoint(e.clientX, e.clientY);
    if (isBackground) containerRef.current?.focus({ preventScroll: true });
    activePointersRef.current.set(e.pointerId, screenPoint);
    const currentViewport = viewportRef.current;

    // Multi-touch pinch-to-zoom start
    if (activePointersRef.current.size === 2) {
      dragDistanceRef.current = 10;
      setIsPanning(false);
      if (gestureRef.current?.mode === "marquee") onMarqueeEnd?.();
      gestureRef.current = null;
      const [p1, p2] = Array.from(activePointersRef.current.values());
      const initialDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const initialMidpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      pinchStateRef.current = {
        initialDistance,
        initialZoom: currentViewport.zoom,
        initialMidpoint,
        initialViewport: { ...currentViewport },
      };
      try {
        containerRef.current?.setPointerCapture(e.pointerId);
      } catch {}
      return;
    }

    if (activePointersRef.current.size > 2) return;

    dragDistanceRef.current = 0;
    marqueeDistanceRef.current = 0;
    justFinishedMarqueeRef.current = false;
    if (shouldPan) {
      setIsPanning(true);
      gestureRef.current = {
        mode: "pan", pointerId: e.pointerId, start: screenPoint, initialViewport: currentViewport,
      };
      try {
        containerRef.current?.setPointerCapture(e.pointerId);
      } catch {}
    } else if (e.button === 0 && (activeTool === "select" || e.shiftKey)) {
      // Marquee selection start
      if (!containerRef.current) return;
      const screenX = screenPoint.x;
      const screenY = screenPoint.y;
      const worldPos = screenToWorld(screenX, screenY, currentViewport);

      gestureRef.current = {
        mode: "marquee", pointerId: e.pointerId, start: screenPoint, initialViewport: currentViewport,
      };
      onMarqueeStart?.(worldPos, { x: e.clientX, y: e.clientY });
      try {
        containerRef.current?.setPointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, getScreenPoint(e.clientX, e.clientY));
    }

    // 2-Finger Pinch Zoom & Pan
    if (activePointersRef.current.size === 2 && pinchStateRef.current && containerRef.current) {
      const [p1, p2] = Array.from(activePointersRef.current.values());
      const currentDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const currentMidpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      const initialMidScreen = {
        x: pinchStateRef.current.initialMidpoint.x,
        y: pinchStateRef.current.initialMidpoint.y,
      };
      const currentMidScreen = {
        x: currentMidpoint.x,
        y: currentMidpoint.y,
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

      updateViewport({ x: newX, y: newY, zoom: newZoom });
      return;
    }

    if (!containerRef.current) return;
    const screen = getScreenPoint(e.clientX, e.clientY);
    const screenX = screen.x;
    const screenY = screen.y;
    const currentViewport = viewportRef.current;
    const worldPos = screenToWorld(screenX, screenY, currentViewport);

    onPointerMove?.(worldPos, { x: e.clientX, y: e.clientY });

    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== e.pointerId) return;
    const dx = screenX - gesture.start.x;
    const dy = screenY - gesture.start.y;
    if (gesture.mode === "pan") {
      dragDistanceRef.current = Math.max(dragDistanceRef.current, Math.hypot(dx, dy));
      updateViewport({
        ...currentViewport,
        x: gesture.initialViewport.x + dx,
        y: gesture.initialViewport.y + dy,
      });
    } else {
      marqueeDistanceRef.current = Math.max(marqueeDistanceRef.current, Math.hypot(dx, dy));
      onMarqueeChange?.(worldPos, { x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.delete(e.pointerId);
    try {
      containerRef.current?.releasePointerCapture(e.pointerId);
    } catch {}

    if (activePointersRef.current.size === 1 && pinchStateRef.current) {
      pinchStateRef.current = null;
      const [pointerId, remaining] = Array.from(activePointersRef.current.entries())[0];
      gestureRef.current = {
        mode: "pan", pointerId, start: remaining, initialViewport: viewportRef.current,
      };
      setIsPanning(true);
      return;
    }

    if (activePointersRef.current.size < 2) {
      pinchStateRef.current = null;
    }

    setIsPanning(false);
    if (gestureRef.current?.mode === "marquee") {
      onMarqueeEnd?.();
      if (marqueeDistanceRef.current > 4) {
        justFinishedMarqueeRef.current = true;
      }
    }
    gestureRef.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (e.target instanceof Element && e.target.closest(INTERACTIVE_SELECTOR)) return;
    if (activeTool === "hand" || isSpacePressed || e.altKey || dragDistanceRef.current > 4) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const isBackground =
      e.target === containerRef.current ||
      (e.target as HTMLElement).getAttribute("data-canvas-bg") === "true";

    if (justFinishedMarqueeRef.current || marqueeDistanceRef.current > 4) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (isBackground && !gestureRef.current && containerRef.current && dragDistanceRef.current < 8) {
      const screen = getScreenPoint(e.clientX, e.clientY);
      const screenX = screen.x;
      const screenY = screen.y;
      const worldPos = screenToWorld(screenX, screenY, viewportRef.current);
      onCanvasClick?.(worldPos);
    }
  };

  const cursorClass =
    isPanning
      ? "cursor-grabbing"
      : isSpacePressed || activeTool === "hand"
      ? "cursor-grab"
      : activeTool === "add_node"
      ? "cursor-crosshair"
      : activeTool === "link"
      ? "cursor-cell"
      : "cursor-default";

  // Dynamic grid scaling with zoom
  const gridMultiplier = 2 ** Math.max(0, Math.ceil(Math.log2(0.65 / viewport.zoom)));
  const gridSize = 24 * viewport.zoom * gridMultiplier;
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
      data-canvas-viewport="true"
      role="region"
      aria-label="Interactive canvas"
      aria-describedby={navigationHelpId}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget || e.ctrlKey || e.metaKey || e.altKey) return;
        const current = viewportRef.current;
        const step = e.shiftKey ? 128 : 48;
        const movement: Record<string, { x: number; y: number }> = {
          ArrowLeft: { x: step, y: 0 }, ArrowRight: { x: -step, y: 0 },
          ArrowUp: { x: 0, y: step }, ArrowDown: { x: 0, y: -step },
        };
        if (movement[e.key]) {
          e.preventDefault();
          e.stopPropagation();
          updateViewport({ ...current, x: current.x + movement[e.key].x, y: current.y + movement[e.key].y });
        } else if (["+", "=", "-", "_"].includes(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          const zoom = Math.max(0.15, Math.min(2.5, current.zoom * (e.key === "-" || e.key === "_" ? 1 / 1.2 : 1.2)));
          const x = e.currentTarget.clientWidth / 2;
          const y = e.currentTarget.clientHeight / 2;
          updateViewport({ x: x - (x - current.x) * zoom / current.zoom, y: y - (y - current.y) * zoom / current.zoom, zoom });
        }
      }}
      onPointerDownCapture={handlePointerDown}
      onPointerMoveCapture={handlePointerMove}
      onPointerUpCapture={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onLostPointerCapture={handlePointerUp}
      onClickCapture={handleClick}
      className={`relative h-full w-full select-none overflow-hidden bg-[#faf8f5] dark:bg-[#10151f] touch-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500 ${cursorClass}`}
      style={{
        backgroundImage: `
          radial-gradient(circle, ${dotColor} 1px, transparent 1px)
        `,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
      }}
    >
      <span id={navigationHelpId} className="sr-only pointer-events-none">
        Use arrow keys to pan, plus and minus to zoom, or hold Space while dragging to pan.
      </span>
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
