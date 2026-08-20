import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  playAddNodeSound,
  playLinkSound,
  playDeleteSound,
  playCompleteTaskSound,
  setAudioContextForTesting,
  canvasSounds,
} from "./sound-effects";

type MockOscillator = {
  type: string;
  frequency: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

type MockGain = {
  gain: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
};

type MockAudioContext = {
  currentTime: number;
  state: AudioContextState;
  destination: unknown;
  createOscillator: ReturnType<typeof vi.fn>;
  createGain: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
};

describe("Canvas Web Audio Sound Effects Synthesizer", () => {
  let mockAudioContext: MockAudioContext;
  let mockOscillator: MockOscillator;
  let mockGain: MockGain;

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

    setAudioContextForTesting(mockAudioContext as unknown as AudioContext);
  });

  it("safely handles environments where AudioContext is undefined without throwing", () => {
    setAudioContextForTesting(null);
    const win = window as unknown as Record<string, unknown>;
    win.AudioContext = undefined;
    win.webkitAudioContext = undefined;

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
