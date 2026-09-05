import { graphlib, layout } from "@dagrejs/dagre";
import type { CanvasNode, CanvasEdge } from "./types";

type LayoutNode = Pick<CanvasNode, "id" | "position_x" | "position_y" | "width" | "height"> &
  Partial<Pick<CanvasNode, "node_type" | "parent_group_id" | "group_metadata">>;

export function autoLayoutNodes<Node extends LayoutNode>(
  nodes: Node[],
  edges: Pick<CanvasEdge, "source_node_id" | "target_node_id">[],
  options?: { startX?: number; startY?: number }
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
    const siblings = children.get(parentId) || [];
    siblings.push(node);
    children.set(parentId, siblings);
  }

  const arrange = (parentId?: string): { width: number; height: number } => {
    const siblings = children.get(parentId) || [];
    const graph = new graphlib.Graph().setGraph({
      rankdir: "LR", ranksep: 140, nodesep: 100, marginx: 0, marginy: 0,
    }).setDefaultEdgeLabel(() => ({}));
    for (const node of siblings) {
      if (node.node_type === "group") {
        const content = arrange(node.id);
        node.width = Math.max(node.width || 0, 400, content.width + 112);
        node.height = Math.max(node.height || 0, 300, content.height + 144);
      } else {
        node.width = Math.max(node.width || 0, node.node_type === "aws_service" ? 260 : 320);
        node.height = Math.max(node.height || 0, node.node_type === "aws_service" ? 220 : 300);
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
    for (const edge of edges) {
      const source = representative(edge.source_node_id);
      const target = representative(edge.target_node_id);
      if (source && target && source !== target && graph.hasNode(source) && graph.hasNode(target)) {
        graph.setEdge(source, target);
      }
    }
    if (!siblings.length) return { width: 0, height: 0 };
    layout(graph);
    for (const node of siblings) {
      const position = graph.node(node.id);
      node.position_x = position.x - node.width / 2;
      node.position_y = position.y - node.height / 2;
    }
    return { width: graph.graph().width || 0, height: graph.graph().height || 0 };
  };

  arrange();
  const place = (parentId: string | undefined, originX: number, originY: number) => {
    for (const node of children.get(parentId) || []) {
      node.position_x += originX;
      node.position_y += originY;
      if (node.node_type === "group") place(node.id, node.position_x + 56, node.position_y + 88);
    }
  };
  place(undefined, options?.startX ?? 120, options?.startY ?? 120);
  return nodes.map((node) => byId.get(node.id)!);
}

