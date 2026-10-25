import type { CanvasEdge, CanvasNode } from "./types";

export const isCanvasShareToken = (token: string) => /^[a-f0-9]{64}$/.test(token);

/** Allowlist the public canvas payload. Never spread database rows into it. */
export function publicCanvasData(nodes: CanvasNode[], edges: CanvasEdge[]) {
  return {
    nodes: nodes.map((node): CanvasNode => ({
      id: node.id, project_id: "", title: node.title, description: node.description,
      status: node.status, position_x: node.position_x, position_y: node.position_y,
      width: node.width, height: node.height, color: node.color, sort_order: node.sort_order,
      node_type: node.node_type, parent_group_id: node.parent_group_id,
      claimed_by: null, version: 1,
      checkpoints: node.checkpoints.map(cp => ({
        id: cp.id, node_id: cp.node_id, project_id: "", title: cp.title,
        is_completed: cp.is_completed, sort_order: cp.sort_order,
      })),
      aws_metadata: node.aws_metadata ? {
        serviceId: node.aws_metadata.serviceId, category: node.aws_metadata.category,
        region: node.aws_metadata.region, config: node.aws_metadata.config,
      } : null,
      group_metadata: node.group_metadata ? {
        label: node.group_metadata.label, style: node.group_metadata.style,
        childNodeIds: node.group_metadata.childNodeIds,
      } : null,
      annotation_metadata: node.annotation_metadata ? {
        content: node.annotation_metadata.content, color: node.annotation_metadata.color,
      } : null,
    })),
    edges: edges.map((edge): CanvasEdge => ({
      id: edge.id, project_id: "", source_node_id: edge.source_node_id,
      target_node_id: edge.target_node_id, source_handle: edge.source_handle,
      target_handle: edge.target_handle, edge_type: edge.edge_type, label: edge.label,
    })),
  };
}
