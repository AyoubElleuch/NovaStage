import { describe, it, expect } from "vitest";
import { autoLayoutNodes } from "./auto-layout";
import { layoutAWSArchitecture } from "./aws-layout";
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

  it("sizes nested AWS groups around their children without sibling overlaps", () => {
    const nodes: CanvasNode[] = [
      { ...createMockNode("region"), node_type: "group" },
      { ...createMockNode("vpc"), node_type: "group", parent_group_id: "region" },
      { ...createMockNode("subnet"), node_type: "group", parent_group_id: "vpc" },
      { ...createMockNode("lambda"), node_type: "aws_service", parent_group_id: "subnet" },
      { ...createMockNode("db"), node_type: "aws_service", parent_group_id: "subnet", height: 420 },
      { ...createMockNode("other-vpc"), node_type: "group", parent_group_id: "region" },
    ];
    const result = autoLayoutNodes(nodes, []);
    for (const child of result.filter((node) => node.parent_group_id)) {
      const parent = result.find((node) => node.id === child.parent_group_id)!;
      expect(child.position_x).toBeGreaterThanOrEqual(parent.position_x + 56);
      expect(child.position_y).toBeGreaterThanOrEqual(parent.position_y + 88);
      expect(child.position_x + child.width).toBeLessThanOrEqual(parent.position_x + parent.width - 56);
      expect(child.position_y + child.height).toBeLessThanOrEqual(parent.position_y + parent.height - 56);
    }
    const services = result.filter((node) => node.node_type === "aws_service");
    expect(services[1].position_y).toBeGreaterThanOrEqual(services[0].position_y + services[0].height + 100);
    expect(nodes[0].position_x).toBe(0);
    expect(autoLayoutNodes(result, [])).toEqual(result);
  });

  it("handles cycles, invalid edges and legacy group membership deterministically", () => {
    const nodes: CanvasNode[] = [
      { ...createMockNode("group"), node_type: "group", group_metadata: {
        label: "VPC", style: "vpc", childNodeIds: ["A", "B"],
      } },
      createMockNode("A"), createMockNode("B"),
    ];
    const edges = [
      { source_node_id: "A", target_node_id: "B" },
      { source_node_id: "B", target_node_id: "A" },
      { source_node_id: "missing", target_node_id: "A" },
    ];
    const result = autoLayoutNodes(nodes, edges);
    expect(result.every((node) => Number.isFinite(node.position_x))).toBe(true);
    expect(result[1].position_x).toBeGreaterThan(result[0].position_x);
    expect(autoLayoutNodes(nodes, edges)).toEqual(result);
  });

  it("places generated AWS content below existing workflows and resolves child lists", () => {
    const result = layoutAWSArchitecture({
      intent: "create_pipeline", summary: "AWS", milestones: [], edges: [],
      groups: [
        { tempId: "region", label: "Region", style: "region", childTempIds: ["vpc"] },
        { tempId: "vpc", label: "VPC", style: "vpc", childTempIds: ["lambda"] },
      ],
      serviceNodes: [{ tempId: "lambda", serviceId: "lambda", name: "Handler" }],
    }, [{ ...createMockNode("existing", 100, 900), height: 400 }]);
    expect(result[0].position_y).toBe(1500);
    expect(result[1].parent_group_id).toBe("region");
    expect(result[2].parent_group_id).toBe("vpc");
    expect(result[2].position_y).toBeGreaterThan(result[1].position_y + 80);
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
    expect(layout[1].position_y).toBeGreaterThanOrEqual(layout[0].position_y + layout[0].height + 100);
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
    expect(nodeB.position_x).toBeGreaterThanOrEqual(nodeA.position_x + nodeA.width + 140);
    expect(nodeC.position_x).toBeGreaterThanOrEqual(nodeB.position_x + nodeB.width + 140);
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
    expect(b.position_x).toBeGreaterThanOrEqual(root.position_x + root.width + 140);
    expect(c.position_x).toBe(b.position_x);
    expect(d.position_x).toBeGreaterThanOrEqual(b.position_x + b.width + 140);
  });
});
