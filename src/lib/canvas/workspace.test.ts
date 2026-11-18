import { describe, expect, it } from "vitest";
import {
  alignNodePosition,
  fitCanvasNodes,
  zoomAroundCenter,
  getCanvasNodeAtPoint,
} from "./workspace";
import { routeArchitectureEdge } from "./architecture-routing";
import { getNodeDimensions } from "./coordinate-math";
import type { CanvasNode } from "./types";

const base: CanvasNode = {
  id: "group",
  project_id: "project",
  title: "Network",
  description: "",
  status: "draft",
  position_x: -200,
  position_y: -300,
  width: 900,
  height: 600,
  color: "default",
  sort_order: 0,
  claimed_by: null,
  version: 1,
  checkpoints: [],
  node_type: "group",
  group_metadata: { label: "Network", style: "vpc", childNodeIds: [] },
};
const nodes = [
  base,
  {
    ...base,
    id: "milestone",
    node_type: "milestone" as const,
    position_x: 800,
    position_y: 450,
    width: 280,
    height: 170,
  },
];

describe("canvas fit and zoom", () => {
  it("fits a large generated graph on a phone below the former 15% zoom floor", () => {
    const large = [base, { ...base, id: "far", position_x: 30000, position_y: 1000 }];
    const viewport = fitCanvasNodes(large, { width: 390, height: 844 });
    expect(viewport.zoom).toBeLessThan(0.15);
    for (const node of large) {
      expect(viewport.x + node.position_x * viewport.zoom).toBeGreaterThanOrEqual(24);
      expect(viewport.x + (node.position_x + node.width) * viewport.zoom).toBeLessThanOrEqual(366);
    }
  });
  it("resolves mobile taps to resources inside nested groups, including raised headers", () => {
    const outer = { ...base, position_x: 0, position_y: 0 };
    const inner = {
      ...outer,
      id: "subnet",
      position_x: 50,
      position_y: 50,
      width: 400,
      height: 300,
    };
    const service = {
      ...inner,
      id: "resource",
      node_type: "aws_service" as const,
      position_x: 100,
      position_y: 100,
      width: 200,
      height: 140,
    };
    expect(getCanvasNodeAtPoint([outer, service, inner], { x: 150, y: 150 })?.id).toBe("resource");
    expect(getCanvasNodeAtPoint([outer, service, inner], { x: 60, y: 60 })?.id).toBe("subnet");
    expect(getCanvasNodeAtPoint([outer], { x: 20, y: -12 })?.id).toBe("group");
    expect(getCanvasNodeAtPoint([outer], { x: -10, y: -10 })).toBeUndefined();
  });
  it.each([
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
    { width: 1440, height: 1000, rightInset: 420 },
  ])("keeps fitted cards and raised group headers clear of controls in %o", (area) => {
    const viewport = fitCanvasNodes(nodes, area);
    for (const node of nodes) {
      const dimensions = getNodeDimensions(node);
      const top = viewport.y + node.position_y * viewport.zoom;
      const left = viewport.x + node.position_x * viewport.zoom;
      // The Find control ends at 128px; group labels extend above their bounds.
      expect(top - (node.node_type === "group" ? 24 : 0)).toBeGreaterThanOrEqual(136);
      expect(top + dimensions.height * viewport.zoom).toBeLessThanOrEqual(area.height - 120);
      expect(left).toBeGreaterThanOrEqual(24);
      expect(left + dimensions.width * viewport.zoom).toBeLessThanOrEqual(
        area.width - ("rightInset" in area ? area.rightInset! : 0) - 24,
      );
    }
  });

  it("reserves space for a left-hand guide without changing the other insets", () => {
    const area = { width: 1440, height: 900, leftInset: 340 };
    const viewport = fitCanvasNodes(nodes, area);
    for (const node of nodes) {
      expect(viewport.x + node.position_x * viewport.zoom).toBeGreaterThanOrEqual(
        area.leftInset + 24,
      );
      expect(
        viewport.x + (node.position_x + getNodeDimensions(node).width) * viewport.zoom,
      ).toBeLessThanOrEqual(area.width - 24);
    }
    const initial = { x: 400, y: 170, zoom: 0.6 };
    const next = zoomAroundCenter(initial, 1.2, area);
    const center = { x: area.leftInset + (area.width - area.leftInset) / 2, y: area.height / 2 };
    expect((center.x - next.x) / next.zoom).toBeCloseTo((center.x - initial.x) / initial.zoom);
  });

  it("anchors toolbar zoom in the visible canvas center beside an open drawer", () => {
    const area = { width: 1440, height: 1000, rightInset: 420 };
    const initial = { x: -260, y: 170, zoom: 0.6 };
    const next = zoomAroundCenter(initial, 1.2, area);
    const center = { x: (area.width - area.rightInset) / 2, y: area.height / 2 };
    expect((center.x - next.x) / next.zoom).toBeCloseTo((center.x - initial.x) / initial.zoom);
    expect((center.y - next.y) / next.zoom).toBeCloseTo((center.y - initial.y) / initial.zoom);
  });
});

it("aligns unequal card centers so facing ports form a straight connection", () => {
  const a = { ...nodes[1], id: "a", position_x: 0, position_y: 0 };
  const b = { ...a, id: "b", title: "A much longer title ".repeat(10), position_x: 600 };
  const y = getNodeDimensions(a).height / 2 - getNodeDimensions(b).height / 2;
  const aligned = { ...b, position_y: alignNodePosition(b, { x: 600, y: y + 3 }, [a, b], 1).y };
  expect(aligned.position_y).toBe(y);
  const route = routeArchitectureEdge(a, aligned, "right", "left", [a, aligned]);
  expect(route?.points).toHaveLength(2);
  expect(route?.points[0].y).toBe(route?.points[1].y);
  const obstacle = { ...a, id: "obstacle", position_x: 350, width: 100 };
  expect(
    routeArchitectureEdge(a, aligned, "right", "left", [a, aligned, obstacle])?.points.length,
  ).toBeGreaterThan(2);
  expect(alignNodePosition(b, { x: 603, y: 499 }, [b], 1)).toMatchObject({ x: 608, y: 496 });
});
