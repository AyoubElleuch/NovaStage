import { getNodeDimensions, getNodeHandlePosition } from "./coordinate-math";
import type { CanvasNode, HandlePosition } from "./types";

type Point = { x: number; y: number };

export function architectureHandles(source: Pick<CanvasNode, "position_x" | "position_y" | "width" | "height">, target: Pick<CanvasNode, "position_x" | "position_y" | "width" | "height">): { source: HandlePosition; target: HandlePosition } {
  const dx = target.position_x + target.width / 2 - source.position_x - source.width / 2;
  const dy = target.position_y + target.height / 2 - source.position_y - source.height / 2;
  const horizontalGap = Math.abs(dx) - (source.width + target.width) / 2;
  const verticalGap = Math.abs(dy) - (source.height + target.height) / 2;
  return horizontalGap >= verticalGap
    ? { source: dx >= 0 ? "right" : "left", target: dx >= 0 ? "left" : "right" }
    : { source: dy >= 0 ? "bottom" : "top", target: dy >= 0 ? "top" : "bottom" };
}

/** Rectilinear visibility graph. Group boundaries are traversable; cards are obstacles. */
export function routeArchitectureEdge(source: CanvasNode, target: CanvasNode, sourceHandle: HandlePosition, targetHandle: HandlePosition, nodes: CanvasNode[]) {
  const start = getNodeHandlePosition(source, sourceHandle), end = getNodeHandlePosition(target, targetHandle);
  const offset = (point: Point, handle: HandlePosition): Point => ({
    x: point.x + (handle === "right" ? 24 : handle === "left" ? -24 : 0),
    y: point.y + (handle === "bottom" ? 24 : handle === "top" ? -24 : 0),
  });
  const a = offset(start, sourceHandle), b = offset(end, targetHandle);
  const obstacles = nodes.filter(node => node.node_type !== "group").map(node => {
    const size = getNodeDimensions(node);
    return { left: node.position_x - 12, right: node.position_x + size.width + 12, top: node.position_y - 12, bottom: node.position_y + size.height + 12 };
  });
  const clear = (p: Point, q: Point) => !obstacles.some(rect => p.x === q.x
    ? p.x > rect.left && p.x < rect.right && Math.max(p.y, q.y) > rect.top && Math.min(p.y, q.y) < rect.bottom
    : p.y > rect.top && p.y < rect.bottom && Math.max(p.x, q.x) > rect.left && Math.min(p.x, q.x) < rect.right);
  const finish = (middle: Point[]) => {
    const raw = [start, ...middle, end];
    const route = raw.filter((point, i) => i === 0 || i === raw.length - 1 ||
      !(raw[i - 1].x === point.x && point.x === raw[i + 1].x || raw[i - 1].y === point.y && point.y === raw[i + 1].y));
    const lengths = route.slice(1).map((point, i) => Math.abs(point.x - route[i].x) + Math.abs(point.y - route[i].y));
    let remaining = lengths.reduce((sum, length) => sum + length, 0) / 2;
    let center = start;
    for (let i = 0; i < lengths.length; i++) {
      if (remaining <= lengths[i]) { const ratio = lengths[i] ? remaining / lengths[i] : 0; center = { x: route[i].x + (route[i + 1].x - route[i].x) * ratio, y: route[i].y + (route[i + 1].y - route[i].y) * ratio }; break; }
      remaining -= lengths[i];
    }
    return { points: route, center, path: route.map((point, i) => `${i ? "L" : "M"} ${point.x} ${point.y}`).join(" ") };
  };
  // Most generated edges have an unobstructed channel; avoid building a grid during drags.
  const candidates = [
    ...(a.x === b.x || a.y === b.y ? [[a, b]] : []),
    [a, { x: (a.x + b.x) / 2, y: a.y }, { x: (a.x + b.x) / 2, y: b.y }, b],
    [a, { x: a.x, y: (a.y + b.y) / 2 }, { x: b.x, y: (a.y + b.y) / 2 }, b],
    [a, { x: b.x, y: a.y }, b], [a, { x: a.x, y: b.y }, b],
  ];
  const direct = candidates.find(candidate => candidate.slice(1).every((point, i) => clear(candidate[i], point)));
  if (direct) return finish(direct);
  const xs = [...new Set([a.x, b.x, ...obstacles.flatMap(rect => [rect.left, rect.right])])].sort((x, y) => x - y);
  const ys = [...new Set([a.y, b.y, ...obstacles.flatMap(rect => [rect.top, rect.bottom])])].sort((x, y) => x - y);
  const points: Point[] = [];
  const index = new Map<string, number>();
  for (const y of ys) for (const x of xs) {
    if (obstacles.some(rect => x > rect.left && x < rect.right && y > rect.top && y < rect.bottom)) continue;
    index.set(`${x},${y}`, points.length); points.push({ x, y });
  }
  const startIndex = index.get(`${a.x},${a.y}`), endIndex = index.get(`${b.x},${b.y}`);
  const middle: Point[] = [];
  if (startIndex !== undefined && endIndex !== undefined) {
    const adjacency = new Map<number, number[]>();
    const link = (row: Point[]) => {
      for (let i = 1; i < row.length; i++) if (clear(row[i - 1], row[i])) {
        const u = index.get(`${row[i - 1].x},${row[i - 1].y}`)!, v = index.get(`${row[i].x},${row[i].y}`)!;
        adjacency.set(u, [...(adjacency.get(u) || []), v]); adjacency.set(v, [...(adjacency.get(v) || []), u]);
      }
    };
    for (const y of ys) link(points.filter(point => point.y === y));
    for (const x of xs) link(points.filter(point => point.x === x));
    const distances = new Map<number, number>([[startIndex, 0]]), previous = new Map<number, number>();
    const pending = new Set([startIndex]);
    const heuristic = (id: number) => Math.abs(points[id].x - b.x) + Math.abs(points[id].y - b.y);
    while (pending.size) {
      let current = -1, best = Infinity;
      for (const id of pending) { const score = distances.get(id)! + heuristic(id); if (score < best) { current = id; best = score; } }
      pending.delete(current);
      if (current === endIndex) break;
      for (const next of adjacency.get(current) || []) {
        const cost = distances.get(current)! + Math.abs(points[next].x - points[current].x) + Math.abs(points[next].y - points[current].y);
        if (cost < (distances.get(next) ?? Infinity)) { distances.set(next, cost); previous.set(next, current); pending.add(next); }
      }
    }
    if (distances.has(endIndex)) {
      let current: number | undefined = endIndex;
      while (current !== undefined) { middle.unshift(points[current]); current = previous.get(current); }
    }
  }
  if (!middle.length) return null; // Manual overlapping nodes retain the existing bezier fallback.
  return finish(middle);
}
