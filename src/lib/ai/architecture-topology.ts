import type { AIWorkflowResult } from "./types";

/** Resolve containment once, before either quality checks or canvas persistence. */
export function normalizeArchitectureTopology(result: AIWorkflowResult): AIWorkflowResult {
  const groups = (result.groups || []).map(group => ({ ...group, childTempIds: [...(group.childTempIds || [])] }));
  const services = (result.serviceNodes || []).map(service => ({ ...service }));
  const byId = new Map(groups.map(group => [group.tempId, group]));
  const resources = [...groups, ...services];
  for (const node of resources) {
    const candidate = node.parentGroupTempId || groups.find(group => group.childTempIds.includes(node.tempId))?.tempId;
    node.parentGroupTempId = candidate && candidate !== node.tempId && byId.has(candidate) ? candidate : undefined;
  }
  for (const group of groups) {
    const seen = new Set([group.tempId]);
    let parent = group.parentGroupTempId;
    while (parent) {
      if (seen.has(parent)) { group.parentGroupTempId = undefined; break; }
      seen.add(parent);
      parent = byId.get(parent)?.parentGroupTempId;
    }
  }
  // Empty boundaries add visual noise and can dwarf an otherwise small graph.
  const occupied = new Set<string>();
  for (const service of services) {
    let parent = service.parentGroupTempId;
    while (parent) { occupied.add(parent); parent = byId.get(parent)?.parentGroupTempId; }
  }
  const retained = groups.filter(group => occupied.has(group.tempId));
  for (const group of retained) {
    group.childTempIds = resources.filter(node => node.parentGroupTempId === group.tempId &&
      (!byId.has(node.tempId) || occupied.has(node.tempId))).map(node => node.tempId).sort();
  }
  const removed = new Set(groups.filter(group => !occupied.has(group.tempId)).map(group => group.tempId));
  return { ...result, groups: retained, serviceNodes: services,
    ...(result.intent === "update_pipeline" ? { deletedGroupIds: [...new Set([
      ...(result.deletedGroupIds || []), ...groups.filter(group => removed.has(group.tempId)).map(group => group.id || group.tempId),
    ])] } : {}),
    dataFlowEdges: (result.dataFlowEdges || []).filter(edge => !removed.has(edge.fromId) && !removed.has(edge.toId)) };
}

/** Structural errors must trigger regeneration, never speculative resource/edge repair. */
export function architectureTopologyIssues(result: AIWorkflowResult): string[] {
  const services = result.serviceNodes || [];
  const groups = result.groups || [];
  const resources = [...services, ...groups];
  const ids = resources.map(node => node.tempId);
  const issues: string[] = [];
  if (ids.some(id => !id?.trim()) || new Set(ids).size !== ids.length) issues.push("Resource tempIds must be nonempty and globally unique");
  const allowed = new Set([...ids, ...(result.milestones || []).flatMap(node => [node.id, node.tempId].filter(Boolean))]);
  if ((result.dataFlowEdges || []).some(edge => !allowed.has(edge.fromId) || !allowed.has(edge.toId) || edge.fromId === edge.toId)) {
    issues.push("Connections must reference distinct declared resources or milestones");
  }
  if (services.some(service => !service.serviceId || !service.tempId)) issues.push("Every service requires serviceId and tempId");
  return issues;
}
