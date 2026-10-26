import { getNodeDimensions } from "./coordinate-math";
import type { CanvasNode, CanvasEdge } from "./types";
import { routeArchitectureEdge } from "./architecture-routing";

/** Rendering, routing and persistence must agree on world-space rectangles. */
export function assertCanvasGeometry(nodes: CanvasNode[], edges: CanvasEdge[], existing: CanvasNode[] = []) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  if (byId.size !== nodes.length) throw new Error("Duplicate canvas node IDs.");
  const ancestor = (id: string, parent: string) => {
    const seen = new Set<string>(); let current = byId.get(id)?.parent_group_id;
    while (current) {
      if (seen.has(current)) throw new Error("Canvas containment cycle.");
      seen.add(current); if (current === parent) return true;
      current = byId.get(current)?.parent_group_id;
    }
    return false;
  };
  const overlaps = (a: CanvasNode, b: CanvasNode, gap = 0) => {
    const sa = getNodeDimensions(a), sb = getNodeDimensions(b);
    return a.position_x < b.position_x + sb.width + gap && a.position_x + sa.width + gap > b.position_x &&
      a.position_y < b.position_y + sb.height + gap && a.position_y + sa.height + gap > b.position_y;
  };
  for (const node of nodes) {
    if (![node.position_x, node.position_y, node.width, node.height].every(Number.isFinite) || node.width <= 0 || node.height <= 0) throw new Error(`Invalid canvas rectangle: ${node.id}.`);
    const rendered = getNodeDimensions(node);
    if (rendered.width > node.width || rendered.height > node.height) throw new Error(`Clipped canvas content: ${node.id}.`);
    if (node.parent_group_id) {
      const parent = byId.get(node.parent_group_id);
      if (!parent || parent.node_type !== "group" || ancestor(parent.id, node.id)) throw new Error(`Invalid canvas parent: ${node.id}.`);
      if (node.position_x < parent.position_x + 24 || node.position_y < parent.position_y + 64 ||
        node.position_x + node.width > parent.position_x + parent.width - 24 || node.position_y + node.height > parent.position_y + parent.height - 24) throw new Error(`Canvas containment overflow: ${node.id}.`);
    }
    for (const other of nodes) if (node.id < other.id && !ancestor(node.id, other.id) && !ancestor(other.id, node.id) && overlaps(node, other, 24)) throw new Error(`Insufficient canvas separation: ${node.id}, ${other.id}.`);
    if (existing.some(other => overlaps(node, other, 24))) throw new Error(`Generated canvas collides with existing content: ${node.id}.`);
  }
  for (const edge of edges) {
    const source = byId.get(edge.source_node_id), target = byId.get(edge.target_node_id);
    if (!source || !target) throw new Error("Dangling canvas connection.");
    if (!routeArchitectureEdge(source, target, edge.source_handle, edge.target_handle, nodes)) throw new Error(`No unobstructed route for ${source.id} → ${target.id}.`);
  }
}
