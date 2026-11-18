import { expect, it } from "vitest";
import {
  readRecovery,
  writeRecovery,
  recoveryKey,
  canRecoverDraft,
  type CanvasRecovery,
} from "./recovery";

it("scopes recovery to a user and project and handles unavailable storage", () => {
  expect(recoveryKey("p", "a")).not.toBe(recoveryKey("p", "b"));
  expect(readRecovery({ getItem: () => "broken", removeItem: () => {} }, "k")).toBeNull();
  expect(
    writeRecovery(
      {
        setItem: () => {
          throw new Error("quota");
        },
      },
      "k",
      {} as CanvasRecovery,
    ),
  ).toBe(false);
});
it("round trips history, expires drafts, and requires an unchanged recovery baseline", () => {
  const draft: CanvasRecovery = {
    savedAt: Date.now(),
    base: { nodes: [], edges: [] },
    canvas: { nodes: [], edges: [] },
    history: { entries: [], index: 0 },
  };
  let stored = "";
  const storage = {
    setItem: (_: string, value: string) => {
      stored = value;
    },
    getItem: () => stored,
    removeItem: () => {
      stored = "";
    },
  };
  expect(writeRecovery(storage, "k", draft)).toBe(true);
  expect(readRecovery(storage, "k")).toEqual(draft);
  expect(canRecoverDraft(draft, draft.base)).toBe(true);
  writeRecovery(storage, "k", { ...draft, savedAt: 1 });
  expect(readRecovery(storage, "k")).toBeNull();
  expect(stored).toBe("");
});
