/**
 * High-performance Web Audio API Sound Effects Synthesizer for NovaStage Canvas.
 * Produces instant, zero-latency micro-interactions without loading external audio assets.
 */

let sharedAudioCtx: AudioContext | null = null;

export function setAudioContextForTesting(ctx: AudioContext | null): void {
  sharedAudioCtx = ctx;
}

function getAudioContext(): AudioContext | null {
  if (sharedAudioCtx && sharedAudioCtx.state !== "closed") {
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  }

  if (typeof window === "undefined") return null;

  try {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtxClass) return null;

    sharedAudioCtx = new AudioCtxClass();

    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }

    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Sound Effect 1: Add Node
 * A clean, gentle ascending pop/bubble tone.
 */
export function playAddNodeSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.08);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  } catch {}
}

/**
 * Sound Effect 2: Establish Wire Link
 * Snappy, magnetic harmonic click with a subtle double chime.
 */
export function playLinkSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Harmonic fundamental (C5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.1, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Harmonic fifth (G5) for resonant snap
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(783.99, now + 0.02);
    gain2.gain.setValueAtTime(0.08, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.02);
    osc2.stop(now + 0.17);
  } catch {}
}

/**
 * Sound Effect 3: Delete Node / Wire
 * Soft downward whoosh/thud.
 */
export function playDeleteSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.1);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  } catch {}
}

/**
 * Sound Effect 4: Mark Task / Checkpoint Complete
 * Satisfying, cheerful 3-note ascending reward chime (C5 -> E5 -> G5).
 */
export function playCompleteTaskSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, time: 0.0 },  // C5
      { freq: 659.25, time: 0.05 }, // E5
      { freq: 783.99, time: 0.1 },  // G5
    ];

    notes.forEach(({ freq, time }) => {
      const noteTime = now + time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.09, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.24);
    });
  } catch {}
}

export const canvasSounds = {
  addNode: playAddNodeSound,
  link: playLinkSound,
  deleteNode: playDeleteSound,
  completeTask: playCompleteTaskSound,
};
