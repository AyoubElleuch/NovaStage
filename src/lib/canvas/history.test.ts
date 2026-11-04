import { describe, expect, it } from "vitest";
import type { CanvasCheckpoint, CanvasEdge, CanvasNode } from "./types";
import { applyOps, canRedo, canUndo, diffCanvas, edgeKey, emptyHistory, invertOps, MAX_HISTORY_ENTRIES, recordHistory, summarizeOps } from "./history";

const node = (id: string, extra: Partial<CanvasNode> = {}): CanvasNode => ({
  id, project_id: "p", title: id, description: "", status: "draft", position_x: 0, position_y: 0, width: 280, height: 170,
  color: "default", sort_order: 0, claimed_by: "me", version: 1, checkpoints: [], node_type: "milestone", ...extra,
});
const cp = (id: string, nodeId: string, extra: Partial<CanvasCheckpoint> = {}): CanvasCheckpoint => ({ id, node_id: nodeId, project_id: "p", title: id, is_completed: false, sort_order: 0, ...extra });
const edge = (id: string, source: string, target: string, extra: Partial<CanvasEdge> = {}): CanvasEdge => ({
  id, project_id: "p", source_node_id: source, target_node_id: target, source_handle: "right", target_handle: "left", edge_type: "dependency", ...extra,
});

describe("canvas history deltas", () => {
  it("records only the user's change and ignores unrelated differences", () => {
    const before = { nodes: [node("a"), node("b")], edges: [] };
    const after = { nodes: [node("a", { title: "Renamed" }), node("b")], edges: [] };
    expect(diffCanvas(before, after)).toEqual([{ kind: "node:update", nodeId: "a", from: { title: "a" }, to: { title: "Renamed" } }]);
    expect(diffCanvas(before, before)).toEqual([]);
  });

  it("undo restores the edited card without overwriting a collaborator's change to another card", () => {
    const before = { nodes: [node("a"), node("b")], edges: [] };
    const after = { nodes: [node("a", { position_x: 160 }), node("b")], edges: [] };
    const ops = diffCanvas(before, after);
    // Meanwhile a collaborator moved card b and edited a's title.
    const current = { nodes: [node("a", { position_x: 160, title: "Theirs" }), node("b", { position_y: 400 })], edges: [] };
    const undone = applyOps(current, invertOps(ops));
    expect(undone.nodes.find((n) => n.id === "a")).toMatchObject({ position_x: 0, title: "Theirs" });
    expect(undone.nodes.find((n) => n.id === "b")?.position_y).toBe(400);
    const redone = applyOps(undone, ops);
    expect(redone.nodes.find((n) => n.id === "a")?.position_x).toBe(160);
  });

  it("round-trips node creation and deletion, removing incident connections", () => {
    const before = { nodes: [node("a")], edges: [] };
    const after = { nodes: [node("a"), node("b")], edges: [edge("e1", "a", "b")] };
    const ops = diffCanvas(before, after);
    expect(ops.map((op) => op.kind)).toEqual(["node:create", "edge:create"]);
    const undone = applyOps(after, invertOps(ops));
    expect(undone.nodes.map((n) => n.id)).toEqual(["a"]);
    expect(undone.edges).toEqual([]);
    expect(applyOps(undone, ops)).toEqual(after);
  });

  it("orders operations so parents exist before children and connections go before node deletion", () => {
    const group = node("g", { node_type: "group" });
    const child = node("c", { parent_group_id: "g" });
    const after = { nodes: [child, group], edges: [edge("e", "c", "g")] };
    const create = diffCanvas({ nodes: [], edges: [] }, after).map((op) => (op.kind === "node:create" ? op.node.id : op.kind));
    expect(create).toEqual(["g", "c", "edge:create"]);
    const remove = diffCanvas(after, { nodes: [], edges: [] }).map((op) => (op.kind === "node:delete" ? op.node.id : op.kind));
    expect(remove).toEqual(["edge:delete", "c", "g"]);
    expect(invertOps(diffCanvas({ nodes: [], edges: [] }, after)).map((op) => (op.kind === "node:delete" ? op.node.id : op.kind))).toEqual(["edge:delete", "c", "g"]);
  });

  it("tracks checkpoint add, toggle, edit and delete, deriving status instead of persisting it", () => {
    const base = node("a", { checkpoints: [cp("one", "a"), cp("two", "a", { is_completed: true })], status: "in_progress" });
    const toggled = { ...base, status: "completed" as const, checkpoints: [cp("one", "a", { is_completed: true }), cp("two", "a", { is_completed: true })] };
    const ops = diffCanvas({ nodes: [base], edges: [] }, { nodes: [toggled], edges: [] });
    expect(ops).toEqual([{ kind: "checkpoint:toggle", nodeId: "a", checkpoint: toggled.checkpoints[0], from: false, to: true }]);
    const undone = applyOps({ nodes: [toggled], edges: [] }, invertOps(ops));
    expect(undone.nodes[0].checkpoints[0].is_completed).toBe(false);
    expect(undone.nodes[0].status).toBe("in_progress");

    const added = { ...base, checkpoints: [...base.checkpoints, cp("three", "a")] };
    const addOps = diffCanvas({ nodes: [base], edges: [] }, { nodes: [added], edges: [] });
    expect(addOps.map((op) => op.kind)).toEqual(["checkpoint:add"]);
    expect(applyOps({ nodes: [added], edges: [] }, invertOps(addOps)).nodes[0].checkpoints).toHaveLength(2);

    const renamed = { ...base, checkpoints: [{ ...base.checkpoints[0], title: "Updated" }, base.checkpoints[1]] };
    expect(diffCanvas({ nodes: [base], edges: [] }, { nodes: [renamed], edges: [] }).map((op) => op.kind)).toEqual(["checkpoint:edit"]);
  });

  it("matches re-created checkpoints and edges after the server assigned new IDs", () => {
    const original = node("a", { checkpoints: [cp("old-id", "a", { title: "Ship" })] });
    const removeOps = diffCanvas({ nodes: [original], edges: [edge("old-edge", "a", "b")] }, { nodes: [{ ...original, checkpoints: [] }], edges: [] });
    const restored = { nodes: [node("b"), { ...original, checkpoints: [cp("server-id", "a", { title: "Ship" })] }], edges: [edge("server-edge", "a", "b")] };
    const result = applyOps(restored, removeOps);
    expect(result.nodes.find((n) => n.id === "a")?.checkpoints).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it("skips operations whose targets were removed by someone else", () => {
    const ops = diffCanvas({ nodes: [node("a")], edges: [] }, { nodes: [node("a", { title: "New" })], edges: [] });
    expect(applyOps({ nodes: [], edges: [] }, ops)).toEqual({ nodes: [], edges: [] });
    const connect = diffCanvas({ nodes: [node("a"), node("b")], edges: [] }, { nodes: [node("a"), node("b")], edges: [edge("e", "a", "b")] });
    expect(applyOps({ nodes: [node("a")], edges: [] }, connect).edges).toEqual([]);
  });

  it("tracks connection label and type edits", () => {
    const before = { nodes: [node("a"), node("b")], edges: [edge("e", "a", "b")] };
    const after = { nodes: before.nodes, edges: [edge("e", "a", "b", { label: "HTTPS", edge_type: "sync_http" })] };
    const ops = diffCanvas(before, after);
    expect(ops).toHaveLength(1);
    expect(applyOps(after, invertOps(ops)).edges[0]).toMatchObject({ label: null, edge_type: "dependency" });
    expect(edgeKey(before.edges[0])).toBe("a|b|right|left");
  });

  it("manages undo and redo positions and discards redo after a new change", () => {
    let history = emptyHistory();
    expect(canUndo(history)).toBe(false);
    history = recordHistory(history, [{ kind: "node:create", node: node("a") }]);
    history = recordHistory(history, [{ kind: "node:create", node: node("b") }]);
    expect(history.index).toBe(2);
    history = { ...history, index: 1 };
    expect(canUndo(history) && canRedo(history)).toBe(true);
    history = recordHistory(history, [{ kind: "node:create", node: node("c") }]);
    expect(history.entries).toHaveLength(2);
    expect(canRedo(history)).toBe(false);
    expect(recordHistory(history, [])).toBe(history);
    for (let i = 0; i < MAX_HISTORY_ENTRIES + 5; i += 1) history = recordHistory(history, [{ kind: "node:create", node: node(`n${i}`) }]);
    expect(history.entries).toHaveLength(MAX_HISTORY_ENTRIES);
  });

  it("summarizes operations in plain language", () => {
    const summary = summarizeOps([
      { kind: "node:create", node: node("a") }, { kind: "node:create", node: node("b") }, { kind: "edge:create", edge: edge("e", "a", "b") },
      { kind: "node:delete", node: node("c") }, { kind: "checkpoint:toggle", nodeId: "a", checkpoint: cp("x", "a"), from: false, to: true },
    ]);
    expect(summary.text).toBe("add 2 cards, remove 1 card, change 1 checkpoint, add 1 connection");
    expect(summarizeOps([]).text).toBe("make no changes");
  });
});
