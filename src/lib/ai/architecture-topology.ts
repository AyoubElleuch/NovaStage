import type { AIWorkflowResult } from "./types";
import { normalizeAWSServiceId } from "../canvas/aws-catalog-lookup";

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
  const allowed = new Set(ids);
  if ((result.dataFlowEdges || []).some(edge => !allowed.has(edge.fromId) || !allowed.has(edge.toId) || edge.fromId === edge.toId)) {
    issues.push("Connections must reference distinct declared resources");
  }
  if (services.some(service => !service.serviceId || !service.tempId)) issues.push("Every service requires serviceId and tempId");
  const parents = new Map<string, string>();
  const groupIds = new Set(groups.map(group => group.tempId));
  const assign = (id: string, parent: string) => {
    if (!groupIds.has(parent) || parent === id || (parents.has(id) && parents.get(id) !== parent)) issues.push(`Conflicting or invalid parent containment for ${id}`);
    parents.set(id, parent);
  };
  for (const node of resources) if (node.parentGroupTempId) assign(node.tempId, node.parentGroupTempId);
  for (const group of groups) for (const child of group.childTempIds || []) {
    if (!allowed.has(child)) issues.push(`Unknown child ${child}`);
    assign(child, group.tempId);
  }
  for (const id of parents.keys()) {
    const seen = new Set([id]); let parent = parents.get(id);
    while (parent) {
      if (seen.has(parent)) { issues.push(`Containment cycle involving ${id}`); break; }
      seen.add(parent); parent = parents.get(parent);
    }
  }
  const byGroup = new Map(groups.map(group => [group.tempId, group]));
  for (const service of services) {
    const serviceId = normalizeAWSServiceId(service.serviceId);
    const seen = new Set<string>(); let parent = parents.get(service.tempId);
    while (parent && !seen.has(parent)) {
      seen.add(parent);
      const group = byGroup.get(parent);
      if (!group) break;
      const network = ["vpc", "subnet", "availability_zone"].includes(group.style);
      if (network && ["cloudfront", "route53", "apigateway", "waf", "s3", "dynamodb", "sqs", "sns", "eventbridge", "kms", "secretsmanager", "cloudwatch", "cloudtrail", "iam"].includes(serviceId)) {
        issues.push(`${service.tempId} (${serviceId}) cannot be hosted inside ${group.style}; use a regional/custom boundary or model the network endpoint separately`);
      }
      parent = parents.get(parent);
    }
  }
  for (const group of groups) {
    const parent = byGroup.get(parents.get(group.tempId) || "");
    if (parent && ((group.style === "region" && parent.style !== "custom") ||
      (group.style === "vpc" && !["region", "custom"].includes(parent.style)) ||
      (group.style === "availability_zone" && parent.style === "subnet"))) issues.push(`Invalid infrastructure containment: ${group.style} inside ${parent.style}`);
  }
  return issues;
}
