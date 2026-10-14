import type { AIWorkflowResult } from "../ai/types";
import type { CanvasNode } from "./types";
import { autoLayoutNodes } from "./auto-layout";
import { getNodeDimensions } from "./coordinate-math";
import { AWS_SERVICE_NODE_SIZE } from "./aws-service-node";
import { normalizeArchitectureTopology } from "../ai/architecture-topology";

export function layoutAWSArchitecture(result: AIWorkflowResult, existingNodes: CanvasNode[]) {
  result = normalizeArchitectureTopology(result);
  const groups = result.groups || [];
  const services = result.serviceNodes || [];
  const groupIds = new Set(groups.map((group) => group.tempId));
  const parentOf = (id: string, explicit?: string) =>
    explicit && explicit !== id && groupIds.has(explicit)
      ? explicit
      : groups.find((group) => group.tempId !== id && group.childTempIds?.includes(id))?.tempId;
  const nodes = [
    ...groups.map((group) => ({
      id: group.tempId, node_type: "group" as const,
      position_x: 0, position_y: 0, width: 400, height: 300,
      parent_group_id: parentOf(group.tempId, group.parentGroupTempId),
      group_metadata: { label: group.label, style: group.style, childNodeIds: group.childTempIds || [] },
    })),
    ...services.map((service) => {
      const existing = result.intent === "update_pipeline"
        ? existingNodes.find((node) => node.node_type === "aws_service" && node.id === (service.id || service.tempId))
        : undefined;
      return {
        id: service.tempId, node_type: "aws_service" as const,
        position_x: 0, position_y: 0,
        ...(existing ? getNodeDimensions(existing) : AWS_SERVICE_NODE_SIZE),
        parent_group_id: parentOf(service.tempId, service.parentGroupTempId),
        aws_metadata: { serviceId: service.serviceId },
      };
    }),
  ];
  const existingArchitecture = existingNodes.filter(
    (node) => node.node_type === "aws_service" || node.node_type === "group"
  );
  const isUpdate = result.intent === "update_pipeline" && existingArchitecture.length > 0;
  const startX = isUpdate
    ? Math.min(...existingArchitecture.map((node) => node.position_x))
    : 100;
  const startY = isUpdate
    ? Math.min(...existingArchitecture.map((node) => node.position_y))
    : existingNodes.length
      ? Math.max(...existingNodes.map((node) => node.position_y + getNodeDimensions(node).height)) + 240
      : 100;
  return autoLayoutNodes(nodes, (result.dataFlowEdges || []).map((edge) => ({
    source_node_id: edge.fromId, target_node_id: edge.toId,
    edge_type: edge.edgeType,
  })), { startX, startY, rankSep: 180, nodeSep: 140 });
}
