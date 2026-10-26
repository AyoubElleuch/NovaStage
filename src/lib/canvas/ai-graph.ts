import { randomUUID } from "node:crypto";
import type { AIWorkflowResult, AIGenerationMode } from "../ai/types";
import type { CanvasNode, CanvasEdge } from "./types";
import { buildGeneratedGraph } from "./generated-graph";
import { validateAndRepairWorkflow } from "../ai/phases/validate";

/** Reconcile entirely in memory; no writes occur until validation and layout succeed. */
export function buildAIGraph(result: AIWorkflowResult, existing: CanvasNode[], mode: AIGenerationMode) {
  const update = result.intent === "update_pipeline";
  const types = mode === "workflow" ? ["milestone"] : ["aws_service", "group"];
  const byId = new Map(existing.map(node => [node.id, node]));
  const aliases = new Map<string, string>();
  const resources = [...result.milestones, ...(result.serviceNodes || []), ...(result.groups || [])];
  for (const resource of resources) {
    const key = resource.tempId || resource.id;
    if (!key) throw new Error("Every generated resource requires an ID.");
    if (resource.id && (!update || !byId.has(resource.id) || !types.includes(byId.get(resource.id)!.node_type || "milestone"))) throw new Error(`Cannot update unknown or other-mode resource ${resource.id}.`);
    const resolved = update && byId.has(resource.id || key) ? resource.id || key : key;
    aliases.set(key, resolved); if (resource.id) aliases.set(resource.id, resolved);
  }
  const resolve = (id: string) => aliases.get(id) || id;
  const workflow = validateAndRepairWorkflow({ ...result, mode,
    milestones: result.milestones.map(node => {
      const key = resolve(node.tempId || node.id!);
      const saved = update ? byId.get(key) : undefined;
      const checkpoints = node.checkpoints.map(cp => ({ ...cp }));
      for (const cp of saved?.checkpoints || []) if (cp.is_completed && !checkpoints.some(next => next.id === cp.id || next.title.trim() === cp.title.trim())) {
        checkpoints.push({ id: cp.id, title: cp.title, isCompleted: true });
      }
      return { ...node, tempId: key, checkpoints };
    }),
    serviceNodes: (result.serviceNodes || []).map(node => ({ ...node, tempId: resolve(node.tempId), parentGroupTempId: node.parentGroupTempId ? resolve(node.parentGroupTempId) : undefined })),
    groups: (result.groups || []).map(node => ({ ...node, tempId: resolve(node.tempId), parentGroupTempId: node.parentGroupTempId ? resolve(node.parentGroupTempId) : undefined, childTempIds: node.childTempIds.map(resolve) })),
    edges: result.edges.map(edge => ({ ...edge, fromId: resolve(edge.fromId), toId: resolve(edge.toId) })),
    dataFlowEdges: (result.dataFlowEdges || []).map(edge => ({ ...edge, fromId: resolve(edge.fromId), toId: resolve(edge.toId) })),
  }).workflow;
  const deletedIds = [...(workflow.deletedMilestoneIds || []), ...(workflow.deletedServiceNodeIds || []), ...(workflow.deletedGroupIds || [])];
  for (const id of deletedIds) if (!update || !byId.has(id) || !types.includes(byId.get(id)!.node_type || "milestone")) throw new Error(`Cannot delete unknown or other-mode resource ${id}.`);
  const keys = new Set([...workflow.milestones, ...(workflow.serviceNodes || []), ...(workflow.groups || [])].map(node => node.tempId!));
  if (deletedIds.some(id => keys.has(id))) throw new Error("A retained resource cannot also be deleted.");
  const retained = update ? existing.filter(node => keys.has(node.id)) : [];
  const untouched = existing.filter(node => !retained.includes(node) && !deletedIds.includes(node.id));
  const graph = buildGeneratedGraph(workflow, untouched, retained);
  const ids = new Map(graph.nodes.map(node => [node.id, retained.some(saved => saved.id === node.id) ? node.id : randomUUID()]));
  const checkpoints = new Map(workflow.milestones.map(node => [node.tempId!, node.checkpoints]));
  const nodes = graph.nodes.map(node => {
    const saved = retained.find(saved => saved.id === node.id);
    const cps = checkpoints.get(node.id) || [];
    return { ...node, id: ids.get(node.id)!, version: saved?.version || 1,
      status: saved?.status || node.status, claimed_by: saved?.claimed_by || null,
      parent_group_id: node.parent_group_id ? ids.get(node.parent_group_id)! : null,
      group_metadata: node.group_metadata ? { ...node.group_metadata, childNodeIds: node.group_metadata.childNodeIds.map(id => ids.get(id)!) } : null,
      checkpoints: node.checkpoints.map((cp, index) => {
        const requested = cps[index];
        const old = saved?.checkpoints.find(old => old.id === requested?.id) || saved?.checkpoints.find(old => old.title.trim() === cp.title.trim());
        if (requested?.id && !old) throw new Error("Checkpoint does not belong to the updated milestone.");
        return { ...cp, id: old?.id || randomUUID(), node_id: ids.get(node.id)!, is_completed: old?.is_completed || requested?.isCompleted || false };
      }),
    };
  });
  const edges: CanvasEdge[] = graph.edges.map(edge => ({ ...edge, id: randomUUID(), source_node_id: ids.get(edge.source_node_id)!, target_node_id: ids.get(edge.target_node_id)! }));
  return { mode, nodes, edges, deletedIds, update, tempIdToUuid: Object.fromEntries(ids) };
}
