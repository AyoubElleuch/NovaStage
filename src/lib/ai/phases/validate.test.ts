import { describe, it, expect } from "vitest";
import { validateAndRepairWorkflow, resolveMilestoneColor } from "./validate";
import { AIWorkflowResult } from "../types";

describe("Phase 3: Validation & Auto-Repair Engine", () => {
  it("resolves canonical milestone colors correctly based on phase and title", () => {
    expect(resolveMilestoneColor("planning", "Requirements")).toBe("default");
    expect(resolveMilestoneColor("architecture", "Postgres Schema")).toBe("default");
    expect(resolveMilestoneColor("implementation", "React UI Dashboard")).toBe("amber");
    expect(resolveMilestoneColor("implementation", "Stripe Billing API")).toBe("purple");
    expect(resolveMilestoneColor("testing", "Playwright E2E")).toBe("rose");
    expect(resolveMilestoneColor("deployment", "Production Release")).toBe("rose");
  });

  it("detects and breaks circular dependency cycles in DAG edges", () => {
    const cyclicWorkflow: AIWorkflowResult = {
      intent: "create_pipeline",
      summary: "Cyclic workflow",
      milestones: [
        {
          tempId: "m1",
          title: "Step 1",
          checkpoints: [
            { title: "Task 1" },
            { title: "Task 2" },
            { title: "Task 3" },
            { title: "Task 4" },
          ],
        },
        {
          tempId: "m2",
          title: "Step 2",
          checkpoints: [
            { title: "Task 1" },
            { title: "Task 2" },
            { title: "Task 3" },
            { title: "Task 4" },
          ],
        },
        {
          tempId: "m3",
          title: "Step 3",
          checkpoints: [
            { title: "Task 1" },
            { title: "Task 2" },
            { title: "Task 3" },
            { title: "Task 4" },
          ],
        },
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
  });

  it("reconnects orphan nodes that have no incoming or outgoing edges", () => {
    const orphanWorkflow: AIWorkflowResult = {
      intent: "create_pipeline",
      summary: "Orphan workflow",
      milestones: [
        { tempId: "m1", title: "Step 1", sortOrder: 0, checkpoints: [{ title: "Task 1" }, { title: "Task 2" }, { title: "Task 3" }, { title: "Task 4" }] },
        { tempId: "m2", title: "Step 2", sortOrder: 1, checkpoints: [{ title: "Task 1" }, { title: "Task 2" }, { title: "Task 3" }, { title: "Task 4" }] },
        { tempId: "m3", title: "Step 3", sortOrder: 2, checkpoints: [{ title: "Task 1" }, { title: "Task 2" }, { title: "Task 3" }, { title: "Task 4" }] },
      ],
      edges: [
        { fromId: "m1", toId: "m3" }, // m2 is completely skipped/orphan
      ],
    };

    const { workflow, report } = validateAndRepairWorkflow(orphanWorkflow);

    expect(report.orphansConnected).toBeGreaterThanOrEqual(1);
    const m2Connected = workflow.edges.some((e) => e.fromId === "m2" || e.toId === "m2");
    expect(m2Connected).toBe(true);
  });

  it("pads checkpoints when milestone has fewer than 4 checkpoints", () => {
    const sparseWorkflow: AIWorkflowResult = {
      intent: "create_pipeline",
      summary: "Sparse checkpoints",
      milestones: [
        {
          tempId: "m1",
          title: "Setup",
          checkpoints: [{ title: "Single task" }],
        },
      ],
      edges: [],
    };

    const { workflow, report } = validateAndRepairWorkflow(sparseWorkflow);

    expect(report.checkpointsPadded).toBe(3);
    expect(workflow.milestones[0].checkpoints.length).toBe(4);
  });

  it("fixes duplicate milestone titles", () => {
    const duplicateWorkflow: AIWorkflowResult = {
      intent: "create_pipeline",
      summary: "Duplicate titles",
      milestones: [
        { tempId: "m1", title: "Backend API", checkpoints: [{ title: "T1" }, { title: "T2" }, { title: "T3" }, { title: "T4" }] },
        { tempId: "m2", title: "Backend API", checkpoints: [{ title: "T1" }, { title: "T2" }, { title: "T3" }, { title: "T4" }] },
      ],
      edges: [{ fromId: "m1", toId: "m2" }],
    };

    const { workflow, report } = validateAndRepairWorkflow(duplicateWorkflow);

    expect(report.duplicateTitlesFixed).toBe(1);
    expect(workflow.milestones[0].title).toBe("Backend API");
    expect(workflow.milestones[1].title).toBe("Backend API (Part 2)");
  });

  it("removes self-loops and edges referencing non-existent IDs", () => {
    const invalidEdgesWorkflow: AIWorkflowResult = {
      intent: "create_pipeline",
      summary: "Invalid edges",
      milestones: [
        { tempId: "m1", title: "Step 1", checkpoints: [{ title: "T1" }, { title: "T2" }, { title: "T3" }, { title: "T4" }] },
        { tempId: "m2", title: "Step 2", checkpoints: [{ title: "T1" }, { title: "T2" }, { title: "T3" }, { title: "T4" }] },
      ],
      edges: [
        { fromId: "m1", toId: "m1" }, // Self loop!
        { fromId: "m1", toId: "m_nonexistent" }, // Non-existent target!
        { fromId: "m1", toId: "m2" }, // Valid edge
      ],
    };

    const { workflow, report } = validateAndRepairWorkflow(invalidEdgesWorkflow);

    expect(report.brokenEdgesRemoved).toBe(2);
    expect(workflow.edges.length).toBe(1);
    expect(workflow.edges[0]).toEqual({ fromId: "m1", toId: "m2" });
  });
});
