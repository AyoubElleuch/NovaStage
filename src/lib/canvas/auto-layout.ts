import { CanvasNode, CanvasEdge } from "./types";

export function autoLayoutNodes(
  nodes: CanvasNode[],
  edges: CanvasEdge[]
): CanvasNode[] {
  if (nodes.length === 0) return [];

  // Build adjacency graph
  const inDegree: Record<string, number> = {};
  const adjList: Record<string, string[]> = {};

  for (const node of nodes) {
    inDegree[node.id] = 0;
    adjList[node.id] = [];
  }

  for (const edge of edges) {
    if (adjList[edge.source_node_id]) {
      adjList[edge.source_node_id].push(edge.target_node_id);
    }
    inDegree[edge.target_node_id] = (inDegree[edge.target_node_id] || 0) + 1;
  }

  // Topological / Level Assignment
  const nodeLevels: Record<string, number> = {};
  const queue: { id: string; level: number }[] = [];

  for (const node of nodes) {
    if (inDegree[node.id] === 0) {
      queue.push({ id: node.id, level: 0 });
      nodeLevels[node.id] = 0;
    }
  }

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    const neighbors = adjList[id] || [];

    for (const neighbor of neighbors) {
      const nextLevel = level + 1;
      if (nodeLevels[neighbor] === undefined || nodeLevels[neighbor] < nextLevel) {
        nodeLevels[neighbor] = nextLevel;
        queue.push({ id: neighbor, level: nextLevel });
      }
    }
  }

  // Group nodes by level (column)
  const columns: Record<number, CanvasNode[]> = {};
  for (const node of nodes) {
    const lvl = nodeLevels[node.id] ?? 0;
    if (!columns[lvl]) columns[lvl] = [];
    columns[lvl].push(node);
  }

  // Position nodes
  const HORIZONTAL_SPACING = 380;
  const VERTICAL_SPACING = 240;
  const START_X = 120;
  const START_Y = 120;

  const updatedNodes: CanvasNode[] = [];

  const sortedLevels = Object.keys(columns)
    .map(Number)
    .sort((a, b) => a - b);

  for (const level of sortedLevels) {
    const nodesInCol = columns[level];
    const colX = START_X + level * HORIZONTAL_SPACING;

    nodesInCol.forEach((node, index) => {
      const colY = START_Y + index * VERTICAL_SPACING;
      updatedNodes.push({
        ...node,
        position_x: colX,
        position_y: colY,
      });
    });
  }

  return updatedNodes;
}
