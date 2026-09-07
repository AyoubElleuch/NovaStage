export const TRANSITION_DURATION = 2500;
export type StagePhase = "hero" | "forward" | "canvas" | "reverse";
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => 1 - Math.pow(1 - clamp(value), 3);

export function stageFrame(progress: number, targetScale: number) {
  return {
    curtain: (1 - ease(progress / 0.36)) * 100,
    scale: 1 - (1 - targetScale) * ease((progress - 0.36) / 0.36),
    offset: 28 * ease((progress - 0.36) / 0.36),
    assembly: ease((progress - 0.66) / 0.34),
    revealed: progress >= 0.36,
  };
}

export function shouldTrigger(phase: StagePhase, delta: number) {
  return phase === "hero" && delta > 3;
}