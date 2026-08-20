import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  playAddNodeSound,
  playLinkSound,
  playDeleteSound,
  playCompleteTaskSound,
  setAudioContextForTesting,
  canvasSounds,
} from "./sound-effects";

describe("Canvas Web Audio Sound Effects Synthesizer", () => {
  let mockAudioContext: any;
  let mockOscillator: any;
  let mockGain: any;

  beforeEach(() => {
    mockOscillator = {
      type: "sine",
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    mockAudioContext = {
      currentTime: 0,
      state: "running",
      destination: {},
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGain),
      resume: vi.fn().mockResolvedValue(undefined),
    };

    setAudioContextForTesting(mockAudioContext);
  });

  it("safely handles environments where AudioContext is undefined without throwing", () => {
    setAudioContextForTesting(null);
    (window as any).AudioContext = undefined;
    (window as any).webkitAudioContext = undefined;

    expect(() => playAddNodeSound()).not.toThrow();
    expect(() => playLinkSound()).not.toThrow();
    expect(() => playDeleteSound()).not.toThrow();
    expect(() => playCompleteTaskSound()).not.toThrow();
  });

  it("plays add node ascending pop sound", () => {
    expect(() => playAddNodeSound()).not.toThrow();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockAudioContext.createGain).toHaveBeenCalled();
    expect(mockOscillator.start).toHaveBeenCalled();
  });

  it("plays link establish chime sound", () => {
    expect(() => playLinkSound()).not.toThrow();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockOscillator.start).toHaveBeenCalled();
  });

  it("plays delete node whoosh sound", () => {
    expect(() => playDeleteSound()).not.toThrow();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockOscillator.start).toHaveBeenCalled();
  });

  it("plays complete task ascending major triad chord sound", () => {
    expect(() => playCompleteTaskSound()).not.toThrow();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockOscillator.start).toHaveBeenCalled();
  });

  it("exports unified canvasSounds dictionary", () => {
    expect(typeof canvasSounds.addNode).toBe("function");
    expect(typeof canvasSounds.link).toBe("function");
    expect(typeof canvasSounds.deleteNode).toBe("function");
    expect(typeof canvasSounds.completeTask).toBe("function");
  });
});
