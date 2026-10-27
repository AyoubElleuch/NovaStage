import { describe, expect, it } from "vitest";
import { getNodeDimensions } from "@/lib/canvas/coordinate-math";
import { createInitialGraph } from "./sandbox-state";

describe("landing canvas architecture", () => {
  for (const compact of [false, true]) {
    it(`keeps resources separated and within their groups (${compact ? "phone" : "desktop"})`, () => {
      const { nodes, edges } = createInitialGraph(compact);
      const resources = nodes.filter((node) => node.node_type === "aws_service");
      for (const [index, node] of resources.entries()) {
        const size = getNodeDimensions(node);
        for (const other of resources.slice(index + 1)) {
          const otherSize = getNodeDimensions(other);
          const overlap = node.position_x < other.position_x + otherSize.width && node.position_x + size.width > other.position_x &&
            node.position_y < other.position_y + otherSize.height && node.position_y + size.height > other.position_y;
          expect(overlap, `${node.title} overlaps ${other.title}`).toBe(false);
        }
      }
      for (const group of nodes.filter((node) => node.node_type === "group")) {
        for (const id of group.group_metadata?.childNodeIds || []) {
          const child = nodes.find((node) => node.id === id)!;
          const size = getNodeDimensions(child);
          expect(child.position_x - group.position_x).toBeGreaterThanOrEqual(60);
          expect(child.position_y - group.position_y).toBeGreaterThanOrEqual(60);
          expect(group.position_x + group.width - child.position_x - size.width).toBeGreaterThanOrEqual(60);
          expect(group.position_y + group.height - child.position_y - size.height).toBeGreaterThanOrEqual(20);
        }
      }
      for (const edge of edges) {
        expect(nodes.some((node) => node.id === edge.source_node_id)).toBe(true);
        expect(nodes.some((node) => node.id === edge.target_node_id)).toBe(true);
      }
    });
  }
});
