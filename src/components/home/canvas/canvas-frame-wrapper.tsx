import type { ReactNode } from "react";

export default function CanvasFrameWrapper({ children }: { children: ReactNode }) {
  return <div className="home-canvas-frame">{children}</div>;
}