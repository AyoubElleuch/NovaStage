import type { CanvasNetworkStatus } from "./types";

/** Tracks whether the canvas shown on screen is known to match what the server has stored. */
export interface SaveTrackerState {
  pending: number;
  /** A save failed and the canvas has not been re-synced since, so the screen may differ from the server. */
  diverged: boolean;
  /** Friendly description of the most recent failed save, until dismissed. */
  failure: string | null;
}

export type SaveEvent =
  | { type: "started" }
  | { type: "succeeded" }
  | { type: "failed"; message: string }
  | { type: "synced" }
  | { type: "dismissed" };

export const INITIAL_SAVE_STATE: SaveTrackerState = { pending: 0, diverged: false, failure: null };

export function reduceSaveState(state: SaveTrackerState, event: SaveEvent): SaveTrackerState {
  switch (event.type) {
    case "started": return { ...state, pending: state.pending + 1 };
    case "succeeded": return { ...state, pending: Math.max(0, state.pending - 1) };
    case "failed": return { pending: Math.max(0, state.pending - 1), diverged: true, failure: event.message };
    case "synced": return { ...state, diverged: false };
    case "dismissed": return { ...state, failure: null };
  }
}

export type SaveIndicatorKind = "saved" | "saving" | "failed" | "diverged" | "offline";
export interface SaveIndicator {
  kind: SaveIndicatorKind;
  label: string;
  detail?: string;
  tone: "ok" | "busy" | "warn" | "error";
  /** Recovery the indicator offers, if any. */
  action?: "sync" | "dismiss";
}

export function describeSave(state: SaveTrackerState, network: CanvasNetworkStatus): SaveIndicator {
  if (network === "offline") {
    return {
      kind: "offline", tone: "warn", label: "Offline",
      detail: state.diverged || state.pending
        ? "You're offline. Recent edits may not be saved. Reconnect to sync."
        : "You're offline. Changes can't be saved until you reconnect.",
      action: state.diverged ? "sync" : undefined,
    };
  }
  if (state.pending > 0) return { kind: "saving", tone: "busy", label: "Saving…", detail: "Saving your changes" };
  if (state.diverged) {
    return { kind: "diverged", tone: "error", label: "Not saved", detail: state.failure ?? "Your last change wasn't saved and the canvas may be out of date.", action: "sync" };
  }
  if (state.failure) return { kind: "failed", tone: "warn", label: "Change not saved", detail: `${state.failure} The canvas shows the saved version.`, action: "dismiss" };
  return { kind: "saved", tone: "ok", label: "Saved", detail: "All changes saved" };
}

/** Turns transport and server errors into something a person can act on. */
export function friendlySaveError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (/must claim|claim this/i.test(message)) return "Someone else holds this card, or your claim expired. Claim it again to edit.";
  if (/claimed by another/i.test(message)) return "Someone else is editing this card. Ask them for it, or wait for their claim to expire.";
  if (/access revoked/i.test(message)) return "You no longer have access to this project.";
  if (/failed to fetch|networkerror|load failed|network request failed|timeout|aborted/i.test(message)) return "NovaStage couldn't be reached. Check your connection and try again.";
  if (/not found/i.test(message)) return "That item no longer exists. Someone may have deleted it.";
  return message && message.length < 140 ? message : "The change could not be saved. Please try again.";
}
