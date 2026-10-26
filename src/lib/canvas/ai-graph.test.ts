import { describe, expect, it } from "vitest";
import { sampleArchitecture, sampleWorkflow } from "../mcp/test-fixtures";
import { buildAIGraph } from "./ai-graph";

describe("built-in in-memory reconciliation", () => {
  it("preserves retained IDs, completed checkpoints, claims and the diagram anchor", () => {
    const created = buildAIGraph({ ...sampleWorkflow(), intent: "create_pipeline" }, [], "workflow");
    const existing = created.nodes;
    existing[0].position_x = 500; existing[0].position_y = 700;
    existing[0].checkpoints[0].is_completed = true;
    existing[0].claimed_by = "owner";
    const update = { ...sampleWorkflow(), intent: "update_pipeline" as const };
    update.milestones = update.milestones.map(m => {
      const old = existing.find(n => n.title === m.title)!;
      return { ...m, id: old.id, tempId: old.id, checkpoints: old.checkpoints.slice(1).map(cp => ({ id: cp.id, title: cp.title })) };
    });
    update.edges = [{ fromId: update.milestones[0].tempId, toId: update.milestones[1].tempId }];
    const before = structuredClone(existing);
    const graph = buildAIGraph(update, existing, "workflow");
    expect(graph.nodes.map(n => n.id).sort()).toEqual(existing.map(n => n.id).sort());
    expect(graph.nodes.find(n => n.id === existing[0].id)!.claimed_by).toBe("owner");
    expect(graph.nodes.flatMap(n => n.checkpoints).find(cp => cp.id === existing[0].checkpoints[0].id)?.is_completed).toBe(true);
    expect(existing).toEqual(before);
  });
  it("appends AWS beside tasks and rejects another mode's updates or deletions", () => {
    const tasks = buildAIGraph({ ...sampleWorkflow(), intent: "create_pipeline" }, [], "workflow").nodes;
    const architecture = buildAIGraph({ ...sampleArchitecture(), intent: "create_pipeline" }, tasks, "aws_architecture");
    expect(Math.min(...architecture.nodes.map(n => n.position_x))).toBeGreaterThan(Math.max(...tasks.map(n => n.position_x + n.width)));
    expect(() => buildAIGraph({ ...sampleArchitecture(), intent: "update_pipeline", deletedMilestoneIds: [tasks[0].id] }, tasks, "aws_architecture")).toThrow();
    expect(() => buildAIGraph({ ...sampleArchitecture(), intent: "update_pipeline", serviceNodes: [{ ...sampleArchitecture().serviceNodes[0], id: tasks[0].id }] }, tasks, "aws_architecture")).toThrow(/other-mode/);
  });
});
