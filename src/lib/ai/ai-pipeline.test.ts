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

  it("detects and breaks circular dependency cycles and reconnects orphan nodes in validation phase", () => {
    const cyclicWorkflow: AIWorkflowResult = {
      intent: "create_pipeline",
      summary: "Cyclic workflow",
      milestones: [
        { tempId: "m1", title: "Step 1", checkpoints: [{ title: "T1" }, { title: "T2" }, { title: "T3" }, { title: "T4" }] },
        { tempId: "m2", title: "Step 2", checkpoints: [{ title: "T1" }, { title: "T2" }, { title: "T3" }, { title: "T4" }] },
        { tempId: "m3", title: "Step 3", checkpoints: [{ title: "T1" }, { title: "T2" }, { title: "T3" }, { title: "T4" }] },
      ],
      edges: [
        { fromId: "m1", toId: "m2" },
        { fromId: "m2", toId: "m3" },
        { fromId: "m3", toId: "m1" }, // Circular back-edge!
      ],
    };

    const { workflow, report } = validateAndRepairWorkflow(cyclicWorkflow);
    expect(report.cyclesRemoved).toBeGreaterThanOrEqual(1);
    expect(workflow.edges.some((e) => e.fromId === "m3" && e.toId === "m1")).toBe(false);

    // Orphan reconnection test
    const orphanWorkflow: AIWorkflowResult = {
      intent: "create_pipeline",
      summary: "Orphan workflow",
      milestones: [
        { tempId: "m1", title: "Step 1", sortOrder: 0, checkpoints: [{ title: "T1" }, { title: "T2" }, { title: "T3" }, { title: "T4" }] },
        { tempId: "m2", title: "Step 2", sortOrder: 1, checkpoints: [{ title: "T1" }, { title: "T2" }, { title: "T3" }, { title: "T4" }] },
        { tempId: "m3", title: "Step 3", sortOrder: 2, checkpoints: [{ title: "T1" }, { title: "T2" }, { title: "T3" }, { title: "T4" }] },
      ],
      edges: [{ fromId: "m1", toId: "m3" }],
    };

    const repairedOrphan = validateAndRepairWorkflow(orphanWorkflow);
    expect(repairedOrphan.report.orphansConnected).toBeGreaterThanOrEqual(1);
    expect(repairedOrphan.workflow.edges.some((e) => e.fromId === "m2" || e.toId === "m2")).toBe(true);
  });

  it("pads checkpoints, repairs duplicate titles, and prunes broken edges", () => {
    expect(resolveMilestoneColor("planning", "Requirements")).toBe("default");
    expect(resolveMilestoneColor("implementation", "Stripe API")).toBe("purple");

    const messyWorkflow: AIWorkflowResult = {
      intent: "create_pipeline",
      summary: "Messy workflow",
      milestones: [
        { tempId: "m1", title: "API", checkpoints: [{ title: "Single task" }] },
        { tempId: "m2", title: "API", checkpoints: [{ title: "T1" }, { title: "T2" }, { title: "T3" }, { title: "T4" }] },
      ],
      edges: [
        { fromId: "m1", toId: "m1" }, // Self loop
        { fromId: "m1", toId: "nonexistent" }, // Dangling edge
        { fromId: "m1", toId: "m2" }, // Valid edge
      ],
    };

    const { workflow, report } = validateAndRepairWorkflow(messyWorkflow);
    expect(report.checkpointsPadded).toBe(3);
    expect(workflow.milestones[0].checkpoints.length).toBe(4);
    expect(report.duplicateTitlesFixed).toBe(1);
    expect(workflow.milestones[1].title).toContain("(Part 2)");
    expect(report.brokenEdgesRemoved).toBe(2);
    expect(workflow.edges.length).toBe(1);
  });

  it("executes multi-phase AI pipeline with offline fallback and error handling", async () => {
    delete process.env.GEMINI_API_KEY;
    const workflow = await executeAIPipeline("Realtime collaboration workspace");

    expect(workflow.milestones.length).toBeGreaterThanOrEqual(5);
    expect(workflow.edges.length).toBeGreaterThanOrEqual(4);

    await expect(executeAIPipeline(
      "Deploy scalable SaaS with Next.js and Aurora",
      "full_stack"
    )).rejects.toThrow("No canvas changes were applied");
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
