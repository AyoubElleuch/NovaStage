import { z } from "zod";
import { validateAndRepairWorkflow } from "@/lib/ai/phases/validate";
import { getAWSServiceDefinition } from "@/lib/canvas/aws-catalog-lookup";
import { EDGE_TYPES } from "@/lib/canvas/types";

const text = z.string().trim().min(1).max(2000);
const ref = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/);
const pair = { fromId: ref, toId: ref };

/** Deliberately additive: an external assistant cannot delete or overwrite a collaborator's work. */
export const workflowSchema = z.object({
  mode: z.enum(["workflow", "aws_architecture", "full_stack"]),
  summary: text,
  milestones: z.array(z.object({
    tempId: ref, title: text, description: text.optional(),
    color: z.enum(["default", "amber", "purple", "rose"]).optional(),
    phase: z.enum(["planning", "architecture", "implementation", "testing", "deployment", "operations"]).optional(),
    checkpoints: z.array(z.object({ title: text }).strict()).min(4).max(9),
  }).strict()).max(60),
  edges: z.array(z.object(pair).strict()).max(180),
  serviceNodes: z.array(z.object({
    tempId: ref, serviceId: z.string().min(1).max(120), name: text,
    description: text.optional(), region: z.string().max(80).optional(),
    config: z.record(z.string().max(80), z.string().max(500)).refine(value => Object.keys(value).length <= 30, "At most 30 config entries").optional(),
    parentGroupTempId: ref.optional(),
  }).strict()).max(100),
  groups: z.array(z.object({
    tempId: ref, label: text,
    style: z.enum(["vpc", "subnet", "region", "availability_zone", "custom"]),
    childTempIds: z.array(ref).max(160), parentGroupTempId: ref.optional(),
  }).strict()).max(40),
  dataFlowEdges: z.array(z.object({
    ...pair, edgeType: z.enum(EDGE_TYPES), label: z.string().max(120).optional(),
    protocol: z.string().max(80).optional(),
  }).strict()).max(300),
}).strict();

export function prepareWorkflow(input: unknown) {
  const parsed = workflowSchema.parse(input);
  const milestones = new Set(parsed.milestones.map(node => node.tempId));
  const groups = new Set(parsed.groups.map(node => node.tempId));
  const ids = [...parsed.milestones, ...parsed.serviceNodes, ...parsed.groups].map(node => node.tempId);
  const all = new Set(ids);
  if (!ids.length || all.size !== ids.length) throw new Error("Use at least one node and unique tempIds across all node types.");
  if (parsed.mode !== "aws_architecture" && !milestones.size) throw new Error("This mode requires delivery milestones.");
  if (parsed.mode !== "workflow" && !parsed.serviceNodes.length) throw new Error("This mode requires AWS services.");
  if (parsed.mode === "workflow" && (parsed.serviceNodes.length || parsed.groups.length || parsed.dataFlowEdges.length)) throw new Error("Use full_stack mode for a combined diagram.");
  for (const service of parsed.serviceNodes) {
    if (!getAWSServiceDefinition(service.serviceId)) throw new Error(`Unknown AWS service: ${service.serviceId}. Search the catalog first.`);
  }
  for (const node of [...parsed.serviceNodes, ...parsed.groups]) {
    if (node.parentGroupTempId && (!groups.has(node.parentGroupTempId) || node.parentGroupTempId === node.tempId)) throw new Error("Invalid parent group.");
  }
  for (const group of parsed.groups) {
    if (group.childTempIds.some(id => !all.has(id) || id === group.tempId || milestones.has(id))) throw new Error("Group children must reference generated services or groups.");
  }
  for (const edge of parsed.edges) {
    if (!milestones.has(edge.fromId) || !milestones.has(edge.toId) || edge.fromId === edge.toId) throw new Error("Dependency edges must reference distinct generated milestones.");
  }
  for (const edge of parsed.dataFlowEdges) {
    if (!all.has(edge.fromId) || !all.has(edge.toId) || edge.fromId === edge.toId) throw new Error("Data flow edges must reference distinct generated nodes.");
  }
  return validateAndRepairWorkflow({ ...parsed, intent: "create_parallel" });
}
