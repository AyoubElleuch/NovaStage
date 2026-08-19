import { describe, it, expect } from "vitest";
import {
  screenToWorld,
  worldToScreen,
  snapToGrid,
  calculateCompletionPercentage,
  isNodeFullyComplete,
  getNodeHandlePosition,
  getBezierControlPoints,
  calculateBezierPath,
  getUserColor,
  canConnectMilestones,
} from "./coordinate-math";
import type { CanvasCheckpoint, CanvasNode, CanvasViewport } from "./types";

describe("Canvas Coordinate Math & Utilities", () => {
  const mockViewport: CanvasViewport = { x: 100, y: 50, zoom: 2 };

  describe("screenToWorld & worldToScreen transformations", () => {
    it("transforms screen coordinates to world coordinates", () => {
      const world = screenToWorld(300, 250, mockViewport);
      // (300 - 100) / 2 = 100; (250 - 50) / 2 = 100
      expect(world.x).toBe(100);
      expect(world.y).toBe(100);
    });

    it("transforms world coordinates to screen coordinates", () => {
      const screen = worldToScreen(100, 100, mockViewport);
      // 100 * 2 + 100 = 300; 100 * 2 + 50 = 250
      expect(screen.x).toBe(300);
      expect(screen.y).toBe(250);
    });

    it("is symmetrical (screen -> world -> screen)", () => {
      const originalScreen = { x: 450, y: 320 };
      const world = screenToWorld(originalScreen.x, originalScreen.y, mockViewport);
      const backToScreen = worldToScreen(world.x, world.y, mockViewport);
      expect(backToScreen.x).toBeCloseTo(originalScreen.x);
      expect(backToScreen.y).toBeCloseTo(originalScreen.y);
    });
  });

  describe("snapToGrid", () => {
    it("snaps values to nearest default 16px grid", () => {
      expect(snapToGrid(0)).toBe(0);
      expect(snapToGrid(7)).toBe(0);
      expect(snapToGrid(8)).toBe(16);
      expect(snapToGrid(15)).toBe(16);
      expect(snapToGrid(33)).toBe(32);
    });

    it("supports custom grid sizes", () => {
      expect(snapToGrid(24, 20)).toBe(20);
      expect(snapToGrid(35, 20)).toBe(40);
    });
  });

  describe("calculateCompletionPercentage", () => {
    it("returns 0 for empty checkpoints array", () => {
      expect(calculateCompletionPercentage([])).toBe(0);
    });

    it("calculates percentage accurately", () => {
      const checkpoints: CanvasCheckpoint[] = [
        { id: "1", node_id: "n1", project_id: "p1", title: "Task 1", is_completed: true, sort_order: 0, completed_at: null, completed_by: null, created_at: "", updated_at: "" },
        { id: "2", node_id: "n1", project_id: "p1", title: "Task 2", is_completed: false, sort_order: 1, completed_at: null, completed_by: null, created_at: "", updated_at: "" },
      ];
      expect(calculateCompletionPercentage(checkpoints)).toBe(50);
    });

    it("returns 100 when all checkpoints are completed", () => {
      const checkpoints: CanvasCheckpoint[] = [
        { id: "1", node_id: "n1", project_id: "p1", title: "Task 1", is_completed: true, sort_order: 0, completed_at: null, completed_by: null, created_at: "", updated_at: "" },
      ];
      expect(calculateCompletionPercentage(checkpoints)).toBe(100);
    });
  });

  describe("isNodeFullyComplete", () => {
    it("evaluates checkpoint completion when checkpoints are present", () => {
      const node: CanvasNode = {
        id: "n1",
        project_id: "p1",
        title: "Test",
        description: "",
        status: "in_progress",
        position_x: 0,
        position_y: 0,
        width: 280,
        height: 170,
        color: "default",
        sort_order: 0,
        claimed_by: null,
        version: 1,
        created_at: "",
        updated_at: "",
        checkpoints: [
          { id: "1", node_id: "n1", project_id: "p1", title: "Task 1", is_completed: true, sort_order: 0, completed_at: null, completed_by: null, created_at: "", updated_at: "" },
          { id: "2", node_id: "n1", project_id: "p1", title: "Task 2", is_completed: true, sort_order: 1, completed_at: null, completed_by: null, created_at: "", updated_at: "" },
        ],
      };
      expect(isNodeFullyComplete(node)).toBe(true);
    });

    it("falls back to status === 'completed' when node has no checkpoints", () => {
      const node: CanvasNode = {
        id: "n1",
        project_id: "p1",
        title: "Test",
        description: "",
        status: "completed",
        position_x: 0,
        position_y: 0,
        width: 280,
        height: 170,
        color: "default",
        sort_order: 0,
        claimed_by: null,
        version: 1,
        created_at: "",
        updated_at: "",
        checkpoints: [],
      };
      expect(isNodeFullyComplete(node)).toBe(true);
    });
  });

  describe("getNodeHandlePosition", () => {
    const node: CanvasNode = {
      id: "n1",
      project_id: "p1",
      title: "Test",
      description: "",
      status: "draft",
      position_x: 100,
      position_y: 200,
      width: 300,
      height: 150,
      color: "default",
      sort_order: 0,
      claimed_by: null,
      version: 1,
      created_at: "",
      updated_at: "",
      checkpoints: [],
    };

    it("calculates right handle position correctly", () => {
      const pos = getNodeHandlePosition(node, "right");
      expect(pos.x).toBe(400); // 100 + 300
      expect(pos.y).toBe(275); // 200 + 150/2
    });

    it("calculates left handle position correctly", () => {
      const pos = getNodeHandlePosition(node, "left");
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(275);
    });

    it("calculates top handle position correctly", () => {
      const pos = getNodeHandlePosition(node, "top");
      expect(pos.x).toBe(250); // 100 + 300/2
      expect(pos.y).toBe(200);
    });

    it("calculates bottom handle position correctly", () => {
      const pos = getNodeHandlePosition(node, "bottom");
      expect(pos.x).toBe(250);
      expect(pos.y).toBe(350); // 200 + 150
    });
  });

  describe("calculateBezierPath & getBezierControlPoints", () => {
    it("generates a valid SVG cubic bezier path string", () => {
      const path = calculateBezierPath(100, 100, 400, 300, "right", "left");
      expect(path).toMatch(/^M 100 100 C \d+(\.\d+)? \d+(\.\d+)?, \d+(\.\d+)? \d+(\.\d+)?, 400 300$/);
    });

    it("calculates control points with curvature constraints", () => {
      const { cx1, cy1, cx2, cy2 } = getBezierControlPoints(100, 100, 500, 100, "right", "left");
      expect(cx1).toBeGreaterThan(100);
      expect(cx2).toBeLessThan(500);
      expect(cy1).toBe(100);
      expect(cy2).toBe(100);
    });
  });

  describe("getUserColor", () => {
    it("generates deterministic colors for user IDs", () => {
      const color1 = getUserColor("user-12345");
      const color2 = getUserColor("user-12345");
      expect(color1).toBe(color2);
      expect(color1).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("handles empty user ID gracefully", () => {
      expect(getUserColor("")).toBeDefined();
    });
  });

  describe("canConnectMilestones", () => {
    const futureDate = new Date(Date.now() + 60000).toISOString();
    const pastDate = new Date(Date.now() - 60000).toISOString();

    it("allows connecting if source milestone is claimed by user", () => {
      const nodeA = { claimed_by: "user-1", claim_expires_at: futureDate };
      const nodeB = { claimed_by: null, claim_expires_at: null };
      expect(canConnectMilestones(nodeA, nodeB, "user-1")).toBe(true);
    });

    it("allows connecting if target milestone is claimed by user", () => {
      const nodeA = { claimed_by: null, claim_expires_at: null };
      const nodeB = { claimed_by: "user-1", claim_expires_at: futureDate };
      expect(canConnectMilestones(nodeA, nodeB, "user-1")).toBe(true);
    });

    it("allows connecting if target is claimed by another user but source is claimed by current user", () => {
      const nodeA = { claimed_by: "user-1", claim_expires_at: futureDate };
      const nodeB = { claimed_by: "user-2", claim_expires_at: futureDate };
      expect(canConnectMilestones(nodeA, nodeB, "user-1")).toBe(true);
    });

    it("disallows connecting if neither milestone is claimed by user", () => {
      const nodeA = { claimed_by: "user-2", claim_expires_at: futureDate };
      const nodeB = { claimed_by: null, claim_expires_at: null };
      expect(canConnectMilestones(nodeA, nodeB, "user-1")).toBe(false);
    });

    it("disallows connecting if claimed lease has expired", () => {
      const nodeA = { claimed_by: "user-1", claim_expires_at: pastDate };
      const nodeB = { claimed_by: null, claim_expires_at: null };
      expect(canConnectMilestones(nodeA, nodeB, "user-1")).toBe(false);
    });

    it("always allows project owner to connect milestones", () => {
      const nodeA = { claimed_by: "user-2", claim_expires_at: futureDate };
      const nodeB = { claimed_by: null, claim_expires_at: null };
      expect(canConnectMilestones(nodeA, nodeB, "user-1", true)).toBe(true);
    });
  });
});
