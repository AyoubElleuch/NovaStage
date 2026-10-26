import { getAWSServiceDefinition } from "../canvas/aws-catalog-lookup";
import { EDGE_TYPES } from "../canvas/types";
import type { AIGenerationMode, AIWorkflowResult } from "./types";

/** One semantic safety bar for both providers. Never repair meaning with geometry. */
export function assertSemanticGraph(input: AIWorkflowResult, mode: AIGenerationMode = input.mode || "workflow") {
  const fail = (message: string): never => { throw new Error(`Invalid ${mode} graph: ${message}`); };
  if (input.mode && input.mode !== mode) fail("the selected request mode cannot be changed.");
  const milestones = input.milestones || [], services = input.serviceNodes || [], groups = input.groups || [];
  const dependencies = input.edges || [], flows = input.dataFlowEdges || [];
  if (mode === "workflow") {
    if (!milestones.length || services.length || groups.length || flows.length || input.deletedServiceNodeIds?.length || input.deletedGroupIds?.length) fail("Workflow requires milestones and dependencies only.");
  } else if (!services.length || milestones.length || dependencies.length || input.deletedMilestoneIds?.length) fail("AWS Architecture requires services, groups and connections only, with no task nodes.");
  if (milestones.length > 60 || services.length > 100 || groups.length > 40 || dependencies.length > 180 || flows.length > 300) fail("graph exceeds the supported node or connection limit.");
  const resources = [...milestones, ...services, ...groups];
  const key = (node: { id?: string; tempId?: string }) => node.tempId || node.id || "";
  const ids = resources.map(key);
  if (ids.some(id => !id.trim()) || new Set(ids).size !== ids.length) fail("node IDs must be nonempty and unique.");
  const label = (value: string | undefined, name: string) => { if (!value?.trim() || value.length > 2000) fail(`${name} needs a nonempty label of at most 2,000 characters.`); };
  label(input.summary, "Summary");
  for (const node of milestones) {
    label(node.title, key(node));
    if (!Array.isArray(node.checkpoints) || node.checkpoints.length < 1 || node.checkpoints.length > 9) fail(`${key(node)} requires 1–9 meaningful checkpoints; none will be invented or truncated.`);
    node.checkpoints.forEach(cp => label(cp.title, `Checkpoint in ${key(node)}`));
  }
  for (const node of services) {
    if (!getAWSServiceDefinition(node.serviceId)) fail(`Unknown AWS service: ${node.serviceId}. Search the catalog first.`);
    // Catalog names are a safe display fallback for wire formats without a custom label.
    if (node.name !== undefined) label(node.name, node.tempId);
    if (Object.keys(node.config || {}).length > 30 || Object.entries(node.config || {}).some(([k, v]) => k.length > 80 || typeof v !== "string" || v.length > 500)) fail(`Invalid configuration in ${node.tempId}.`);
  }
  const groupIds = new Set(groups.map(node => node.tempId));
  const architectureIds = new Set([...groupIds, ...services.map(node => node.tempId)]);
  const parents = new Map<string, string>();
  const assign = (id: string, parent: string) => {
    if (!groupIds.has(parent) || id === parent || (parents.has(id) && parents.get(id) !== parent)) fail(`Conflicting or invalid parent containment for ${id}.`);
    parents.set(id, parent);
  };
  for (const node of [...groups, ...services]) if (node.parentGroupTempId) assign(node.tempId, node.parentGroupTempId);
  for (const group of groups) {
    label(group.label, group.tempId);
    if (!["vpc", "subnet", "region", "availability_zone", "custom"].includes(group.style)) fail(`Unsupported boundary style in ${group.tempId}.`);
    for (const child of group.childTempIds || []) {
      if (!architectureIds.has(child)) fail(`Unknown child ${child} in ${group.tempId}.`);
      assign(child, group.tempId);
    }
  }
  for (const id of parents.keys()) {
    const seen = new Set([id]); let current = parents.get(id);
    while (current) {
      if (seen.has(current)) fail(`Containment cycle involving ${id}.`);
      seen.add(current); current = parents.get(current);
    }
  }
  const milestoneIds = new Set(milestones.map(key));
  for (const [edges, allowed] of [[dependencies, milestoneIds], [flows, architectureIds]] as const) {
    for (const edge of edges) if (!allowed.has(edge.fromId) || !allowed.has(edge.toId) || edge.fromId === edge.toId) fail(`Connection ${edge.fromId} → ${edge.toId} must reference distinct declared nodes.`);
  }
  for (const edge of flows) if (!EDGE_TYPES.includes(edge.edgeType) || edge.edgeType === "dependency") fail(`Architecture connection ${edge.fromId} → ${edge.toId} requires an architecture edge type.`);
  // Workflow cycles are errors. AWS feedback loops are legitimate directed flow.
  const visited = new Set<string>(), active = new Set<string>();
  const adjacency = new Map([...milestoneIds].map(id => [id, dependencies.filter(edge => edge.fromId === id).map(edge => edge.toId)]));
  const visit = (id: string) => {
    if (active.has(id)) fail(`Dependency cycle involving ${id}; specify an acyclic workflow.`);
    if (visited.has(id)) return;
    active.add(id); (adjacency.get(id) || []).forEach(visit); active.delete(id); visited.add(id);
  };
  milestoneIds.forEach(visit);
}
