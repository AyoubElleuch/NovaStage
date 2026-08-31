import { describe, expect, it } from "vitest";
import { analyzeReleasePulse } from "./release-pulse";
import type { CanvasEdge, CanvasNode, NodeStatus } from "./types";

function node(id: string, completed: number, total = 1, status: NodeStatus = "in_progress"): CanvasNode {
  return {
    id,
    project_id: "project-1",
    title: `Milestone ${id}`,
    description: "",
    status,
    position_x: 0,
    position_y: 0,
    width: 280,
    height: 170,
    color: "default",
    sort_order: 0,
    claimed_by: null,
    version: 1,
    checkpoints: Array.from({ length: total }, (_, index) => ({
      id: `${id}-${index}`,
      node_id: id,
      project_id: "project-1",
      title: `Task ${index + 1}`,
      is_completed: index < completed,
      sort_order: index,
    })),
  };
}

function edge(source: string, target: string): CanvasEdge {
  return {
    id: `${source}-${target}`,
    project_id: "project-1",
    source_node_id: source,
    target_node_id: target,
    source_handle: "right",
    target_handle: "left",
  };
}

describe("analyzeReleasePulse", () => {
  it("calculates task-weighted readiness and dependency gating", () => {
    const result = analyzeReleasePulse(
      [node("brief", 2, 2), node("build", 1, 2), node("launch", 0, 1)],
      [edge("brief", "build"), edge("build", "launch")]
    );

    expect(result.readiness).toBe(60);
    expect(result.completedNodes).toBe(1);
    expect(result.readyNow.map((item) => item.id)).toEqual(["build"]);
    expect(result.blockedNodes.map((item) => item.id)).toEqual(["launch"]);
  });

  it("finds the longest unfinished chain and ranks blockers by impact", () => {
    const result = analyzeReleasePulse(
      [node("root", 0), node("api", 0), node("ui", 0), node("release", 0)],
      [edge("root", "api"), edge("root", "ui"), edge("api", "release")]
    );

    expect(result.criticalPath.map((item) => item.id)).toEqual(["root", "api", "release"]);
    expect(result.blockers.map((item) => [item.id, item.downstreamCount])).toEqual([
      ["root", 3],
      ["api", 1],
    ]);
  });

  it("prioritizes explicitly blocked work and remains safe for cyclic input", () => {
    const result = analyzeReleasePulse(
      [node("a", 0), node("b", 0, 1, "blocked")],
      [edge("a", "b"), edge("b", "a")]
    );

    expect(result.hasCycle).toBe(true);
    expect(result.blockers[0]).toMatchObject({ id: "b", isExplicitlyBlocked: true });
    expect(result.criticalPath).toHaveLength(1);
  });

  it("returns an empty pulse for an empty canvas", () => {
    expect(analyzeReleasePulse([], [])).toMatchObject({
      readiness: 0,
      completedNodes: 0,
      totalNodes: 0,
      readyNow: [],
      blockedNodes: [],
      blockers: [],
      criticalPath: [],
      hasCycle: false,
    });
  });
});