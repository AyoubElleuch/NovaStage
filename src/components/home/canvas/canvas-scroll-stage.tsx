import type { StagePhase } from "./choreography";
import CanvasFrameWrapper from "./canvas-frame-wrapper";
import CanvasSandbox from "./canvas-sandbox";

export default function CanvasScrollStage({ phase }: { phase: StagePhase }) {
  return <section id="live-systems" className="home-scroll-stage" aria-label="Live architecture sandbox" inert={phase !== "canvas"} aria-hidden={phase === "hero"}>
    <div className="home-curtain"><CanvasFrameWrapper><CanvasSandbox active={phase === "canvas" || phase === "forward"} interactive={phase === "canvas"} /></CanvasFrameWrapper></div>
  </section>;
}