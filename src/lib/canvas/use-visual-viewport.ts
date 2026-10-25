"use client";

import { useEffect } from "react";

/** Keep canvas panels above the phone keyboard without moving the diagram. */
export function useCanvasVisualViewport() {
  useEffect(() => {
    const root = document.documentElement;
    const height = root.style.getPropertyValue("--canvas-visible-height");
    const top = root.style.getPropertyValue("--canvas-visible-top");
    const viewport = window.visualViewport;
    const update = () => {
      root.style.setProperty("--canvas-visible-height", `${viewport?.height ?? window.innerHeight}px`);
      root.style.setProperty("--canvas-visible-top", `${viewport?.offsetTop ?? 0}px`);
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      for (const [key, value] of [["--canvas-visible-height", height], ["--canvas-visible-top", top]]) {
        if (value) root.style.setProperty(key, value); else root.style.removeProperty(key);
      }
    };
  }, []);
}
