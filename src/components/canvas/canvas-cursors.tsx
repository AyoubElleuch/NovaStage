"use client";

import React, { useEffect, useRef } from "react";
import { CollaboratorPresence } from "@/lib/canvas/types";

interface CanvasCursorsProps {
  collaborators: CollaboratorPresence[];
  currentUserId: string;
}

interface CursorPhysicsState {
  currX: number;
  currY: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  lastPacketTime: number;
  opacity: number;
}

export default function CanvasCursors({
  collaborators,
  currentUserId,
}: CanvasCursorsProps) {
  const otherUsers = collaborators.filter(
    (c) => c.userId !== currentUserId
  );

  // Store physics / interpolation state per user without triggering React re-renders
  const physicsMapRef = useRef<Map<string, CursorPhysicsState>>(new Map());
  const domRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const animFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Update physics targets whenever collaborator props change
  useEffect(() => {
    const now = performance.now();
    const map = physicsMapRef.current;

    for (const c of otherUsers) {
      if (!c.cursor) continue;

      const existing = map.get(c.userId);
      if (!existing) {
        // Initial spawn: place directly at target
        map.set(c.userId, {
          currX: c.cursor.x,
          currY: c.cursor.y,
          targetX: c.cursor.x,
          targetY: c.cursor.y,
          vx: 0,
          vy: 0,
          lastPacketTime: now,
          opacity: 1,
        });
      } else {
        // Calculate velocity delta for dead-reckoning extrapolation
        const dt = Math.max((now - existing.lastPacketTime) / 1000, 0.016);
        const vx = (c.cursor.x - existing.targetX) / dt;
        const vy = (c.cursor.y - existing.targetY) / dt;

        existing.targetX = c.cursor.x;
        existing.targetY = c.cursor.y;
        existing.vx = Number.isFinite(vx) ? vx : 0;
        existing.vy = Number.isFinite(vy) ? vy : 0;
        existing.lastPacketTime = now;
        existing.opacity = 1;
      }
    }

    // Clean up users who left presence
    const activeIds = new Set(otherUsers.map((u) => u.userId));
    for (const key of map.keys()) {
      if (!activeIds.has(key)) {
        map.delete(key);
      }
    }
  }, [otherUsers]);

  // High-performance 60fps requestAnimationFrame interpolation loop
  useEffect(() => {
    lastFrameTimeRef.current = performance.now();

    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastFrameTimeRef.current) / 1000, 0.1); // Clamp to max 100ms
      lastFrameTimeRef.current = timestamp;

      const map = physicsMapRef.current;
      const doms = domRefs.current;

      map.forEach((state, userId) => {
        const el = doms.get(userId);
        if (!el) return;

        const timeSincePacket = timestamp - state.lastPacketTime;

        // 1. Stale presence fadeout (> 3500ms without packet)
        if (timeSincePacket > 3500) {
          state.opacity = Math.max(0, state.opacity - dt * 2.5);
        } else {
          state.opacity = Math.min(1, state.opacity + dt * 5);
        }

        if (state.opacity <= 0) {
          el.style.display = "none";
          return;
        }

        el.style.display = "block";
        el.style.opacity = state.opacity.toFixed(3);

        // 2. Exponential Spring Lerp interpolation (Delta-time compensated)
        // Lerp speed coefficient: 24 gives responsive, smooth glide without overshoot
        const lerpFactor = 1 - Math.exp(-24 * dt);
        state.currX += (state.targetX - state.currX) * lerpFactor;
        state.currY += (state.targetY - state.currY) * lerpFactor;

        // 3. Dead-reckoning for delayed packets (jitter buffer between 45ms and 160ms)
        if (timeSincePacket > 45 && timeSincePacket < 160) {
          const decay = Math.exp(-12 * (timeSincePacket - 45) / 1000);
          state.currX += state.vx * dt * 0.35 * decay;
          state.currY += state.vy * dt * 0.35 * decay;
        }

        // Apply fast GPU transform directly to DOM
        el.style.transform = `translate3d(${state.currX.toFixed(1)}px, ${state.currY.toFixed(1)}px, 0)`;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  if (otherUsers.length === 0) return null;

  return (
    <div className="pointer-events-none absolute top-0 left-0 h-0 w-0 overflow-visible z-30">
      {otherUsers.map((c) => (
        <div
          key={c.userId}
          ref={(node) => {
            if (node) {
              domRefs.current.set(c.userId, node);
            } else {
              domRefs.current.delete(c.userId);
            }
          }}
          className="absolute top-0 left-0 will-change-transform"
          style={{
            display: c.cursor ? "block" : "none",
            transform: c.cursor
              ? `translate3d(${c.cursor.x}px, ${c.cursor.y}px, 0)`
              : undefined,
          }}
        >
          {/* Custom Pointer SVG with User Glow */}
          <svg
            className="h-5 w-5 drop-shadow-md"
            viewBox="0 0 24 24"
            fill={c.color}
            stroke="white"
            strokeWidth="1.5"
          >
            <polygon points="3 3 10 21 14 14 21 10 3 3" />
          </svg>

          {/* Collaborator Name Tag Pill */}
          <div
            className="mt-1 flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-md whitespace-nowrap transition-all"
            style={{ backgroundColor: c.color }}
          >
            <span>{c.fullName || c.email?.split("@")[0] || "Collaborator"}</span>
            {c.latencyMs && c.latencyMs > 250 && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse"
                title={`Slow connection (${c.latencyMs}ms)`}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
