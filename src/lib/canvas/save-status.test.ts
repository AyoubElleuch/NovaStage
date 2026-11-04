import { describe, expect, it } from "vitest";
import { describeSave, friendlySaveError, INITIAL_SAVE_STATE, reduceSaveState } from "./save-status";

describe("save status", () => {
  it("moves through saving and saved", () => {
    let state = reduceSaveState(INITIAL_SAVE_STATE, { type: "started" });
    state = reduceSaveState(state, { type: "started" });
    expect(describeSave(state, "online")).toMatchObject({ kind: "saving", tone: "busy" });
    state = reduceSaveState(state, { type: "succeeded" });
    expect(describeSave(state, "online").kind).toBe("saving");
    state = reduceSaveState(state, { type: "succeeded" });
    expect(describeSave(state, "online")).toMatchObject({ kind: "saved", detail: "All changes saved" });
  });

  it("reports an unsaved change until the canvas is re-synced, then until it is dismissed", () => {
    let state = reduceSaveState(INITIAL_SAVE_STATE, { type: "started" });
    state = reduceSaveState(state, { type: "failed", message: "Nope." });
    expect(describeSave(state, "online")).toMatchObject({ kind: "diverged", tone: "error", action: "sync", detail: "Nope." });
    state = reduceSaveState(state, { type: "synced" });
    expect(describeSave(state, "online")).toMatchObject({ kind: "failed", action: "dismiss" });
    expect(describeSave(state, "online").detail).toContain("saved version");
    state = reduceSaveState(state, { type: "dismissed" });
    expect(describeSave(state, "online").kind).toBe("saved");
  });

  it("never claims saved while offline, and offers a sync when the screen may be stale", () => {
    expect(describeSave(INITIAL_SAVE_STATE, "offline")).toMatchObject({ kind: "offline", tone: "warn" });
    const failed = reduceSaveState(reduceSaveState(INITIAL_SAVE_STATE, { type: "started" }), { type: "failed", message: "x" });
    expect(describeSave(failed, "offline")).toMatchObject({ kind: "offline", action: "sync" });
    expect(describeSave(failed, "reconnecting").kind).toBe("diverged");
    expect(describeSave(INITIAL_SAVE_STATE, "slow").kind).toBe("saved");
  });

  it("never lets the pending count go negative", () => {
    expect(reduceSaveState(INITIAL_SAVE_STATE, { type: "succeeded" }).pending).toBe(0);
  });

  it("translates transport and permission failures", () => {
    expect(friendlySaveError(new Error("You must claim this milestone box to edit its content"))).toMatch(/Claim it again/);
    expect(friendlySaveError(new Error("Box is currently claimed by another collaborator"))).toMatch(/Someone else is editing/);
    expect(friendlySaveError(new TypeError("Failed to fetch"))).toMatch(/couldn't be reached/);
    expect(friendlySaveError(new Error("Access Revoked"))).toMatch(/no longer have access/);
    expect(friendlySaveError(new Error("Node not found"))).toMatch(/no longer exists/);
    expect(friendlySaveError(new Error("Title is too long"))).toBe("Title is too long");
    expect(friendlySaveError(new Error("x".repeat(300)))).toMatch(/could not be saved/);
    expect(friendlySaveError(undefined)).toMatch(/could not be saved/);
  });
});
