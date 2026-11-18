import { diffCanvas, type CanvasState, type History } from "./history";

export interface CanvasRecovery {
  savedAt: number;
  base: CanvasState;
  canvas: CanvasState;
  history: History;
}
const MAX_BYTES = 4_000_000;
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
export const recoveryKey = (projectId: string, userId: string) => `novastage:recovery:${userId}:${projectId}`;

export function readRecovery(storage: Pick<Storage, "getItem" | "removeItem">, key: string): CanvasRecovery | null {
  try {
    const raw = storage.getItem(key);
    if (!raw || raw.length > MAX_BYTES) return null;
    const value = JSON.parse(raw) as CanvasRecovery;
    if (!Number.isFinite(value.savedAt) || Date.now() - value.savedAt > MAX_AGE) { storage.removeItem(key); return null; }
    if (![value.base?.nodes, value.base?.edges, value.canvas?.nodes, value.canvas?.edges, value.history?.entries].every(Array.isArray)) return null;
    if (!Number.isInteger(value.history.index) || value.history.index < 0 || value.history.index > value.history.entries.length) return null;
    return value;
  } catch { return null; }
}

export function writeRecovery(storage: Pick<Storage, "setItem">, key: string, value: CanvasRecovery): boolean {
  try {
    const json = JSON.stringify(value);
    if (json.length > MAX_BYTES) return false;
    storage.setItem(key, json);
    return true;
  } catch { return false; }
}

export function canRecoverDraft(draft: CanvasRecovery, saved: CanvasState): boolean {
  return diffCanvas(draft.base, saved).length === 0;
}
