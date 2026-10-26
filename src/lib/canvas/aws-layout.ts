import type { AIWorkflowResult } from "../ai/types";
import type { CanvasNode } from "./types";
import { buildGeneratedGraph } from "./generated-graph";

/** Both providers and geometry previews use the same architecture layout contract. */
export function layoutAWSArchitecture(result: AIWorkflowResult, existingNodes: CanvasNode[]) {
  const requested = new Set([...(result.groups || []), ...(result.serviceNodes || [])].map(node => node.id || node.tempId));
  const retained = result.intent === "update_pipeline" ? existingNodes.filter(node => requested.has(node.id)) : [];
  return buildGeneratedGraph({ ...result, mode: "aws_architecture" }, existingNodes.filter(node => !retained.includes(node)), retained).nodes;
}
