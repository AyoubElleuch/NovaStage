import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateFallbackWorkflow } from "./gemini";
import { executeAIPipeline } from "./pipeline";
import { validateAndRepairWorkflow, resolveMilestoneColor } from "./phases/validate";
import { evaluateArchitectureQuality, normalizeArchitectureResult } from "./architecture-quality";
import type { AIWorkflowResult } from "./types";

describe("AI Workflow Pipeline, Graph Validation & Quality Engine", () => {
  const originalEnv = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  it("generateFallbackWorkflow generates a deep, comprehensive acyclic DAG milestone graph", () => {
    const workflow = generateFallbackWorkflow("Build a SaaS with Stripe billing");

    expect(workflow.intent).toBe("create_pipeline");
    expect(workflow.milestones.length).toBeGreaterThanOrEqual(5);
    expect(workflow.edges.length).toBeGreaterThanOrEqual(4);

    for (const milestone of workflow.milestones) {
      expect(milestone.tempId).toBeDefined();
      expect(milestone.title).toBeDefined();
      expect(milestone.checkpoints.length).toBeGreaterThanOrEqual(4);
    }

    const milestoneIds = new Set(workflow.milestones.map((m) => m.tempId));
    for (const edge of workflow.edges) {
      expect(milestoneIds.has(edge.fromId)).toBe(true);
      expect(milestoneIds.has(edge.toId)).toBe(true);
      expect(edge.fromId).not.toBe(edge.toId);
    }
  });

  it("rejects cycles and malformed references without inventing tasks", () => {
    const input = generateFallbackWorkflow("Build API");
    const fromId = input.milestones[0].tempId!, toId = input.milestones[1].tempId!;
    input.edges = [{ fromId, toId }, { fromId: toId, toId: fromId }];
    expect(() => validateAndRepairWorkflow(input)).toThrow(/cycle/i);
    input.edges = [{ fromId, toId: "missing" }];
    expect(() => validateAndRepairWorkflow(input)).toThrow(/declared/);
    input.edges = [];
    const { workflow, report } = validateAndRepairWorkflow(input);
    expect(workflow.edges).toEqual([]);
    expect(workflow.milestones.map(m => m.checkpoints)).toEqual(input.milestones.map(m => m.checkpoints));
    expect(report.checkpointsPadded).toBe(0);
    expect(resolveMilestoneColor("planning", "Requirements")).toBe("default");
  });

  it("fails offline generation without reporting a fabricated success", async () => {
    await expect(executeAIPipeline("Realtime collaboration workspace")).rejects.toThrow("No canvas changes were applied");
    await expect(executeAIPipeline("Deploy SaaS", "aws_architecture")).rejects.toThrow("No canvas changes were applied");
  });

  it("evaluates AWS architecture quality and normalizes service configurations", () => {
    const poorArchitecture = {
      intent: "create_pipeline" as const, summary: "Basic", milestones: [], edges: [],
      serviceNodes: ["cloudfront", "ecs", "rds"].map((serviceId, index) => ({
        tempId: `s${index}`, serviceId,
      })),
      groups: [], dataFlowEdges: [],
    };
    expect(evaluateArchitectureQuality(poorArchitecture, "Build a production SaaS").ok).toBe(false);

    const normalized = normalizeArchitectureResult({
      intent: "create_pipeline", summary: "Config", milestones: [], edges: [],
      serviceNodes: [{
        tempId: "api", serviceId: "alb",
        configEntries: [{ key: "Listener", value: "HTTPS/443" }],
      }],
      groups: [], dataFlowEdges: [],
    });
    expect(normalized?.serviceNodes?.[0]).toMatchObject({
      serviceId: "elb",
      config: { Listener: "HTTPS/443" },
    });
  });
});
