import type { AIWorkflowResult } from "../ai/types";
import type { CanvasNode } from "./types";
import { autoLayoutNodes } from "./auto-layout";

export function layoutAWSArchitecture(result: AIWorkflowResult, existingNodes: CanvasNode[]) {
  const groups = result.groups || [];
  const services = result.serviceNodes || [];
  const groupIds = new Set(groups.map((group) => group.tempId));
  const parentOf = (id: string, explicit?: string) =>
    explicit && groupIds.has(explicit) ? explicit : groups.find((group) => group.childTempIds?.includes(id))?.tempId;
  const nodes = [
    ...groups.map((group) => ({
      id: group.tempId, node_type: "group" as const,
      position_x: 0, position_y: 0, width: 400, height: 300,
      parent_group_id: parentOf(group.tempId, group.parentGroupTempId),
      group_metadata: { label: group.label, style: group.style, childNodeIds: group.childTempIds || [] },
    })),
    ...services.map((service) => ({
      id: service.tempId, node_type: "aws_service" as const,
      position_x: 0, position_y: 0, width: 260, height: 220,
      parent_group_id: parentOf(service.tempId, service.parentGroupTempId),
    })),
  ];
  const existingArchitecture = existingNodes.filter(
    (node) => node.node_type === "aws_service" || node.node_type === "group"
  );
  const isUpdate = result.intent === "update_pipeline" && existingArchitecture.length > 0;
  const startX = isUpdate
    ? Math.min(...existingArchitecture.map((node) => node.position_x))
    : 100;
  const nonArchitectureNodes = existingNodes.filter(
    (node) => node.node_type !== "aws_service" && node.node_type !== "group"
  );
  const startY = isUpdate
    ? Math.min(...existingArchitecture.map((node) => node.position_y))
    : nonArchitectureNodes.length
      ? Math.max(...nonArchitectureNodes.map((node) => node.position_y + node.height)) + 240
      : 100;
  return autoLayoutNodes(nodes, (result.dataFlowEdges || []).map((edge) => ({
    source_node_id: edge.fromId, target_node_id: edge.toId,
  })), { startX, startY, rankSep: 180, nodeSep: 140 });
}
