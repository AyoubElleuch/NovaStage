import { describe, expect, it } from "vitest";
import { shouldTrigger, stageFrame, TRANSITION_DURATION } from "./choreography";

describe("autonomous curtain choreography", () => {
  it("lasts 2.5 seconds and preserves uniform scaling", () => {
    expect(TRANSITION_DURATION).toBe(2500);
    expect(stageFrame(0, 0.88)).toMatchObject({ curtain: 100, scale: 1, assembly: 0, revealed: false });
    expect(stageFrame(0.36, 0.88)).toMatchObject({ curtain: 0, scale: 1, revealed: true });
    expect(stageFrame(1, 0.88)).toMatchObject({ curtain: 0, scale: 0.88, assembly: 1 });
  });
  it("only starts the forward transition from the hero", () => {
    for (const phase of ["forward", "reverse"] as const) {
      expect(shouldTrigger(phase, 100)).toBe(false);
      expect(shouldTrigger(phase, -100)).toBe(false);
    }
    expect(shouldTrigger("hero", 5)).toBe(true);
    expect(shouldTrigger("canvas", -5)).toBe(false);
  });
  it("keeps the completed frame within its target bounds", () => {
    for (let step = 0; step <= 100; step++) {
      const frame = stageFrame(step / 100, 0.7);
      expect(frame.scale).toBeGreaterThanOrEqual(0.7);
      expect(frame.scale).toBeLessThanOrEqual(1);
      expect(frame.curtain).toBeGreaterThanOrEqual(0);
      expect(frame.curtain).toBeLessThanOrEqual(100);
    }
  });
});