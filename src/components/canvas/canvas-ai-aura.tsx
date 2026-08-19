"use client";

import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface CanvasAIAuraProps {
  generatingUserName?: string | null;
  isExiting?: boolean;
  onExitComplete?: () => void;
}

// Premium aura blob configurations — each has unique position, color, size, and drift animation
const AURA_BLOBS = [
  {
    color: "rgba(139, 92, 246, 0.18)",   // violet
    size: "45%",
    initialX: "15%",
    initialY: "20%",
    animationName: "auraDrift1",
    duration: "12s",
    delay: "0s",
  },
  {
    color: "rgba(6, 182, 212, 0.15)",     // cyan
    size: "40%",
    initialX: "60%",
    initialY: "15%",
    animationName: "auraDrift2",
    duration: "14s",
    delay: "0.1s",
  },
  {
    color: "rgba(236, 72, 153, 0.16)",    // magenta
    size: "38%",
    initialX: "40%",
    initialY: "55%",
    animationName: "auraDrift3",
    duration: "11s",
    delay: "0.2s",
  },
  {
    color: "rgba(245, 158, 11, 0.12)",    // amber
    size: "35%",
    initialX: "75%",
    initialY: "60%",
    animationName: "auraDrift4",
    duration: "15s",
    delay: "0.3s",
  },
  {
    color: "rgba(16, 185, 129, 0.14)",    // emerald
    size: "42%",
    initialX: "25%",
    initialY: "70%",
    animationName: "auraDrift5",
    duration: "13s",
    delay: "0.15s",
  },
];

export default function CanvasAIAura({
  generatingUserName,
  isExiting = false,
  onExitComplete,
}: CanvasAIAuraProps) {
  const [hasEntered, setHasEntered] = useState(false);

  // Transition from entering → active after entrance animation completes
  useEffect(() => {
    const timer = setTimeout(() => setHasEntered(true), 650);
    return () => clearTimeout(timer);
  }, []);

  // Derive current phase from props and internal state — no synchronous setState in effects
  const phase: "entering" | "active" | "exiting" = isExiting
    ? "exiting"
    : hasEntered
    ? "active"
    : "entering";

  // Fire exit callback after exit animation completes
  useEffect(() => {
    if (phase === "exiting") {
      const timer = setTimeout(() => {
        onExitComplete?.();
      }, 550);
      return () => clearTimeout(timer);
    }
  }, [phase, onExitComplete]);

  const overlayOpacity =
    phase === "entering" ? "opacity-0" :
    phase === "exiting" ? "opacity-0" :
    "opacity-100";

  const blobScale =
    phase === "entering" ? "scale-[0.3]" :
    phase === "exiting" ? "scale-[0.4]" :
    "scale-100";

  return (
    <>
      {/* Inline keyframes for organic aura drift — pure CSS, no libraries */}
      <style>{`
        @keyframes auraDrift1 {
          0%, 100% { transform: translate(-50%, -50%) translate(0, 0) scale(1); }
          20% { transform: translate(-50%, -50%) translate(8%, -12%) scale(1.08); }
          40% { transform: translate(-50%, -50%) translate(-5%, 8%) scale(0.95); }
          60% { transform: translate(-50%, -50%) translate(12%, 5%) scale(1.12); }
          80% { transform: translate(-50%, -50%) translate(-8%, -6%) scale(0.98); }
        }
        @keyframes auraDrift2 {
          0%, 100% { transform: translate(-50%, -50%) translate(0, 0) scale(1); }
          25% { transform: translate(-50%, -50%) translate(-10%, 6%) scale(1.05); }
          50% { transform: translate(-50%, -50%) translate(6%, -10%) scale(0.92); }
          75% { transform: translate(-50%, -50%) translate(-4%, 12%) scale(1.1); }
        }
        @keyframes auraDrift3 {
          0%, 100% { transform: translate(-50%, -50%) translate(0, 0) scale(1); }
          15% { transform: translate(-50%, -50%) translate(10%, 8%) scale(1.06); }
          45% { transform: translate(-50%, -50%) translate(-8%, -5%) scale(0.94); }
          70% { transform: translate(-50%, -50%) translate(5%, -12%) scale(1.08); }
          90% { transform: translate(-50%, -50%) translate(-6%, 4%) scale(1.02); }
        }
        @keyframes auraDrift4 {
          0%, 100% { transform: translate(-50%, -50%) translate(0, 0) scale(1); }
          30% { transform: translate(-50%, -50%) translate(-12%, -8%) scale(1.1); }
          55% { transform: translate(-50%, -50%) translate(8%, 10%) scale(0.93); }
          80% { transform: translate(-50%, -50%) translate(-3%, -5%) scale(1.04); }
        }
        @keyframes auraDrift5 {
          0%, 100% { transform: translate(-50%, -50%) translate(0, 0) scale(1); }
          20% { transform: translate(-50%, -50%) translate(6%, -8%) scale(1.07); }
          50% { transform: translate(-50%, -50%) translate(-10%, 6%) scale(0.96); }
          75% { transform: translate(-50%, -50%) translate(8%, 10%) scale(1.05); }
        }
        @keyframes auraPulseLabel {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes auraShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      {/* Full canvas overlay — blocks all pointer events, sits above viewport (z-10) but below HUD/dock (z-20) */}
      <div
        className={`absolute inset-0 z-10 overflow-hidden transition-opacity duration-[600ms] ease-out ${overlayOpacity}`}
        style={{ pointerEvents: "all" }}
        aria-live="polite"
        aria-label="AI is generating workflow — canvas interactions are paused"
      >
        {/* Very subtle darkened frosted glass backdrop */}
        <div
          className={`absolute inset-0 transition-all duration-[600ms] ease-out ${
            phase === "exiting" ? "backdrop-blur-0 bg-transparent" : "backdrop-blur-[2px] bg-black/[0.03]"
          }`}
        />

        {/* Animated aura blobs */}
        {AURA_BLOBS.map((blob, i) => (
          <div
            key={i}
            className={`absolute rounded-full transition-all duration-[600ms] ease-out ${blobScale}`}
            style={{
              width: blob.size,
              height: blob.size,
              left: blob.initialX,
              top: blob.initialY,
              background: `radial-gradient(circle at center, ${blob.color}, transparent 70%)`,
              animation:
                phase === "active"
                  ? `${blob.animationName} ${blob.duration} ease-in-out infinite`
                  : "none",
              animationDelay: blob.delay,
              willChange: "transform",
              transform: "translate(-50%, -50%)",
              filter: "blur(40px)",
              mixBlendMode: "normal",
              transitionDelay: phase === "entering" ? `${i * 100}ms` : "0ms",
            }}
          />
        ))}

        {/* Premium center status pill */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`flex items-center gap-2.5 rounded-2xl border border-white/30 bg-white/80 px-5 py-2.5 shadow-2xl backdrop-blur-xl transition-all duration-500 ease-out ${
              phase === "entering"
                ? "opacity-0 scale-90 translate-y-2"
                : phase === "exiting"
                ? "opacity-0 scale-90 translate-y-2"
                : "opacity-100 scale-100 translate-y-0"
            }`}
            style={{
              transitionDelay: phase === "entering" ? "300ms" : "0ms",
            }}
          >
            <span
              className="grid h-7 w-7 place-items-center rounded-xl"
              style={{
                background: "linear-gradient(135deg, #8B5CF6, #EC4899, #06B6D4)",
                animation: "auraShimmer 3s linear infinite",
                backgroundSize: "200% 100%",
              }}
            >
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </span>
            <div className="flex flex-col">
              <span
                className="text-xs font-semibold text-neutral-900 tracking-tight"
                style={{ animation: "auraPulseLabel 2s ease-in-out infinite" }}
              >
                AI is generating the workflow…
              </span>
              {generatingUserName && (
                <span className="text-[10px] text-neutral-500 font-medium">
                  Initiated by {generatingUserName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
