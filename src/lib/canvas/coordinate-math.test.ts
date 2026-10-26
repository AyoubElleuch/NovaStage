import { describe, it, expect } from "vitest";
import {
  screenToWorld,
  worldToScreen,
  snapToGrid,
  calculateCompletionPercentage,
  isNodeFullyComplete,
  getNodeHandlePosition,
  calculateBezierPath,
  canConnectMilestones,
  detectCycle,
  getCanvasBoundingBox,
  exportToMermaid,
} from "./coordinate-math";
import type { CanvasCheckpoint, CanvasNode, CanvasViewport } from "./types";

describe("Canvas Coordinate Math & DAG Engine", () => {
  const mockViewport: CanvasViewport = { x: 100, y: 50, zoom: 2 };

  it("handles screenToWorld, worldToScreen transformations, and grid snapping accurately", () => {
    const world = screenToWorld(300, 250, mockViewport);
    expect(world).toEqual({ x: 100, y: 100 });

    const screen = worldToScreen(100, 100, mockViewport);
    expect(screen).toEqual({ x: 300, y: 250 });

    expect(snapToGrid(7)).toBe(0);
    expect(snapToGrid(8)).toBe(16);
    expect(snapToGrid(24, 20)).toBe(20);
  });

  it("evaluates checkpoint completion percentages and node status", () => {
    expect(calculateCompletionPercentage([])).toBe(0);

    const checkpoints: CanvasCheckpoint[] = [
      { id: "1", node_id: "n1", project_id: "p1", title: "Task 1", is_completed: true, sort_order: 0, completed_at: null, completed_by: null, created_at: "", updated_at: "" },
      { id: "2", node_id: "n1", project_id: "p1", title: "Task 2", is_completed: false, sort_order: 1, completed_at: null, completed_by: null, created_at: "", updated_at: "" },
    ];
    expect(calculateCompletionPercentage(checkpoints)).toBe(50);

    const node: CanvasNode = {
      id: "n1", project_id: "p1", title: "Milestone", description: "", status: "in_progress",
      position_x: 0, position_y: 0, width: 280, height: 170, color: "default", sort_order: 0,
      claimed_by: null, version: 1, created_at: "", updated_at: "", checkpoints,
    };
    expect(isNodeFullyComplete(node)).toBe(false);

    node.checkpoints[1].is_completed = true;
    expect(isNodeFullyComplete(node)).toBe(true);
  });

  it("calculates node handle positions and cubic bezier paths", () => {
    const node: CanvasNode = {
      id: "n1", project_id: "p1", title: "Test", description: "", status: "draft",
      position_x: 100, position_y: 200, width: 300, height: 150, color: "default",
      sort_order: 0, claimed_by: null, version: 1, created_at: "", updated_at: "", checkpoints: [],
    };

    expect(getNodeHandlePosition(node, "right")).toEqual({ x: 400, y: 281 });
    expect(getNodeHandlePosition(node, "left")).toEqual({ x: 100, y: 281 });
    expect(getNodeHandlePosition(node, "top")).toEqual({ x: 250, y: 200 });
    expect(getNodeHandlePosition(node, "bottom")).toEqual({ x: 250, y: 362 });

    const path = calculateBezierPath(100, 100, 400, 300, "right", "left");
    expect(path).toMatch(/^M 100 100 C \d+(\.\d+)? \d+(\.\d+)?, \d+(\.\d+)? \d+(\.\d+)?, 400 300$/);
  });

  it("enforces milestone connection permissions and claim lock rules", () => {
    const futureDate = new Date(Date.now() + 60000).toISOString();
    const pastDate = new Date(Date.now() - 60000).toISOString();

    const claimedNode = { claimed_by: "user-1", claim_expires_at: futureDate };
    const unclaimedNode = { claimed_by: null, claim_expires_at: null };
    const otherUserClaim = { claimed_by: "user-2", claim_expires_at: futureDate };
    const expiredClaim = { claimed_by: "user-1", claim_expires_at: pastDate };

    expect(canConnectMilestones(claimedNode, unclaimedNode, "user-1")).toBe(true);
    expect(canConnectMilestones(unclaimedNode, claimedNode, "user-1")).toBe(true);
    expect(canConnectMilestones(otherUserClaim, unclaimedNode, "user-1")).toBe(false);
    expect(canConnectMilestones(expiredClaim, unclaimedNode, "user-1")).toBe(false);
    expect(canConnectMilestones(otherUserClaim, unclaimedNode, "user-1", true)).toBe(true);
  });

  it("detects self-loops and circular dependencies via DFS while allowing valid DAG branches", () => {
    const edges = [
      { id: "e1", project_id: "p1", source_node_id: "n1", target_node_id: "n2", source_handle: "right" as const, target_handle: "left" as const },
      { id: "e2", project_id: "p1", source_node_id: "n2", target_node_id: "n3", source_handle: "right" as const, target_handle: "left" as const },
    ];

    expect(detectCycle(edges, { sourceNodeId: "n1", targetNodeId: "n1" })).toBe(true);
    expect(detectCycle(edges, { sourceNodeId: "n3", targetNodeId: "n1" })).toBe(true);
    expect(detectCycle(edges, { sourceNodeId: "n3", targetNodeId: "n4" })).toBe(false);
  });

  it("calculates accurate bounding boxes and exports valid Mermaid DAG syntax", () => {
    const mockNodes: CanvasNode[] = [
      {
        id: "n1", project_id: "p1", title: "Auth", description: "", status: "completed",
        position_x: 100, position_y: 100, width: 200, height: 100, color: "default",
        sort_order: 0, claimed_by: null, version: 1, created_at: "", updated_at: "", checkpoints: [],
      },
      {
        id: "n2", project_id: "p1", title: "API", description: "", status: "draft",
        position_x: 400, position_y: 300, width: 200, height: 100, color: "default",
        sort_order: 1, claimed_by: null, version: 1, created_at: "", updated_at: "", checkpoints: [],
      },
    ];

    const box = getCanvasBoundingBox(mockNodes, 50);
    expect(box).toMatchObject({ minX: 50, maxX: 650, minY: 50, maxY: 512, width: 600, height: 462 });

    const edges = [{ id: "e1", project_id: "p1", source_node_id: "n1", target_node_id: "n2", source_handle: "right" as const, target_handle: "left" as const }];
    const mermaid = exportToMermaid(mockNodes, edges);
    expect(mermaid).toContain("graph LR");
    expect(mermaid).toContain("n1 --> n2");
  });
});
