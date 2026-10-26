import { getAWSServiceDefinition } from "../canvas/aws-catalog-lookup";
import { EDGE_TYPES } from "../canvas/types";
import { isAIGenerationMode, type AIGenerationMode, type AIWorkflowResult } from "./types";
import { architectureTopologyIssues } from "./architecture-topology";

/** One semantic safety bar for both providers. Never repair meaning with geometry. */
export function assertSemanticGraph(input: AIWorkflowResult, mode: AIGenerationMode = input.mode || "workflow") {
  const fail = (message: string): never => { throw new Error(`Invalid ${mode} graph: ${message}`); };
  if (!isAIGenerationMode(mode)) fail("choose Workflow or AWS Architecture.");
  for (const field of ["milestones", "edges", "serviceNodes", "groups", "dataFlowEdges", "deletedMilestoneIds", "deletedServiceNodeIds", "deletedGroupIds"] as const) {
    if ((field === "milestones" || field === "edges" || input[field] !== undefined) && !Array.isArray(input[field])) fail(`${field} must be an array.`);
  }
  if (input.mode && input.mode !== mode) fail("the selected request mode cannot be changed.");
  const milestones = input.milestones || [], services = input.serviceNodes || [], groups = input.groups || [];
  const dependencies = input.edges || [], flows = input.dataFlowEdges || [];
  if (mode === "workflow") {
    if (!milestones.length || services.length || groups.length || flows.length || input.deletedServiceNodeIds?.length || input.deletedGroupIds?.length) fail("Workflow requires milestones and dependencies only.");
  } else if (!services.length || milestones.length || dependencies.length || input.deletedMilestoneIds?.length) fail("AWS Architecture requires services, groups and connections only, with no task nodes.");
  if (milestones.length > 60 || services.length > 100 || groups.length > 40 || dependencies.length > 180 || flows.length > 300) fail("graph exceeds the supported node or connection limit.");
  const resources = [...milestones, ...services, ...groups];
  if (resources.some(node => !node || typeof node !== "object")) fail("every node must be an object.");
  const key = (node: { id?: string; tempId?: string }) => node.tempId || node.id || "";
  const ids = resources.map(key);
  if (ids.some(id => typeof id !== "string" || !id.trim() || id.length > 120) || new Set(ids).size !== ids.length) fail("node IDs must be nonempty, unique strings of at most 120 characters.");
  const label = (value: string | undefined, name: string) => { if (typeof value !== "string" || !value.trim() || value.length > 2000) fail(`${name} needs a nonempty label of at most 2,000 characters.`); };
  label(input.summary, "Summary");
  const checkpointIds = new Set<string>();
  for (const node of milestones) {
    label(node.title, key(node));
    if (!Array.isArray(node.checkpoints) || node.checkpoints.length < 1 || node.checkpoints.length > 9) fail(`${key(node)} requires 1–9 meaningful checkpoints; none will be invented or truncated.`);
    node.checkpoints.forEach(cp => {
      if (!cp || typeof cp !== "object") fail(`Invalid checkpoint in ${key(node)}.`);
      label(cp.title, `Checkpoint in ${key(node)}`);
      if (cp.id !== undefined) {
        if (typeof cp.id !== "string" || !cp.id || checkpointIds.has(cp.id)) fail("checkpoint IDs must be nonempty and unique across milestones.");
        checkpointIds.add(cp.id);
      }
    });
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
    if (!Array.isArray(group.childTempIds)) fail(`Children in ${group.tempId} must be an array.`);
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
    for (const edge of edges) {
      if (!edge || typeof edge !== "object") fail("every connection must be an object.");
      if (!allowed.has(edge.fromId) || !allowed.has(edge.toId) || edge.fromId === edge.toId) fail(`Connection ${edge.fromId} → ${edge.toId} must reference distinct declared nodes.`);
    }
  }
  for (const edge of flows) if (!EDGE_TYPES.includes(edge.edgeType) || edge.edgeType === "dependency") fail(`Architecture connection ${edge.fromId} → ${edge.toId} requires an architecture edge type.`);
  if (mode === "aws_architecture") {
    const issues = architectureTopologyIssues(input);
    if (issues.length) fail(issues.join("; "));
  }
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
