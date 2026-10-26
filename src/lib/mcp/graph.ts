import { randomUUID } from "node:crypto";
import type { CanvasNode, CanvasEdge } from "@/lib/canvas/types";
import type { AIWorkflowResult } from "@/lib/ai/types";
import { normalizeArchitectureTopology } from "@/lib/ai/architecture-topology";
import { autoLayoutNodes } from "@/lib/canvas/auto-layout";
import { createAWSServiceNodeData } from "@/lib/canvas/aws-service-node";
import { architectureHandles } from "@/lib/canvas/architecture-routing";
import { assertWorkflowMode } from "./workflow";
import { isAIGenerationMode } from "@/lib/ai/types";

/** Build the complete graph in memory before one transactional database write. */
export function buildMcpGraph(input: AIWorkflowResult, existing: CanvasNode[]) {
  if (!isAIGenerationMode(input.mode)) throw new Error("Choose Workflow or AWS Architecture.");
  assertWorkflowMode(input, input.mode);
  const workflow = normalizeArchitectureTopology(input);
  const ids = new Map<string, string>();
  const resolve = (id: string) => {
    if (!ids.has(id)) ids.set(id, randomUUID());
    return ids.get(id)!;
  };
  const nodes: CanvasNode[] = [];
  const base = (key: string, title: string, node_type: CanvasNode["node_type"]): CanvasNode => ({
    id: resolve(key), project_id: "", title, node_type, description: "", status: "draft",
    position_x: 0, position_y: 0, width: 320, height: 300, color: "default",
    sort_order: nodes.length, claimed_by: null, version: 1, checkpoints: [],
  });
  for (const milestone of workflow.milestones) {
    nodes.push({ ...base(milestone.tempId!, milestone.title, "milestone"),
      description: milestone.description || "", color: milestone.color || "default",
      checkpoints: milestone.checkpoints.map((cp, sort_order) => ({
        id: randomUUID(), node_id: resolve(milestone.tempId!), project_id: "", title: cp.title, is_completed: false, sort_order,
      })),
    });
  }
  for (const group of workflow.groups || []) {
    nodes.push({ ...base(group.tempId, group.label, "group"), width: 400, height: 300,
      parent_group_id: group.parentGroupTempId ? resolve(group.parentGroupTempId) : null,
      group_metadata: { label: group.label, style: group.style, childNodeIds: group.childTempIds.map(resolve) },
    });
  }
  for (const service of workflow.serviceNodes || []) {
    nodes.push({ ...base(service.tempId, service.name || service.serviceId, "aws_service"),
      ...createAWSServiceNodeData(service.serviceId, service.region, service.config),
      title: service.name || service.serviceId, description: service.description || "",
      parent_group_id: service.parentGroupTempId ? resolve(service.parentGroupTempId) : null,
    });
  }
  const seenEdges = new Set<string>();
  const edges: CanvasEdge[] = [];
  for (const edge of [
    ...workflow.edges.map(edge => ({ ...edge, edgeType: "dependency" as const, label: undefined as string | undefined })),
    ...(workflow.dataFlowEdges || []),
  ]) {
    const source_node_id = resolve(edge.fromId), target_node_id = resolve(edge.toId);
    const key = `${source_node_id}:${target_node_id}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    edges.push({ id: randomUUID(), project_id: "", source_node_id, target_node_id,
      source_handle: "right", target_handle: "left", edge_type: edge.edgeType, label: edge.label || null });
  }
  const startX = existing.length ? Math.max(...existing.map(node => node.position_x + node.width)) + 200 : 100;
  const arranged = autoLayoutNodes(nodes, edges, { startX, startY: 100 });
  const byId = new Map(arranged.map(node => [node.id, node]));
  for (const edge of edges) {
    const handles = architectureHandles(byId.get(edge.source_node_id)!, byId.get(edge.target_node_id)!);
    edge.source_handle = handles.source;
    edge.target_handle = handles.target;
  }
  return { mode: input.mode, nodes: arranged, edges };
}
