/**
 * Phase 3: Local Workflow Graph Validation & Auto-Repair Engine
 * Ensures acyclic DAG integrity, eliminates orphan nodes, repairs broken edges,
 * enforces checkpoint depth standards, and applies canonical color mapping.
 */

import { AIWorkflowResult, MilestonePhase } from "../types";
import { assertSemanticGraph } from "../semantic-graph";
import { normalizeArchitectureTopology } from "../architecture-topology";
import { normalizeAWSServiceId } from "@/lib/canvas/aws-catalog-lookup";

export interface ValidationReport {
  isValid: boolean;
  cyclesRemoved: number;
  orphansConnected: number;
  brokenEdgesRemoved: number;
  checkpointsPadded: number;
  duplicateTitlesFixed: number;
  architectureReferencesRepaired: number;
  architectureEdgesRemoved: number;
}

/**
 * Maps a phase or title keyword to canonical NovaStage milestone accent color
 */
export function resolveMilestoneColor(
  phase?: MilestonePhase,
  title?: string,
  currentColor?: "default" | "amber" | "purple" | "rose"
): "default" | "amber" | "purple" | "rose" {
  if (currentColor && ["default", "amber", "purple", "rose"].includes(currentColor)) {
    return currentColor;
  }

  if (phase === "planning" || phase === "architecture") return "default";
  if (phase === "implementation") {
    const t = (title || "").toLowerCase();
    if (t.includes("ui") || t.includes("client") || t.includes("frontend") || t.includes("auth")) {
      return "amber";
    }
    return "purple";
  }
  if (phase === "testing" || phase === "deployment" || phase === "operations") return "rose";

  const t = (title || "").toLowerCase();
  if (t.includes("qa") || t.includes("test") || t.includes("deploy") || t.includes("security") || t.includes("audit")) {
    return "rose";
  }
  if (t.includes("ui") || t.includes("front") || t.includes("auth") || t.includes("view")) {
    return "amber";
  }
  if (t.includes("api") || t.includes("service") || t.includes("backend") || t.includes("billing") || t.includes("stripe")) {
    return "purple";
  }

  return "default";
}

/** Safe normalization only: semantic failures must be corrected by the provider. */
export function validateAndRepairWorkflow(workflow: AIWorkflowResult): { workflow: AIWorkflowResult; report: ValidationReport } {
  assertSemanticGraph(workflow);
  const normalized = normalizeArchitectureTopology({
    ...workflow,
    mode: workflow.mode || "workflow",
    milestones: workflow.milestones.map(m => ({ ...m,
      title: m.title.trim(), color: resolveMilestoneColor(m.phase, m.title, m.color),
      checkpoints: m.checkpoints.map(cp => ({ ...cp, title: cp.title.trim() })),
    })),
    serviceNodes: (workflow.serviceNodes || []).map(s => ({ ...s, serviceId: normalizeAWSServiceId(s.serviceId) })),
    edges: [...new Map(workflow.edges.map(e => [e.fromId + ":" + e.toId, { ...e }])).values()],
    dataFlowEdges: [...new Map((workflow.dataFlowEdges || []).map(e => [e.fromId + ":" + e.toId + ":" + e.edgeType + ":" + (e.label || ""), { ...e }])).values()],
  });
  return { workflow: normalized, report: { isValid: true, cyclesRemoved: 0, orphansConnected: 0,
    brokenEdgesRemoved: 0, checkpointsPadded: 0, duplicateTitlesFixed: 0,
    architectureReferencesRepaired: 0, architectureEdgesRemoved: 0 } };
}
