import { graphlib, layout } from "@dagrejs/dagre";
import type { CanvasNode, CanvasEdge } from "./types";
import { getNodeDimensions } from "./coordinate-math";

type LayoutNode = Pick<CanvasNode, "id" | "position_x" | "position_y" | "width" | "height"> &
  Partial<Pick<CanvasNode, "node_type" | "parent_group_id" | "group_metadata" | "title" | "checkpoints" | "sort_order">> & { aws_metadata?: { serviceId: string; config?: Record<string, string> } | null };

export function autoLayoutNodes<Node extends LayoutNode>(
  nodes: Node[],
  edges: (Pick<CanvasEdge, "source_node_id" | "target_node_id"> & Partial<Pick<CanvasEdge, "edge_type">>)[],
  options?: { startX?: number; startY?: number; rankSep?: number; nodeSep?: number }
): Node[] {
  if (nodes.length === 0) return [];
  const byId = new Map(nodes.map((node) => [node.id, { ...node }]));
  const parents = new Map<string, string>();
  const assignParent = (childId: string, parentId: string) => {
    if (!byId.has(childId) || byId.get(parentId)?.node_type !== "group" || parents.has(childId)) return;
    let ancestor: string | undefined = parentId;
    while (ancestor) {
      if (ancestor === childId) return;
      ancestor = parents.get(ancestor);
    }
    parents.set(childId, parentId);
  };
  for (const node of nodes) {
    if (node.parent_group_id) assignParent(node.id, node.parent_group_id);
  }
  for (const node of nodes) {
    if (node.node_type === "group") {
      for (const childId of node.group_metadata?.childNodeIds || []) assignParent(childId, node.id);
    }
  }

  const children = new Map<string | undefined, Node[]>();
  for (const node of byId.values()) {
    const parentId = parents.get(node.id);
    node.parent_group_id = parentId;
    const siblings = children.get(parentId) || [];
    siblings.push(node);
    children.set(parentId, siblings);
  }

  const supportServices = new Set(["kms", "secretsmanager", "cloudwatch", "cloudtrail", "config", "iam", "certificatemanager"]);
  const auxiliary = new Set(nodes.filter(node => node.node_type === "aws_service" &&
    supportServices.has(node.aws_metadata?.serviceId || "")).map(node => node.id));
  // Security and telemetry relations are real edges, but should not reverse the request path.
  const flowEdges = edges.filter(edge => !auxiliary.has(edge.source_node_id) && !auxiliary.has(edge.target_node_id) && edge.edge_type !== "security_iam");
  const global = new graphlib.Graph().setGraph({ rankdir: "LR" }).setDefaultEdgeLabel(() => ({}));
  for (const node of nodes.filter(node => node.node_type !== "group" && !auxiliary.has(node.id)).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id.localeCompare(b.id))) global.setNode(node.id, { width: 1, height: 1 });
  for (const edge of [...flowEdges].sort((a, b) => `${a.source_node_id}:${a.target_node_id}`.localeCompare(`${b.source_node_id}:${b.target_node_id}`))) if (global.hasNode(edge.source_node_id) && global.hasNode(edge.target_node_id)) global.setEdge(edge.source_node_id, edge.target_node_id);
  if (global.nodeCount()) layout(global);
  const orderedEdges = [...flowEdges].sort((a, b) => (global.node(a.source_node_id)?.x ?? 0) - (global.node(b.source_node_id)?.x ?? 0) ||
    `${a.source_node_id}:${a.target_node_id}`.localeCompare(`${b.source_node_id}:${b.target_node_id}`));
  const globalOrder = (node: Node): { x: number; y: number } => {
    const leaves = node.node_type === "group" ? (children.get(node.id) || []).map(globalOrder) : [global.node(node.id) || { x: 0, y: 0 }];
    return { x: leaves.length ? Math.min(...leaves.map(leaf => leaf.x)) : 0, y: leaves.reduce((sum, leaf) => sum + leaf.y, 0) / (leaves.length || 1) };
  };

  const arrange = (parentId?: string): { width: number; height: number } => {
    const siblings = [...(children.get(parentId) || [])].sort((a, b) => globalOrder(a).y - globalOrder(b).y || a.id.localeCompare(b.id));
    const graph = new graphlib.Graph().setGraph({
      rankdir: "LR",
      ranksep: options?.rankSep ?? 160,
      nodesep: options?.nodeSep ?? 120,
      marginx: 0,
      marginy: 0,
    }).setDefaultEdgeLabel(() => ({}));
    for (const node of siblings) {
      if (node.node_type === "group") {
        const content = arrange(node.id);
        // Keep a visible safety buffer between a boundary and its direct children.
        // The larger top inset protects the floating group label from child cards.
        node.width = Math.max(320, Math.min(600, (node.group_metadata?.label.length || 0) * 7 + 160), content.width + 144);
        node.height = Math.max(240, content.height + 184);
      } else {
        Object.assign(node, getNodeDimensions(node as Parameters<typeof getNodeDimensions>[0]));
      }
      graph.setNode(node.id, { width: node.width, height: node.height });
    }
    const representative = (nodeId: string) => {
      if (!byId.has(nodeId)) return undefined;
      let current = nodeId;
      while (parents.get(current) !== parentId) {
        const parent = parents.get(current);
        if (!parent) return undefined;
        current = parent;
      }
      return current;
    };
    const reaches = (source: string, target: string, seen = new Set<string>()): boolean => {
      if (source === target) return true;
      if (seen.has(source)) return false;
      seen.add(source);
      return (graph.successors(source) || []).some(next => reaches(next, target, seen));
    };
    for (const edge of orderedEdges) {
      const source = representative(edge.source_node_id);
      const target = representative(edge.target_node_id);
      if (source && target && source !== target && graph.hasNode(source) && graph.hasNode(target)) {
        // Collapsing a group can create a cycle that does not exist among its
        // leaves. Keep the forward projection; the real feedback edge is still rendered.
        if (!reaches(target, source)) graph.setEdge(source, target);
      }
    }
    if (!siblings.length) return { width: 0, height: 0 };
    // A local scope can have no internal edges even though its children occupy
    // different stages in the global graph (for example two cross-AZ tiers).
    const ranked = siblings.filter(node => !auxiliary.has(node.id)).sort((a, b) => globalOrder(a).x - globalOrder(b).x || a.id.localeCompare(b.id));
    for (let i = 0; i < ranked.length - 1; i++) {
      const source = ranked[i], target = ranked[i + 1];
      if (globalOrder(source).x < globalOrder(target).x && !(graph.nodeEdges(source.id)?.length)) graph.setEdge(source.id, target.id);
    }
    const detached = siblings.filter(node => auxiliary.has(node.id) || (siblings.length > 1 && !graph.nodeEdges(node.id)?.length));
    const detachedIds = new Set(detached.map(node => node.id));
    for (const node of detached) graph.removeNode(node.id);
    if (graph.nodeCount()) layout(graph);
    for (const node of siblings.filter(node => !detachedIds.has(node.id))) {
      const position = graph.node(node.id);
      node.position_x = position.x - node.width / 2;
      node.position_y = position.y - node.height / 2;
    }
    let width = graph.graph().width || 0;
    let height = graph.graph().height || 0;
    // Pack disconnected/support nodes below the main flow, in a bounded shelf.
    // Never fabricate connections solely to obtain a nicer layout.
    const columns = detached.some(node => node.node_type === "group") ? 1 : Math.max(1, Math.ceil(Math.sqrt(detached.length)));
    const cellWidth = Math.max(0, ...detached.map(node => node.width)) + (options?.nodeSep ?? 120);
    let rowY = height ? height + (options?.nodeSep ?? 120) : 0;
    for (let i = 0; i < detached.length; i += columns) {
      const row = detached.slice(i, i + columns);
      const rowWidth = (row.length - 1) * cellWidth + Math.max(...row.map(node => node.width));
      const rowX = Math.max(0, (width - rowWidth) / 2);
      row.forEach((node, column) => { node.position_x = rowX + column * cellWidth; node.position_y = rowY; });
      width = Math.max(width, rowWidth);
      height = rowY + Math.max(...row.map(node => node.height));
      rowY = height + (options?.nodeSep ?? 120);
    }
    return { width, height };
  };

  arrange();
  const place = (parentId: string | undefined, originX: number, originY: number) => {
    for (const node of children.get(parentId) || []) {
      node.position_x += originX;
      node.position_y += originY;
      if (node.node_type === "group") place(node.id, node.position_x + 72, node.position_y + 104);
    }
  };
  place(undefined, options?.startX ?? 120, options?.startY ?? 120);
  // Dagre connects to a container's center; rendered edges connect to its actual
  // child cards. Align external cards to those ports, propagating back through ingress.
  const roots = children.get(undefined) || [];
  const aligned = new Set(nodes.filter(node => parents.has(node.id) && node.node_type !== "group").map(node => node.id));
  for (let pass = 0; pass < roots.length; pass++) {
    let changed = false;
    for (const node of roots) {
      if (node.node_type === "group" || auxiliary.has(node.id) || aligned.has(node.id)) continue;
      const neighbors = flowEdges.flatMap(edge => edge.source_node_id === node.id ? [edge.target_node_id] : edge.target_node_id === node.id ? [edge.source_node_id] : [])
        .filter(id => aligned.has(id)).map(id => byId.get(id)!);
      if (!neighbors.length) continue;
      const desiredY = neighbors.reduce((sum, neighbor) => sum + neighbor.position_y + neighbor.height / 2, 0) / neighbors.length - node.height / 2;
      const overlaps = roots.some(other => other.id !== node.id &&
        node.position_x < other.position_x + other.width && node.position_x + node.width > other.position_x &&
        desiredY < other.position_y + other.height + 40 && desiredY + node.height + 40 > other.position_y);
      if (!overlaps && desiredY >= (options?.startY ?? 120)) node.position_y = desiredY;
      aligned.add(node.id);
      changed = true;
    }
    if (!changed) break;
  }
  return nodes.map((node) => byId.get(node.id)!);
}
