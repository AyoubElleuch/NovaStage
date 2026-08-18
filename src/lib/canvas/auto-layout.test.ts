import { describe, it, expect } from "vitest";
import { autoLayoutNodes } from "./auto-layout";
import type { CanvasNode, CanvasEdge } from "./types";

describe("Canvas Auto-Layout Algorithm", () => {
  const createMockNode = (id: string, x = 0, y = 0): CanvasNode => ({
    id,
    project_id: "proj-1",
    title: `Node ${id}`,
    description: "",
    status: "draft",
    position_x: x,
    position_y: y,
    width: 280,
    height: 170,
    color: "default",
    sort_order: 0,
    claimed_by: null,
    version: 1,
    created_at: "",
    updated_at: "",
    checkpoints: [],
  });

  it("returns empty array when input is empty", () => {
    expect(autoLayoutNodes([], [])).toEqual([]);
  });

  it("arranges independent nodes into level 0 column", () => {
    const nodes = [createMockNode("A"), createMockNode("B")];
    const layout = autoLayoutNodes(nodes, []);

    expect(layout.length).toBe(2);
    // Both should be in level 0 (x = 120)
    expect(layout[0].position_x).toBe(120);
    expect(layout[1].position_x).toBe(120);
    // Vertical spacing between items
    expect(layout[0].position_y).toBe(120);
    expect(layout[1].position_y).toBe(360); // 120 + 240
  });

  it("topologically sequences dependent linear chains (A -> B -> C)", () => {
    const nodes = [createMockNode("A"), createMockNode("B"), createMockNode("C")];
    const edges: CanvasEdge[] = [
      { id: "e1", project_id: "p1", source_node_id: "A", target_node_id: "B", source_handle: "right", target_handle: "left", created_at: "" },
      { id: "e2", project_id: "p1", source_node_id: "B", target_node_id: "C", source_handle: "right", target_handle: "left", created_at: "" },
    ];

    const layout = autoLayoutNodes(nodes, edges);
    const nodeA = layout.find((n) => n.id === "A")!;
    const nodeB = layout.find((n) => n.id === "B")!;
    const nodeC = layout.find((n) => n.id === "C")!;

    expect(nodeA.position_x).toBe(120); // Level 0
    expect(nodeB.position_x).toBe(120 + 380); // Level 1 (500)
    expect(nodeC.position_x).toBe(120 + 2 * 380); // Level 2 (880)
  });

  it("handles branch-and-merge DAG layouts", () => {
    // Root -> (B, C) -> D
    const nodes = [
      createMockNode("Root"),
      createMockNode("B"),
      createMockNode("C"),
      createMockNode("D"),
    ];
    const edges: CanvasEdge[] = [
      { id: "e1", project_id: "p1", source_node_id: "Root", target_node_id: "B", source_handle: "right", target_handle: "left", created_at: "" },
      { id: "e2", project_id: "p1", source_node_id: "Root", target_node_id: "C", source_handle: "right", target_handle: "left", created_at: "" },
      { id: "e3", project_id: "p1", source_node_id: "B", target_node_id: "D", source_handle: "right", target_handle: "left", created_at: "" },
      { id: "e4", project_id: "p1", source_node_id: "C", target_node_id: "D", source_handle: "right", target_handle: "left", created_at: "" },
    ];

    const layout = autoLayoutNodes(nodes, edges);
    const root = layout.find((n) => n.id === "Root")!;
    const b = layout.find((n) => n.id === "B")!;
    const c = layout.find((n) => n.id === "C")!;
    const d = layout.find((n) => n.id === "D")!;

    expect(root.position_x).toBe(120);
    expect(b.position_x).toBe(500);
    expect(c.position_x).toBe(500);
    expect(d.position_x).toBe(880);
  });
});
