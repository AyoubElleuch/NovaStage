import { CanvasCheckpoint, CanvasNode, CanvasViewport, HandlePosition } from "./types";

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
  const { position_x, position_y, width, height } = node;

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
