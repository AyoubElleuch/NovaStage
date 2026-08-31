import type { CanvasEdge, CanvasNode } from "./types";

export interface ReleasePulseNodeInsight {
  id: string;
  title: string;
  completion: number;
}

export interface ReleasePulseBlocker extends ReleasePulseNodeInsight {
  downstreamCount: number;
  isExplicitlyBlocked: boolean;
}

export interface ReleasePulseAnalysis {
  readiness: number;
  completedNodes: number;
  totalNodes: number;
  readyNow: ReleasePulseNodeInsight[];
  blockedNodes: ReleasePulseNodeInsight[];
  blockers: ReleasePulseBlocker[];
  criticalPath: ReleasePulseNodeInsight[];
  hasCycle: boolean;
}

function getCompletion(node: CanvasNode) {
  if (node.checkpoints.length === 0) {
    return node.status === "completed" ? 100 : 0;
  }

  const completed = node.checkpoints.filter((checkpoint) => checkpoint.is_completed).length;
  return Math.round((completed / node.checkpoints.length) * 100);
}

export function analyzeReleasePulse(
  nodes: CanvasNode[],
  edges: CanvasEdge[]
): ReleasePulseAnalysis {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const completionById = new Map(nodes.map((node) => [node.id, getCompletion(node)]));
  const incoming = new Map(nodes.map((node) => [node.id, [] as string[]]));
  const outgoing = new Map(nodes.map((node) => [node.id, [] as string[]]));

  for (const edge of edges) {
    if (!nodeById.has(edge.source_node_id) || !nodeById.has(edge.target_node_id)) continue;
    incoming.get(edge.target_node_id)?.push(edge.source_node_id);
    outgoing.get(edge.source_node_id)?.push(edge.target_node_id);
  }

  const indegree = new Map(nodes.map((node) => [node.id, incoming.get(node.id)?.length ?? 0]));
  const queue = nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  const topologicalOrder: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId) continue;
    topologicalOrder.push(nodeId);
    for (const targetId of outgoing.get(nodeId) ?? []) {
      const nextIndegree = (indegree.get(targetId) ?? 1) - 1;
      indegree.set(targetId, nextIndegree);
      if (nextIndegree === 0) queue.push(targetId);
    }
  }

  const hasCycle = topologicalOrder.length !== nodes.length;
  const analysisOrder = hasCycle ? nodes.map((node) => node.id) : topologicalOrder;
  const pathWeight = new Map<string, number>();
  const pathIds = new Map<string, string[]>();

  for (const nodeId of analysisOrder) {
    const remainingWeight = 100 - (completionById.get(nodeId) ?? 0);
    let bestParentWeight = 0;
    let bestParentPath: string[] = [];

    if (!hasCycle) {
      for (const sourceId of incoming.get(nodeId) ?? []) {
        const sourceWeight = pathWeight.get(sourceId) ?? 0;
        if (sourceWeight > bestParentWeight) {
          bestParentWeight = sourceWeight;
          bestParentPath = pathIds.get(sourceId) ?? [];
        }
      }
    }

    pathWeight.set(nodeId, bestParentWeight + remainingWeight);
    pathIds.set(nodeId, [...bestParentPath, nodeId]);
  }

  const criticalEndId = analysisOrder.reduce<string | null>((bestId, nodeId) => {
    if (!bestId || (pathWeight.get(nodeId) ?? 0) > (pathWeight.get(bestId) ?? 0)) return nodeId;
    return bestId;
  }, null);

  const toInsight = (nodeId: string): ReleasePulseNodeInsight => ({
    id: nodeId,
    title: nodeById.get(nodeId)?.title ?? "Untitled milestone",
    completion: completionById.get(nodeId) ?? 0,
  });

  const incompleteNodes = nodes.filter((node) => (completionById.get(node.id) ?? 0) < 100);
  const readyNow = incompleteNodes
    .filter(
      (node) =>
        node.status !== "blocked" &&
        (incoming.get(node.id) ?? []).every((sourceId) => completionById.get(sourceId) === 100)
    )
    .map((node) => toInsight(node.id));
  const blockedNodes = incompleteNodes
    .filter(
      (node) =>
        node.status === "blocked" ||
        (incoming.get(node.id) ?? []).some((sourceId) => completionById.get(sourceId) !== 100)
    )
    .map((node) => toInsight(node.id));

  const countIncompleteDescendants = (startId: string) => {
    const visited = new Set<string>();
    const pending = [...(outgoing.get(startId) ?? [])];
    while (pending.length > 0) {
      const nodeId = pending.pop();
      if (!nodeId || visited.has(nodeId)) continue;
      visited.add(nodeId);
      pending.push(...(outgoing.get(nodeId) ?? []));
    }
    return [...visited].filter((nodeId) => (completionById.get(nodeId) ?? 0) < 100).length;
  };

  const blockers = incompleteNodes
    .map((node) => ({
      ...toInsight(node.id),
      downstreamCount: countIncompleteDescendants(node.id),
      isExplicitlyBlocked: node.status === "blocked",
    }))
    .filter((node) => node.isExplicitlyBlocked || node.downstreamCount > 0)
    .sort(
      (left, right) =>
        Number(right.isExplicitlyBlocked) - Number(left.isExplicitlyBlocked) ||
        right.downstreamCount - left.downstreamCount ||
        left.completion - right.completion
    );

  const totalWorkUnits = nodes.reduce(
    (total, node) => total + Math.max(node.checkpoints.length, 1),
    0
  );
  const completedWorkUnits = nodes.reduce(
    (total, node) =>
      total +
      (node.checkpoints.length > 0
        ? node.checkpoints.filter((checkpoint) => checkpoint.is_completed).length
        : node.status === "completed"
          ? 1
          : 0),
    0
  );

  return {
    readiness: totalWorkUnits === 0 ? 0 : Math.round((completedWorkUnits / totalWorkUnits) * 100),
    completedNodes: nodes.length - incompleteNodes.length,
    totalNodes: nodes.length,
    readyNow,
    blockedNodes,
    blockers,
    criticalPath: criticalEndId
      ? (pathIds.get(criticalEndId) ?? []).filter((nodeId) => completionById.get(nodeId) !== 100).map(toInsight)
      : [],
    hasCycle,
  };
}