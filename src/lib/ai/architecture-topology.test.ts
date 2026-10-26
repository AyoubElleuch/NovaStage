import { describe, expect, it } from "vitest";
import { normalizeArchitectureResult, hasUsableArchitecture } from "./architecture-quality";
import type { AIWorkflowResult } from "./types";

describe("AWS containment normalization", () => {
  it("preserves invalid containment evidence for rejection rather than guessing a repair", () => {
    const result: AIWorkflowResult = {
      intent: "update_pipeline", summary: "Repair topology", milestones: [], edges: [],
      groups: [
        { tempId: "a", label: "A", style: "region", parentGroupTempId: "b", childTempIds: ["service"] },
        { tempId: "b", label: "B", style: "vpc", parentGroupTempId: "a", childTempIds: ["service"] },
        { id: "old-empty", tempId: "empty", label: "Empty", style: "region", childTempIds: ["empty-subnet"] },
        { tempId: "empty-subnet", label: "Empty subnet", style: "subnet", parentGroupTempId: "empty", childTempIds: [] },
      ],
      serviceNodes: [{ tempId: "service", serviceId: "ecs", parentGroupTempId: "b" }],
      dataFlowEdges: [],
    };
    const normalized = normalizeArchitectureResult(result)!;
    expect(normalized.groups).toEqual(result.groups);
    expect(hasUsableArchitecture(normalized)).toBe(false);
    expect(normalizeArchitectureResult(normalized)).toEqual(normalized);
    expect(result.groups).toHaveLength(4);
  });

  it("preserves legitimate feedback edges without inventing connectivity for isolated services", () => {
    const result: AIWorkflowResult = {
      intent: "create_pipeline", summary: "Feedback", milestones: [], edges: [], groups: [],
      serviceNodes: [{ tempId: "queue", serviceId: "sqs" }, { tempId: "worker", serviceId: "lambda" }, { tempId: "key", serviceId: "kms" }],
      dataFlowEdges: [{ fromId: "queue", toId: "worker", edgeType: "event" }, { fromId: "worker", toId: "queue", edgeType: "async_queue" }],
    };
    const normalized = normalizeArchitectureResult(result)!;
    expect(normalized.dataFlowEdges).toEqual(result.dataFlowEdges);
    expect(hasUsableArchitecture(normalized)).toBe(true);
  });
});
