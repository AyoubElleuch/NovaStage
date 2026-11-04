import { describe, expect, it, vi } from "vitest";
import { CANVAS_GUIDE_TOPICS, guideStorageKey, isGuideDismissed, setGuideDismissed, subscribeGuide } from "./guide";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

describe("canvas guide", () => {
  it("covers every first-project concept with pointer and touch wording", () => {
    expect(CANVAS_GUIDE_TOPICS.map((topic) => topic.id)).toEqual(["milestones", "checkpoints", "connections", "claims", "navigation"]);
    for (const topic of CANVAS_GUIDE_TOPICS) {
      expect(topic.pointer.length).toBeGreaterThan(20);
      expect(topic.touch).not.toMatch(/hover|Ctrl|⌘|Esc|Press /);
    }
  });

  it("remembers dismissal per user and can be reopened", () => {
    const storage = memoryStorage();
    expect(isGuideDismissed("a", storage)).toBe(false);
    setGuideDismissed("a", true, storage);
    expect(isGuideDismissed("a", storage)).toBe(true);
    expect(isGuideDismissed("b", storage)).toBe(false);
    setGuideDismissed("a", false, storage);
    expect(isGuideDismissed("a", storage)).toBe(false);
    expect(guideStorageKey("a")).toContain("a");
  });

  it("tolerates unavailable or throwing storage and still lets the guide be closed", () => {
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } };
    expect(isGuideDismissed("blocked-user", broken)).toBe(false);
    expect(() => setGuideDismissed("blocked-user", true, broken)).not.toThrow();
    expect(isGuideDismissed("blocked-user", broken)).toBe(true);
    expect(isGuideDismissed("no-storage-user", null)).toBe(false);
  });

  it("notifies subscribers when dismissal changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeGuide(listener);
    setGuideDismissed("listener-user", true, memoryStorage());
    unsubscribe();
    setGuideDismissed("listener-user", false, memoryStorage());
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
