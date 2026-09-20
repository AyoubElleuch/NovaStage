import { describe, expect, it } from "vitest";
import { connectNodes, createInitialGraph, deleteNodes, initialHistory, moveNode, sandboxReducer } from "./sandbox-state";

describe("local production graph", () => {
  it("creates a grouped AWS architecture with valid edge endpoints", () => {
    const graph = createInitialGraph();
    expect(graph.nodes).toHaveLength(9);
    expect(graph.nodes.filter((node) => node.node_type === "group")).toHaveLength(2);
    expect(graph.nodes.filter((node) => node.node_type === "aws_service")).toHaveLength(7);
    for (const edge of graph.edges) {
      expect(graph.nodes.some((node) => node.id === edge.source_node_id)).toBe(true);
      expect(graph.nodes.some((node) => node.id === edge.target_node_id)).toBe(true);
    }
  });
  it("keeps each declared group member inside its group with a visual buffer", () => {
    const graph = createInitialGraph();
    for (const group of graph.nodes.filter((node) => node.node_type === "group")) {
      for (const childId of group.group_metadata?.childNodeIds || []) {
        const child = graph.nodes.find((node) => node.id === childId)!;
        expect(child.position_x).toBeGreaterThanOrEqual(group.position_x + 40);
        expect(child.position_y).toBeGreaterThanOrEqual(group.position_y + 60);
        expect(child.position_x + child.width).toBeLessThanOrEqual(group.position_x + group.width - 40);
        expect(child.position_y + child.height).toBeLessThanOrEqual(group.position_y + group.height - 60);
      }
    }
  });
  it("keeps default group frames separated by a visible gutter", () => {
    const groups = createInitialGraph().nodes.filter((node) => node.node_type === "group");
    for (let index = 0; index < groups.length; index += 1) {
      for (let comparisonIndex = index + 1; comparisonIndex < groups.length; comparisonIndex += 1) {
        const first = groups[index];
        const second = groups[comparisonIndex];
        const overlaps = first.position_x < second.position_x + second.width &&
          first.position_x + first.width > second.position_x &&
          first.position_y < second.position_y + second.height &&
          first.position_y + first.height > second.position_y;
        expect(overlaps).toBe(false);
      }
    }
  });
  it("rejects self-links, missing endpoints, and duplicate port connections", () => {
    const graph = createInitialGraph();
    expect(connectNodes(graph, "edge", "edge", "right", "left")).toBe(graph);
    expect(connectNodes(graph, "edge", "missing", "right", "left")).toBe(graph);
    expect(connectNodes(graph, "edge", "web", "right", "left")).toBe(graph);
    expect(connectNodes(graph, "edge", "queue", "right", "left").edges).toHaveLength(7);
  });
  it("fits the mobile graph into two columns with downward ports", () => {
    const graph = createInitialGraph(true);
    expect(Math.max(...graph.nodes.map((node) => node.position_x + node.width))).toBe(500);
    expect(graph.edges.find((edge) => edge.id === "api-postgres")).toMatchObject({ source_handle: "bottom", target_handle: "top" });
  });
  it("snaps drag coordinates without mutating the seed", () => {
    const graph = createInitialGraph();
    expect(moveNode(graph, "edge", 113, 91, true).nodes.find((node) => node.id === "edge")).toMatchObject({ position_x: 120, position_y: 100 });
    expect(graph.nodes.find((node) => node.id === "edge")?.position_x).toBe(70);
  });
  it("deletes selected nodes and their attached wires as one local operation", () => {
    const graph = createInitialGraph();
    const next = deleteNodes(graph, new Set(["api", "redis"]));
    expect(next.nodes.map((node) => node.id)).not.toContain("api");
    expect(next.nodes.map((node) => node.id)).not.toContain("redis");
    expect(next.edges.every((edge) => edge.source_node_id !== "api" && edge.target_node_id !== "api" && edge.source_node_id !== "redis" && edge.target_node_id !== "redis")).toBe(true);
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