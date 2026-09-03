import { CanvasCheckpoint, CanvasEdge, CanvasNode, CanvasViewport, HandlePosition } from "./types";

const COLLABORATOR_COLORS = [
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#3b82f6", // Blue
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#6366f1", // Indigo
];

export function getUserColor(userId: string): string {
  if (!userId) return COLLABORATOR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % COLLABORATOR_COLORS.length;
  return COLLABORATOR_COLORS[index];
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: CanvasViewport
): { x: number; y: number } {
  return {
    x: (screenX - viewport.x) / viewport.zoom,
    y: (screenY - viewport.y) / viewport.zoom,
  };
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: CanvasViewport
): { x: number; y: number } {
  return {
    x: worldX * viewport.zoom + viewport.x,
    y: worldY * viewport.zoom + viewport.y,
  };
}

export function snapToGrid(value: number, gridSize = 16): number {
  return Math.round(value / gridSize) * gridSize;
}

export function calculateCompletionPercentage(checkpoints: CanvasCheckpoint[]): number {
  if (!checkpoints || checkpoints.length === 0) return 0;
  const completedCount = checkpoints.filter((c) => c.is_completed).length;
  return Math.round((completedCount / checkpoints.length) * 100);
}

export function isNodeFullyComplete(node: CanvasNode): boolean {
  if (!node.checkpoints || node.checkpoints.length === 0) {
    return node.status === "completed";
  }
  return (
    node.checkpoints.length > 0 &&
    node.checkpoints.every((cp) => cp.is_completed)
  );
}

export function getNodeHandlePosition(
  node: CanvasNode,
  handle: HandlePosition
): { x: number; y: number } {
  const width = node.width || (node.node_type === "aws_service" ? 200 : node.node_type === "group" ? 440 : 280);
  const height = node.height || (node.node_type === "aws_service" ? 140 : node.node_type === "group" ? 320 : 170);
  const { position_x, position_y } = node;

  switch (handle) {
    case "top":
      return { x: position_x + width / 2, y: position_y };
    case "right":
      return { x: position_x + width, y: position_y + height / 2 };
    case "bottom":
      return { x: position_x + width / 2, y: position_y + height };
    case "left":
      return { x: position_x, y: position_y + height / 2 };
    default:
      return { x: position_x + width, y: position_y + height / 2 };
  }
}

export function getBezierControlPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  sourceHandle: HandlePosition = "right",
  targetHandle: HandlePosition = "left"
): { cx1: number; cy1: number; cx2: number; cy2: number } {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const distance = Math.sqrt(dx * dx + dy * dy);
  const curvature = Math.max(30, Math.min(distance * 0.4, 180));

  let cx1 = x1;
  let cy1 = y1;
  let cx2 = x2;
  let cy2 = y2;

  switch (sourceHandle) {
    case "right":
      cx1 = x1 + curvature;
      break;
    case "left":
      cx1 = x1 - curvature;
      break;
    case "top":
      cy1 = y1 - curvature;
      break;
    case "bottom":
      cy1 = y1 + curvature;
      break;
  }

  switch (targetHandle) {
    case "right":
      cx2 = x2 + curvature;
      break;
    case "left":
      cx2 = x2 - curvature;
      break;
    case "top":
      cy2 = y2 - curvature;
      break;
    case "bottom":
      cy2 = y2 + curvature;
      break;
  }

  return { cx1, cy1, cx2, cy2 };
}

export function calculateBezierPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  sourceHandle: HandlePosition = "right",
  targetHandle: HandlePosition = "left"
): string {
  const { cx1, cy1, cx2, cy2 } = getBezierControlPoints(
    x1,
    y1,
    x2,
    y2,
    sourceHandle,
    targetHandle
  );
  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
}

export function getBezierPoint(
  t: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  sourceHandle: HandlePosition = "right",
  targetHandle: HandlePosition = "left"
): { x: number; y: number } {
  const { cx1, cy1, cx2, cy2 } = getBezierControlPoints(
    x1,
    y1,
    x2,
    y2,
    sourceHandle,
    targetHandle
  );

  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  const x = mt3 * x1 + 3 * mt2 * t * cx1 + 3 * mt * t2 * cx2 + t3 * x2;
  const y = mt3 * y1 + 3 * mt2 * t * cy1 + 3 * mt * t2 * cy2 + t3 * y2;

  return { x, y };
}

export function canConnectMilestones(
  nodeA: { claimed_by: string | null; claim_expires_at?: string | null; node_type?: string },
  nodeB: { claimed_by: string | null; claim_expires_at?: string | null; node_type?: string },
  userId?: string,
  isOwner?: boolean
): boolean {
  if (isOwner) return true;
  if (!userId) return false;

  // AWS service nodes (e.g. Amazon CloudWatch observer), groups, and annotations do not enforce milestone claim locks
  if (nodeA.node_type && nodeA.node_type !== "milestone") return true;
  if (nodeB.node_type && nodeB.node_type !== "milestone") return true;

  const now = new Date();
  const isClaimActive = (node: { claimed_by: string | null; claim_expires_at?: string | null }) => {
    if (node.claimed_by !== userId) return false;
    if (node.claim_expires_at && new Date(node.claim_expires_at) < now) return false;
    return true;
  };
  return isClaimActive(nodeA) || isClaimActive(nodeB);
}

/**
 * Finds which handle of a node is closest to a given world coordinate.
 * Allows clicking anywhere on a target node to connect automatically to the optimal port.
 */
export function getClosestHandleToPoint(
  node: CanvasNode,
  point: { x: number; y: number }
): HandlePosition {
  const handles: HandlePosition[] = ["top", "right", "bottom", "left"];
  let bestHandle: HandlePosition = "left";
  let minDistanceSq = Infinity;

  for (const handle of handles) {
    const handlePos = getNodeHandlePosition(node, handle);
    const dx = handlePos.x - point.x;
    const dy = handlePos.y - point.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      bestHandle = handle;
    }
  }

  return bestHandle;
}

/**
 * Checks if adding a proposed directed edge (source -> target) creates a cycle in the DAG.
 */
export function detectCycle(
  edges: CanvasEdge[],
  proposedEdge: { sourceNodeId: string; targetNodeId: string }
): boolean {
  if (proposedEdge.sourceNodeId === proposedEdge.targetNodeId) {
    return true; // Self-loop is an immediate cycle
  }

  // Build adjacency list including existing edges
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    const list = adj.get(edge.source_node_id) || [];
    list.push(edge.target_node_id);
    adj.set(edge.source_node_id, list);
  }

  // Add the proposed edge
  const sourceList = adj.get(proposedEdge.sourceNodeId) || [];
  sourceList.push(proposedEdge.targetNodeId);
  adj.set(proposedEdge.sourceNodeId, sourceList);

  // DFS cycle detector from targetNodeId back to sourceNodeId
  const visited = new Set<string>();
  const inStack = new Set<string>();

  const hasCycleDfs = (nodeId: string): boolean => {
    visited.add(nodeId);
    inStack.add(nodeId);

    const neighbors = adj.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycleDfs(neighbor)) return true;
      } else if (inStack.has(neighbor)) {
        return true;
      }
    }

    inStack.delete(nodeId);
    return false;
  };

  for (const startNode of adj.keys()) {
    if (!visited.has(startNode)) {
      if (hasCycleDfs(startNode)) return true;
    }
  }

  return false;
}

/**
 * Finds the nearest handle on any node within threshold distance of a world position.
 * Returns the node, handle position, and world coordinate of the handle.
 */
export function findNearestHandle(
  worldPos: { x: number; y: number },
  nodes: CanvasNode[],
  excludeNodeId?: string,
  threshold = 28
): { node: CanvasNode; handle: HandlePosition; position: { x: number; y: number } } | null {
  const handles: HandlePosition[] = ["top", "right", "bottom", "left"];
  let closest: {
    node: CanvasNode;
    handle: HandlePosition;
    position: { x: number; y: number };
    distSq: number;
  } | null = null;

  const thresholdSq = threshold * threshold;

  for (const node of nodes) {
    if (excludeNodeId && node.id === excludeNodeId) continue;

    for (const handle of handles) {
      const pos = getNodeHandlePosition(node, handle);
      const dx = pos.x - worldPos.x;
      const dy = pos.y - worldPos.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= thresholdSq) {
        if (!closest || distSq < closest.distSq) {
          closest = { node, handle, position: pos, distSq };
        }
      }
    }
  }

  return closest ? { node: closest.node, handle: closest.handle, position: closest.position } : null;
}

/**
 * Computes bounding rectangle enclosing all nodes on the canvas.
 */
export function getCanvasBoundingBox(
  nodes: CanvasNode[],
  padding = 60
): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.position_x);
    minY = Math.min(minY, node.position_y);
    maxX = Math.max(maxX, node.position_x + (node.width || 280));
    maxY = Math.max(maxY, node.position_y + (node.height || 170));
  }

  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(100, maxX - minX),
    height: Math.max(100, maxY - minY),
  };
}

/**
 * Exports the current roadmap graph to Mermaid.js diagram format.
 */
export function exportToMermaid(nodes: CanvasNode[], edges: CanvasEdge[]): string {
  const lines: string[] = ["graph LR"];

  const sanitize = (str: string) =>
    str.replace(/["\n\r]/g, " ").trim();

  // Nodes definition
  for (const node of nodes) {
    const safeTitle = sanitize(node.title || "Milestone");
    if (node.node_type === "aws_service") {
      lines.push(`  ${node.id}["AWS: ${safeTitle}"]`);
    } else if (node.node_type === "group") {
      lines.push(`  ${node.id}[["Group: ${safeTitle}"]]`);
    } else {
      const completion = calculateCompletionPercentage(node.checkpoints);
      const label = `${safeTitle} (${completion}%)`;
      lines.push(`  ${node.id}["${label}"]`);
    }
  }

  // Edges definition
  for (const edge of edges) {
    if (edge.label) {
      lines.push(`  ${edge.source_node_id} -->|${sanitize(edge.label)}| ${edge.target_node_id}`);
    } else {
      lines.push(`  ${edge.source_node_id} --> ${edge.target_node_id}`);
    }
  }

  return lines.join("\n");
}


