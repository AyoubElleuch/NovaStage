import type { CanvasNode, CanvasViewport } from "./types";
import { getNodeDimensions, screenToWorld, snapToGrid } from "./coordinate-math";

export interface CanvasArea { width: number; height: number; rightInset?: number }

export function zoomAroundCenter(viewport: CanvasViewport, zoom: number, area: CanvasArea): CanvasViewport {
  const nextZoom = Math.min(2.5, Math.max(0.15, zoom));
  const x = Math.max(1, area.width - (area.rightInset || 0)) / 2;
  const y = area.height / 2;
  return { x: x - ((x - viewport.x) / viewport.zoom) * nextZoom,
    y: y - ((y - viewport.y) / viewport.zoom) * nextZoom, zoom: nextZoom };
}

export function fitCanvasNodes(nodes: CanvasNode[], area: CanvasArea): CanvasViewport {
  if (!nodes.length) return { x: 100, y: 100, zoom: 1 };
  const minX = Math.min(...nodes.map(n => n.position_x));
  const minY = Math.min(...nodes.map(n => n.position_y));
  const maxX = Math.max(...nodes.map(n => n.position_x + getNodeDimensions(n).width));
  const maxY = Math.max(...nodes.map(n => n.position_y + getNodeDimensions(n).height));
  const width = Math.max(1, area.width - (area.rightInset || 0));
  // Reserve space for the header and bottom dock, including mobile controls.
  const availableW = Math.max(1, width - 80);
  const availableH = Math.max(1, area.height - 220);
  const zoom = Math.max(0.15, Math.min(1.2, availableW / Math.max(1, maxX - minX), availableH / Math.max(1, maxY - minY)));
  return { x: width / 2 - (minX + maxX) / 2 * zoom,
    y: 80 + availableH / 2 - (minY + maxY) / 2 * zoom, zoom };
}

/** Places a new card near the visible center without covering existing milestones or resources. */
export function getOpenNodePosition(
  nodes: CanvasNode[],
  viewport: CanvasViewport,
  area: CanvasArea,
  dimensions: { width: number; height: number } = { width: 280, height: 170 }
): { x: number; y: number } {
  const center = screenToWorld(Math.max(1, area.width - (area.rightInset || 0)) / 2, area.height / 2, viewport);
  const width = Math.max(1, dimensions.width);
  const height = Math.max(1, dimensions.height);
  const origin = { x: snapToGrid(center.x - width / 2), y: snapToGrid(center.y - height / 2) };
  const obstacles = nodes.filter(node => node.node_type !== "group" && node.node_type !== "annotation")
    .map(node => ({ x: node.position_x, y: node.position_y, ...getNodeDimensions(node) }));
  const gap = 24;
  const stepX = Math.ceil((width + gap * 2) / 16) * 16;
  const stepY = Math.ceil((height + gap * 2) / 16) * 16;
  const isFree = (position: { x: number; y: number }) => !obstacles.some(node =>
    position.x < node.x + node.width + gap && position.x + width + gap > node.x &&
    position.y < node.y + node.height + gap && position.y + height + gap > node.y);
  let column = 0;
  let row = 0;
  let dx = 1;
  let dy = 0;
  let segmentLength = 1;
  let steps = 0;
  let segments = 0;
  // A square spiral gives repeated additions predictable spacing around the visible center.
  for (let attempt = 0; attempt < 1024; attempt++) {
    const candidate = { x: origin.x + column * stepX, y: origin.y + row * stepY };
    if (isFree(candidate)) return candidate;
    column += dx;
    row += dy;
    steps++;
    if (steps === segmentLength) {
      [dx, dy] = [-dy, dx];
      steps = 0;
      segments++;
      if (segments % 2 === 0) segmentLength++;
    }
  }
  return { x: Math.ceil((Math.max(...obstacles.map(node => node.x + node.width)) + gap) / 16) * 16, y: origin.y };
}

/** Includes descendants identified by parent IDs or legacy group metadata. */
export function getDragNodeIds(nodes: CanvasNode[], selectedIds: Set<string>): Set<string> {
  const result = new Set(selectedIds);
  const children = new Map<string, Set<string>>();
  const nodeIds = new Set(nodes.map(node => node.id));
  const addChild = (parent: string, child: string) => {
    if (!nodeIds.has(child)) return;
    if (!children.has(parent)) children.set(parent, new Set());
    children.get(parent)!.add(child);
  };
  for (const node of nodes) {
    if (node.parent_group_id) addChild(node.parent_group_id, node.id);
    if (node.node_type === "group") {
      for (const child of node.group_metadata?.childNodeIds || []) addChild(node.id, child);
    }
  }
  const pending = [...result];
  for (let index = 0; index < pending.length; index++) {
    for (const child of children.get(pending[index]) || []) {
      if (result.has(child)) continue;
      result.add(child);
      pending.push(child);
    }
  }
  return result;
}
