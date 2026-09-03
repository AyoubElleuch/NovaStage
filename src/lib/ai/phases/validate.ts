/**
 * Phase 3: Local Workflow Graph Validation & Auto-Repair Engine
 * Ensures acyclic DAG integrity, eliminates orphan nodes, repairs broken edges,
 * enforces checkpoint depth standards, and applies canonical color mapping.
 */

import { AIWorkflowResult, AIProcessedMilestone, AIProcessedEdge, MilestonePhase } from "../types";

export interface ValidationReport {
  isValid: boolean;
  cyclesRemoved: number;
  orphansConnected: number;
  brokenEdgesRemoved: number;
  checkpointsPadded: number;
  duplicateTitlesFixed: number;
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

/**
 * Detects and breaks circular dependency cycles using Depth First Search (DFS)
 */
function removeGraphCycles(
  nodeIds: Set<string>,
  edges: AIProcessedEdge[]
): { cleanEdges: AIProcessedEdge[]; cyclesBroken: number } {
  const adj: Map<string, string[]> = new Map();
  nodeIds.forEach((id) => adj.set(id, []));

  edges.forEach((e) => {
    if (adj.has(e.fromId) && adj.has(e.toId)) {
      adj.get(e.fromId)!.push(e.toId);
    }
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const invalidEdges = new Set<string>();
  let cyclesBroken = 0;

  function dfs(u: string) {
    visited.add(u);
    recStack.add(u);

    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      if (!visited.has(v)) {
        dfs(v);
      } else if (recStack.has(v)) {
        // Cycle detected: edge u -> v is a back-edge
        invalidEdges.add(`${u}->${v}`);
        cyclesBroken++;
      }
    }

    recStack.delete(u);
  }

  for (const id of nodeIds) {
    if (!visited.has(id)) {
      dfs(id);
    }
  }

  const cleanEdges = edges.filter((e) => !invalidEdges.has(`${e.fromId}->${e.toId}`));
  return { cleanEdges, cyclesBroken };
}

/**
 * Validates, repairs, and enriches an AIWorkflowResult
 */
export function validateAndRepairWorkflow(
  workflow: AIWorkflowResult
): { workflow: AIWorkflowResult; report: ValidationReport } {
  const report: ValidationReport = {
    isValid: true,
    cyclesRemoved: 0,
    orphansConnected: 0,
    brokenEdgesRemoved: 0,
    checkpointsPadded: 0,
    duplicateTitlesFixed: 0,
  };

  if (!workflow.milestones || workflow.milestones.length === 0) {
    return { workflow, report };
  }

  // 1. Assign identifiers and ensure unique tempIds / IDs
  const seenIds = new Set<string>();
  const milestones: AIProcessedMilestone[] = workflow.milestones.map((m, idx) => {
    let key = m.id || m.tempId || `m_${idx + 1}`;
    if (seenIds.has(key)) {
      key = `m_${idx + 1}_${Date.now()}`;
    }
    seenIds.add(key);

    return {
      ...m,
      id: m.id,
      tempId: m.id ? undefined : key,
      sortOrder: m.sortOrder ?? idx,
      color: resolveMilestoneColor(m.phase, m.title, m.color),
    };
  });

  // 2. Fix duplicate milestone titles
  const titleCounts = new Map<string, number>();
  milestones.forEach((m) => {
    const rawTitle = m.title.trim() || `Milestone`;
    const count = titleCounts.get(rawTitle) || 0;
    if (count > 0) {
      m.title = `${rawTitle} (Part ${count + 1})`;
      report.duplicateTitlesFixed++;
    } else {
      m.title = rawTitle;
    }
    titleCounts.set(rawTitle, count + 1);
  });

  // 3. Enforce Checkpoint Depth Standards (min 4, max 9)
  milestones.forEach((m) => {
    let cps = (m.checkpoints || []).map((cp) => ({
      ...cp,
      title: cp.title.trim(),
    })).filter((cp) => cp.title.length > 0);

    if (cps.length < 4) {
      const needed = 4 - cps.length;
      const paddingTemplates = [
        "Define technical requirements and specification criteria",
        "Implement core component logic and handle failure modes",
        "Execute automated test suites and verify benchmarks",
        "Conduct peer code review and verify security controls",
      ];
      for (let i = 0; i < needed; i++) {
        cps.push({
          title: paddingTemplates[i % paddingTemplates.length],
          isCompleted: false,
        });
        report.checkpointsPadded++;
      }
    } else if (cps.length > 9) {
      cps = cps.slice(0, 9);
    }

    m.checkpoints = cps;
  });

  // 4. Validate and sanitize Edges (remove self-loops and non-existent IDs)
  const validNodeIds = new Set<string>();
  milestones.forEach((m) => {
    if (m.id) validNodeIds.add(m.id);
    if (m.tempId) validNodeIds.add(m.tempId);
  });

  let rawEdges = (workflow.edges || []).filter((e) => {
    const isValid =
      e.fromId &&
      e.toId &&
      e.fromId !== e.toId &&
      validNodeIds.has(e.fromId) &&
      validNodeIds.has(e.toId);
    if (!isValid) {
      report.brokenEdgesRemoved++;
    }
    return isValid;
  });

  // Deduplicate edges
  const edgeKeySet = new Set<string>();
  rawEdges = rawEdges.filter((e) => {
    const k = `${e.fromId}->${e.toId}`;
    if (edgeKeySet.has(k)) return false;
    edgeKeySet.add(k);
    return true;
  });

  // 5. Detect and remove circular cycles
  const { cleanEdges, cyclesBroken } = removeGraphCycles(validNodeIds, rawEdges);
  report.cyclesRemoved = cyclesBroken;
  const finalEdges = cleanEdges;

  // 6. Connect Orphan Nodes (if graph has multiple nodes and an inner node is completely disconnected)
  if (milestones.length > 1) {
    const incomingCount = new Map<string, number>();
    const outgoingCount = new Map<string, number>();

    validNodeIds.forEach((id) => {
      incomingCount.set(id, 0);
      outgoingCount.set(id, 0);
    });

    finalEdges.forEach((e) => {
      outgoingCount.set(e.fromId, (outgoingCount.get(e.fromId) || 0) + 1);
      incomingCount.set(e.toId, (incomingCount.get(e.toId) || 0) + 1);
    });

    // Check if graph is completely disconnected
    if (finalEdges.length === 0) {
      // Connect sequentially by sortOrder
      const sorted = [...milestones].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      for (let i = 0; i < sorted.length - 1; i++) {
        const fromKey = sorted[i].id || sorted[i].tempId!;
        const toKey = sorted[i + 1].id || sorted[i + 1].tempId!;
        finalEdges.push({ fromId: fromKey, toId: toKey });
        report.orphansConnected++;
      }
    } else {
      // Reconnect individual disconnected nodes
      milestones.forEach((m, idx) => {
        const key = m.id || m.tempId!;
        const inDeg = incomingCount.get(key) || 0;
        const outDeg = outgoingCount.get(key) || 0;

        if (inDeg === 0 && outDeg === 0) {
          // Connect to previous and next milestone in sorted order
          if (idx > 0) {
            const prevKey = milestones[idx - 1].id || milestones[idx - 1].tempId!;
            finalEdges.push({ fromId: prevKey, toId: key });
            report.orphansConnected++;
          }
          if (idx < milestones.length - 1) {
            const nextKey = milestones[idx + 1].id || milestones[idx + 1].tempId!;
            finalEdges.push({ fromId: key, toId: nextKey });
            report.orphansConnected++;
          }
        }
      });
    }
  }

  const repairedWorkflow: AIWorkflowResult = {
    ...workflow,
    mode: workflow.mode || "workflow",
    milestones,
    edges: finalEdges,
    serviceNodes: workflow.serviceNodes || [],
    groups: workflow.groups || [],
    dataFlowEdges: workflow.dataFlowEdges || [],
  };

  return { workflow: repairedWorkflow, report };
}
