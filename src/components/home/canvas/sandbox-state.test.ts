import { describe, expect, it } from "vitest";
import { connectNodes, createInitialGraph, deleteNodes, initialHistory, moveNode, sandboxReducer } from "./sandbox-state";

describe("local production graph", () => {
  it("creates five real service nodes with valid edge endpoints", () => {
    const graph = createInitialGraph();
    expect(graph.nodes).toHaveLength(5);
    expect(graph.nodes.every((node) => node.node_type === "aws_service")).toBe(true);
    for (const edge of graph.edges) {
      expect(graph.nodes.some((node) => node.id === edge.source_node_id)).toBe(true);
      expect(graph.nodes.some((node) => node.id === edge.target_node_id)).toBe(true);
    }
  });
  it("rejects self-links, missing endpoints, and duplicate port connections", () => {
    const graph = createInitialGraph();
    expect(connectNodes(graph, "edge", "edge", "right", "left")).toBe(graph);
    expect(connectNodes(graph, "edge", "missing", "right", "left")).toBe(graph);
    expect(connectNodes(graph, "edge", "api", "right", "left")).toBe(graph);
    expect(connectNodes(graph, "edge", "queue", "right", "left").edges).toHaveLength(6);
  });
  it("fits the mobile graph into two columns with downward ports", () => {
    const graph = createInitialGraph(true);
    expect(Math.max(...graph.nodes.map((node) => node.position_x + node.width))).toBe(470);
    expect(graph.edges.find((edge) => edge.id === "api-postgres")).toMatchObject({ source_handle: "bottom", target_handle: "top" });
  });
  it("snaps drag coordinates without mutating the seed", () => {
    const graph = createInitialGraph();
    expect(moveNode(graph, "edge", 113, 91, true).nodes[0]).toMatchObject({ position_x: 120, position_y: 100 });
    expect(graph.nodes[0].position_x).toBe(50);
  });
  it("deletes selected nodes and their attached wires as one local operation", () => {
    const graph = createInitialGraph();
    const next = deleteNodes(graph, new Set(["api", "redis"]));
    expect(next.nodes.map((node) => node.id)).toEqual(["edge", "postgres", "queue"]);
    expect(next.edges).toHaveLength(1);
    expect(next.edges[0].id).toBe("postgres-queue");
  });
  it("supports undo, redo and a complete reset", () => {
    const original = initialHistory();
    const moved = sandboxReducer(original, { type: "commit", graph: moveNode(original.present, "edge", 500, 500, false) });
    const undone = sandboxReducer(moved, { type: "undo" });
    expect(undone.present).toEqual(original.present);
    expect(sandboxReducer(undone, { type: "redo" }).present).toEqual(moved.present);
    expect(sandboxReducer(moved, { type: "reset" })).toEqual(original);
  });
});