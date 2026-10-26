import type { CanvasNode, CanvasEdge } from "@/lib/canvas/types";
import type { AIWorkflowResult } from "@/lib/ai/types";
import { normalizeArchitectureTopology } from "@/lib/ai/architecture-topology";
import { autoLayoutNodes } from "@/lib/canvas/auto-layout";
import { createAWSServiceNodeData } from "@/lib/canvas/aws-service-node";
import { architectureHandles } from "@/lib/canvas/architecture-routing";
import { assertWorkflowMode } from "../mcp/workflow";
import { assertSemanticGraph } from "../ai/semantic-graph";
import { assertCanvasGeometry } from "./geometry-validation";
import { getNodeDimensions } from "./coordinate-math";
import { isAIGenerationMode } from "@/lib/ai/types";

/** Build the complete graph in memory before one transactional database write. */
export function buildGeneratedGraph(input: AIWorkflowResult, existing: CanvasNode[], retained: CanvasNode[] = []) {
  if (!isAIGenerationMode(input.mode)) throw new Error("Choose Workflow or AWS Architecture.");
  assertWorkflowMode(input, input.mode);
  assertSemanticGraph(input);
  const workflow = normalizeArchitectureTopology(input);
  const ids = new Map<string, string>();
  const resolve = (id: string) => {
    if (!ids.has(id)) ids.set(id, id);
    return ids.get(id)!;
  };
  const nodes: CanvasNode[] = [];
  const base = (key: string, title: string, node_type: CanvasNode["node_type"]): CanvasNode => ({
    id: resolve(key), project_id: "", title, node_type, description: "", status: "draft",
    position_x: 0, position_y: 0, width: 320, height: 180, color: "default",
    sort_order: nodes.length, claimed_by: null, version: 1, checkpoints: [],
  });
  for (const milestone of [...workflow.milestones].sort((a, b) => a.tempId!.localeCompare(b.tempId!))) {
    nodes.push({ ...base(milestone.tempId!, milestone.title, "milestone"),
      description: milestone.description || "", color: milestone.color || "default",
      sort_order: ["planning", "architecture", "implementation", "testing", "deployment", "operations"].indexOf(milestone.phase || "implementation"),
      checkpoints: milestone.checkpoints.map((cp, sort_order) => ({
        id: `${milestone.tempId}_checkpoint_${sort_order}`, node_id: resolve(milestone.tempId!), project_id: "", title: cp.title, is_completed: false, sort_order,
      })),
    });
  }
  for (const group of [...(workflow.groups || [])].sort((a, b) => a.tempId.localeCompare(b.tempId))) {
    nodes.push({ ...base(group.tempId, group.label, "group"), width: 400, height: 300,
      parent_group_id: group.parentGroupTempId ? resolve(group.parentGroupTempId) : null,
      group_metadata: { label: group.label, style: group.style, childNodeIds: group.childTempIds.map(resolve) },
    });
  }
  for (const service of [...(workflow.serviceNodes || [])].sort((a, b) => a.tempId.localeCompare(b.tempId))) {
    nodes.push({ ...base(service.tempId, service.name || service.serviceId, "aws_service"),
      ...createAWSServiceNodeData(service.serviceId, service.region, service.config),
      title: service.name || service.serviceId, description: service.description || "",
      parent_group_id: service.parentGroupTempId ? resolve(service.parentGroupTempId) : null,
    });
  }
  for (const node of nodes) {
    const saved = retained.find(saved => saved.id === node.id);
    if (saved && node.node_type !== "group") { node.width = saved.width; node.height = saved.height; }
  }
  const seenEdges = new Set<string>();
  const edges: CanvasEdge[] = [];
  for (const edge of [
    ...workflow.edges.map(edge => ({ ...edge, edgeType: "dependency" as const, label: undefined as string | undefined })),
    ...(workflow.dataFlowEdges || []),
  ]) {
    const source_node_id = resolve(edge.fromId), target_node_id = resolve(edge.toId);
    const key = `${source_node_id}:${target_node_id}:${edge.edgeType}:${edge.label || ""}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    edges.push({ id: `edge_${edges.length}`, project_id: "", source_node_id, target_node_id,
      source_handle: "right", target_handle: "left", edge_type: edge.edgeType, label: edge.label || null });
  }
  const startX = retained.length ? Math.min(...retained.map(node => node.position_x)) : existing.length ? Math.max(...existing.map(node => node.position_x + getNodeDimensions(node).width)) + 200 : 100;
  const startY = retained.length ? Math.min(...retained.map(node => node.position_y)) : 100;
  const arranged = autoLayoutNodes(nodes, edges, { startX, startY });
  const byId = new Map(arranged.map(node => [node.id, node]));
  // Step numbering follows dependency ranks, never the provider's array order.
  [...arranged].sort((a, b) => a.position_x - b.position_x || a.position_y - b.position_y || a.id.localeCompare(b.id))
    .forEach((node, index) => { node.sort_order = index; });
  for (const edge of edges) {
    const handles = architectureHandles(byId.get(edge.source_node_id)!, byId.get(edge.target_node_id)!);
    edge.source_handle = handles.source;
    edge.target_handle = handles.target;
  }
  assertCanvasGeometry(arranged, edges, existing);
  return { mode: input.mode, nodes: arranged, edges };
}
