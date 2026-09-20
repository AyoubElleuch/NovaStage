"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { stageFrame, shouldTrigger, TRANSITION_DURATION, type StagePhase } from "./choreography";

export function useScrollChoreography() {
  const [phase, setPhase] = useState<StagePhase>("hero");
  const [revealed, setRevealed] = useState(false);
  const [atHero, setAtHero] = useState(true);
  const phaseRef = useRef<StagePhase>("hero");
  const revealedRef = useRef(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const unlockRef = useRef<(() => void) | null>(null);
  const afterRef = useRef<(() => void) | undefined>(undefined);
  const busy = phase === "forward";

  function begin(direction: "forward" | "reverse", after?: () => void) {
    if (direction === "reverse") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (phaseRef.current === "forward") return;
    if (revealedRef.current) { after?.(); return; }
    if (document.querySelector(".loading-screen, [aria-modal='true']")) return;
    phaseRef.current = direction;
    setPhase(direction);
    afterRef.current = after;
    window.scrollTo({ top: 0, behavior: "instant" });
    const documentOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    const bodyPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    unlockRef.current = () => {
      document.documentElement.style.overflow = documentOverflow;
      document.body.style.overflow = bodyOverflow;
      document.body.style.paddingRight = bodyPaddingRight;
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 0 : TRANSITION_DURATION;
    let start: number | null = null;
    const tick = (timestamp: number) => {
      start ??= timestamp;
      const elapsed = duration ? Math.min((timestamp - start) / duration, 1) : 1;
      const progress = elapsed;
      const frame = stageFrame(progress, Math.min(0.88, 1280 / window.innerWidth));
      const surface = surfaceRef.current;
      if (surface) {
        surface.style.setProperty("--curtain", `${frame.curtain}%`);
        surface.style.setProperty("--frame-scale", String(frame.scale));
        surface.style.setProperty("--frame-offset", `${frame.offset}px`);
        surface.style.setProperty("--assembly", String(frame.assembly));
        surface.dataset.revealed = String(frame.revealed);
      }
      if (elapsed < 1) { frameRef.current = requestAnimationFrame(tick); return; }
      phaseRef.current = "canvas";
      revealedRef.current = true;
      setPhase("canvas");
      setRevealed(true);
      setAtHero(false);
      unlockRef.current?.();
      unlockRef.current = null;
      frameRef.current = requestAnimationFrame(() => {
        document.getElementById("live-systems")?.scrollIntoView({ behavior: "instant" });
        document.getElementById("canvas-heading")?.focus({ preventScroll: true });
        afterRef.current?.();
      });
    };
    frameRef.current = requestAnimationFrame(tick);
  }

  const onInput = useEffectEvent((event: Event, delta: number) => {
    if (document.querySelector(".loading-screen, [aria-modal='true']")) return;
    const locked = phaseRef.current === "forward";
    if (locked || shouldTrigger(phaseRef.current, delta)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!locked) begin("forward");
    }
  });

  useEffect(() => {
    let touchY = 0;
    const wheel = (event: WheelEvent) => {
      if ((event.ctrlKey || event.metaKey) && phaseRef.current === "canvas") return;
      if (phaseRef.current === "canvas" && (event.target as Element)?.closest?.(".home-canvas-viewport[data-tool='hand']")) return;
      onInput(event, event.deltaY);
    };
    const touchStart = (event: TouchEvent) => { touchY = event.touches[0]?.clientY ?? 0; };
    const touchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1 && phaseRef.current === "canvas") return;
      if (phaseRef.current === "canvas" && (event.target as Element)?.closest?.(".home-canvas-viewport")) return;
      const currentY = event.touches[0]?.clientY ?? touchY;
      onInput(event, touchY - currentY);
      touchY = currentY;
    };
    const key = (event: KeyboardEvent) => {
      if (phaseRef.current === "forward") {
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      if ((event.target as HTMLElement)?.closest("input, textarea, select, button, a, [contenteditable='true']")) return;
      const delta = ["ArrowDown", "PageDown", "End"].includes(event.key) || (event.code === "Space" && !event.shiftKey) ? 10
        : ["ArrowUp", "PageUp", "Home"].includes(event.key) || (event.code === "Space" && event.shiftKey) ? -10 : 0;
      onInput(event, delta);
    };
    const scroll = () => {
      if (!revealedRef.current) return;
      const stage = document.getElementById("live-systems");
      const stageTop = stage ? stage.getBoundingClientRect().top + window.scrollY : window.innerHeight;
      setAtHero(window.scrollY < stageTop - 1);
    };
    const resize = () => {
      if (phaseRef.current === "canvas") surfaceRef.current?.style.setProperty("--frame-scale", String(Math.min(0.88, 1280 / window.innerWidth)));
    };
    window.addEventListener("wheel", wheel, { passive: false, capture: true });
    window.addEventListener("touchstart", touchStart, { passive: true });
    window.addEventListener("touchmove", touchMove, { passive: false, capture: true });
    window.addEventListener("keydown", key, true);
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("wheel", wheel, true);
      window.removeEventListener("touchstart", touchStart);
      window.removeEventListener("touchmove", touchMove, true);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
      unlockRef.current?.();
    };
  }, []);

  return { phase, busy, revealed, atHero, surfaceRef, begin };
}