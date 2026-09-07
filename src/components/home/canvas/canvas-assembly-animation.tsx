"use client";

import { useEffect, useState } from "react";
import CanvasCursors from "@/components/canvas/canvas-cursors";

export default function CanvasAssemblyAnimation({ active, compact }: { active: boolean; compact: boolean }) {
  const [cursor, setCursor] = useState({ x: 490, y: 480 });
  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = (performance.now() - start) / 1000;
      setCursor({ x: (compact ? 160 : 520) + Math.sin(elapsed * 0.6) * 85, y: (compact ? 750 : 475) + Math.cos(elapsed * 0.8) * 24 });
    }, 120);
    return () => window.clearInterval(timer);
  }, [active, compact]);
  if (!active) return null;
  return <div className="home-assembly-cursor">
    <CanvasCursors currentUserId="local-visitor" collaborators={[{
      userId: "demo-ayoub", fullName: "Ayoub · Lead Architect", email: "", color: "#10b981",
      cursor, lastActive: 0,
    }]} />
    <div className="home-checkpoint" style={{ left: compact ? 20 : 360, top: compact ? 790 : 530 }}>
      <span>Ayoub</span><p>Checkpoint: cache failover reviewed.</p>
    </div>
  </div>;
}