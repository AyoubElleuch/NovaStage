import { describe, it, expect } from "vitest";
import { autoLayoutNodes } from "./auto-layout";
import { layoutAWSArchitecture } from "./aws-layout";
import type { CanvasNode } from "./types";

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
    expect(services[1].position_x + services[1].width + 100 <= services[0].position_x ||
      services[0].position_x + services[0].width + 100 <= services[1].position_x ||
      services[1].position_y + services[1].height + 100 <= services[0].position_y ||
      services[0].position_y + services[0].height + 100 <= services[1].position_y).toBe(true);
    expect(nodes[0].position_x).toBe(0);
    expect(autoLayoutNodes(result, [])).toEqual(result);
  });

  it("anchors updated layouts to existing architecture positions", () => {
    const existingArchitecture = [
      { ...createMockNode("existing-vpc", 420, 300), node_type: "group" as const },
      { ...createMockNode("existing-api", 600, 500), node_type: "aws_service" as const },
    ];
    const result = layoutAWSArchitecture({
      intent: "update_pipeline", summary: "Update AWS", milestones: [], edges: [],
      groups: [{ id: "existing-vpc", tempId: "existing-vpc", label: "VPC", style: "vpc", childTempIds: ["existing-api"] }],
      serviceNodes: [{ id: "existing-api", tempId: "existing-api", serviceId: "ecs", parentGroupTempId: "existing-vpc" }],
      dataFlowEdges: [],
    }, existingArchitecture);

    expect(result[0].position_x).toBe(420);
    expect(result[0].position_y).toBe(300);
    expect(result[1].position_x - result[0].position_x).toBeGreaterThanOrEqual(72);
    expect(result[1].position_y - result[0].position_y).toBeGreaterThanOrEqual(104);
  });
});
