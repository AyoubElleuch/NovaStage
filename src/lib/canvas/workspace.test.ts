import { describe, expect, it } from "vitest";
import { fitCanvasNodes, getDragNodeIds, getOpenNodePosition, zoomAroundCenter } from "./workspace";
import type { CanvasNode } from "./types";
const node = (id: string, updates: Partial<CanvasNode> = {}): CanvasNode => ({
  id, project_id: "p", title: id, description: "", status: "draft", position_x: 0, position_y: 0,
  width: 280, height: 170, color: "default", sort_order: 0, claimed_by: null, version: 1, checkpoints: [], ...updates,
});
describe("canvas workspace navigation", () => {
  it("keeps the visible center anchored through toolbar zoom, excluding the inspector", () => {
    const previous = { x: -120, y: 80, zoom: 0.75 };
    const next = zoomAroundCenter(previous, 1.5, { width: 1200, height: 800, rightInset: 360 });
    expect((420 - next.x) / next.zoom).toBeCloseTo((420 - previous.x) / previous.zoom);
    expect((400 - next.y) / next.zoom).toBeCloseTo((400 - previous.y) / previous.zoom);
  });
  it("fits negative-position groups in the visible area without hiding them behind controls", () => {
    const group = node("g", { position_x: -800, position_y: -200, width: 1000, height: 650 });
    const view = fitCanvasNodes([group], { width: 1300, height: 900, rightInset: 360 });
    expect(group.position_x * view.zoom + view.x).toBeGreaterThanOrEqual(40);
    expect((group.position_x + group.width) * view.zoom + view.x).toBeLessThanOrEqual(900);
    expect(group.position_y * view.zoom + view.y).toBeGreaterThanOrEqual(80);
  });
  it("moves nested and legacy descendants exactly once and tolerates cycles", () => {
    const nodes = [node("vpc", { node_type: "group", group_metadata: { label: "VPC", style: "vpc", childNodeIds: ["sub"] } }),
      node("sub", { node_type: "group", parent_group_id: "vpc" }), node("svc", { parent_group_id: "sub" }), node("other")];
    expect([...getDragNodeIds(nodes, new Set(["vpc", "svc"]))].sort()).toEqual(["sub", "svc", "vpc"]);
    nodes[0].parent_group_id = "sub";
    expect(getDragNodeIds(nodes, new Set(["vpc"])).size).toBe(3);
  });
  it("places new cards at the visible world center while ignoring containers and notes", () => {
    const area = { width: 1200, height: 800, rightInset: 360 };
    const viewport = { x: -100, y: 50, zoom: 2 };
    const obstacles = [node("group", { node_type: "group", position_x: 0, position_y: 0, width: 1200, height: 1000 }),
      node("note", { node_type: "annotation", position_x: 160, position_y: 96 })];
    const position = getOpenNodePosition(obstacles, viewport, area, { width: 200, height: 150 });
    expect(position).toEqual({ x: 160, y: 96 });
  });
  it("keeps repeated additions clear of both milestones and AWS cards", () => {
    const nodes: CanvasNode[] = [];
    for (let index = 0; index < 12; index++) {
      const dimensions = index % 2 ? { width: 200, height: 220 } : { width: 280, height: 170 };
      const position = getOpenNodePosition(nodes, { x: 0, y: 0, zoom: 1 }, { width: 1000, height: 700 }, dimensions);
      for (const existing of nodes) {
        expect(position.x >= existing.position_x + existing.width + 24 ||
          position.x + dimensions.width + 24 <= existing.position_x ||
          position.y >= existing.position_y + existing.height + 24 ||
          position.y + dimensions.height + 24 <= existing.position_y).toBe(true);
      }
      nodes.push(node(String(index), { position_x: position.x, position_y: position.y, ...dimensions,
        node_type: index % 2 ? "aws_service" : "milestone" }));
    }
  });
  it("ignores stale legacy child IDs when collecting group descendants", () => {
    const nodes = [node("g", { node_type: "group", group_metadata: { label: "Group", style: "custom", childNodeIds: ["deleted", "child"] } }), node("child")];
    expect([...getDragNodeIds(nodes, new Set(["g"]))].sort()).toEqual(["child", "g"]);
  });
});
