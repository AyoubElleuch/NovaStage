import { describe, expect, it } from "vitest";
import { layoutAWSArchitecture } from "./aws-layout";
import type { CanvasNode } from "./types";
import type { AIWorkflowResult } from "@/lib/ai/types";

const architecture: AIWorkflowResult = { intent: "create_parallel", summary: "New architecture", milestones: [], edges: [], serviceNodes: [{ tempId: "new-lambda", serviceId: "lambda" }] };
const existing: CanvasNode = { id: "existing-vpc", project_id: "p1", title: "VPC", description: "", node_type: "group", status: "draft", position_x: 100, position_y: 700, width: 400, height: 0, color: "default", sort_order: 0, claimed_by: null, version: 1, checkpoints: [] };

describe("AWS architecture placement", () => {
  it("places new architectures below existing AWS content with renderer fallback dimensions", () => {
    const result = layoutAWSArchitecture(architecture, [existing]);
    expect(result[0].position_y).toBe(1240);
    expect(existing.position_y).toBe(700);
  });

  it("does not let a group become its own parent through explicit or legacy membership", () => {
    const result = layoutAWSArchitecture({ ...architecture, groups: [{ tempId: "vpc", label: "VPC", style: "vpc", childTempIds: ["vpc", "new-lambda"], parentGroupTempId: "vpc" }] }, []);
    expect(result.find((node) => node.id === "vpc")?.parent_group_id).toBeUndefined();
    expect(result.find((node) => node.id === "new-lambda")?.parent_group_id).toBe("vpc");
  });
});
