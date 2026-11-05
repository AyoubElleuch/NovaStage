import type { CanvasCheckpoint, CanvasEdge, CanvasNode, EdgeType } from "./types";

/**
 * Undo/redo works on the user's own change (a delta between two states), not on whole-canvas snapshots,
 * so reverting one edit never overwrites what collaborators changed elsewhere.
 */
export interface CanvasState { nodes: CanvasNode[]; edges: CanvasEdge[] }

export const NODE_FIELDS = [
  "title", "description", "status", "position_x", "position_y", "width", "height", "color",
  "aws_metadata", "group_metadata", "annotation_metadata", "parent_group_id",
] as const;
export type NodeField = (typeof NODE_FIELDS)[number];
export type NodeFieldValues = Partial<Pick<CanvasNode, NodeField>>;
export type EdgeFieldValues = { label?: string | null; edge_type?: EdgeType };

export type CanvasOp =
  | { kind: "node:create"; node: CanvasNode }
  | { kind: "node:delete"; node: CanvasNode }
  | { kind: "node:update"; nodeId: string; from: NodeFieldValues; to: NodeFieldValues }
  | { kind: "checkpoint:add"; nodeId: string; checkpoint: CanvasCheckpoint }
  | { kind: "checkpoint:delete"; nodeId: string; checkpoint: CanvasCheckpoint }
  | { kind: "checkpoint:toggle"; nodeId: string; checkpoint: CanvasCheckpoint; from: boolean; to: boolean }
  | { kind: "checkpoint:edit"; nodeId: string; checkpoint: CanvasCheckpoint; from: string; to: string }
  | { kind: "edge:create"; edge: CanvasEdge }
  | { kind: "edge:delete"; edge: CanvasEdge }
  | { kind: "edge:update"; edge: CanvasEdge; from: EdgeFieldValues; to: EdgeFieldValues };

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Server-assigned edge IDs change when an edge is re-created, so edges are matched by what they connect. */
export const edgeKey = (edge: Pick<CanvasEdge, "source_node_id" | "target_node_id" | "source_handle" | "target_handle">) =>
  [edge.source_node_id, edge.target_node_id, edge.source_handle, edge.target_handle].join("|");

export function statusFromCheckpoints(checkpoints: CanvasCheckpoint[], fallback: CanvasNode["status"]): CanvasNode["status"] {
  if (!checkpoints.length) return fallback;
  if (checkpoints.every((checkpoint) => checkpoint.is_completed)) return "completed";
  return checkpoints.some((checkpoint) => checkpoint.is_completed) ? "in_progress" : "draft";
}

function parentDepth(node: CanvasNode, byId: Map<string, CanvasNode>) {
  let depth = 0;
  let current: CanvasNode | undefined = node;
  while (current?.parent_group_id && depth < 16) {
    depth += 1;
    current = byId.get(current.parent_group_id);
  }
  return depth;
}

export function diffCanvas(before: CanvasState, after: CanvasState): CanvasOp[] {
  const beforeNodes = new Map(before.nodes.map((node) => [node.id, node]));
  const afterNodes = new Map(after.nodes.map((node) => [node.id, node]));
  const creates: CanvasOp[] = [];
  const deletes: CanvasOp[] = [];
  const updates: CanvasOp[] = [];
  const checkpoints: CanvasOp[] = [];

  for (const node of [...after.nodes].sort((a, b) => parentDepth(a, afterNodes) - parentDepth(b, afterNodes))) {
    if (!beforeNodes.has(node.id)) creates.push({ kind: "node:create", node });
  }
  for (const node of [...before.nodes].sort((a, b) => parentDepth(b, beforeNodes) - parentDepth(a, beforeNodes))) {
    if (!afterNodes.has(node.id)) deletes.push({ kind: "node:delete", node });
  }

  for (const node of after.nodes) {
    const previous = beforeNodes.get(node.id);
    if (!previous) continue;
    const previousCheckpoints = new Map(previous.checkpoints.map((checkpoint) => [checkpoint.id, checkpoint]));
    const nextCheckpoints = new Map(node.checkpoints.map((checkpoint) => [checkpoint.id, checkpoint]));
    for (const checkpoint of node.checkpoints) {
      const old = previousCheckpoints.get(checkpoint.id);
      if (!old) checkpoints.push({ kind: "checkpoint:add", nodeId: node.id, checkpoint });
      else {
        if (old.is_completed !== checkpoint.is_completed) checkpoints.push({ kind: "checkpoint:toggle", nodeId: node.id, checkpoint, from: old.is_completed, to: checkpoint.is_completed });
        if (old.title !== checkpoint.title) checkpoints.push({ kind: "checkpoint:edit", nodeId: node.id, checkpoint, from: old.title, to: checkpoint.title });
      }
    }
    for (const checkpoint of previous.checkpoints) {
      if (!nextCheckpoints.has(checkpoint.id)) checkpoints.push({ kind: "checkpoint:delete", nodeId: node.id, checkpoint });
    }

    const hasCheckpointChange = checkpoints.some((op) => "nodeId" in op && op.nodeId === node.id);
    const from: NodeFieldValues = {};
    const to: NodeFieldValues = {};
    for (const field of NODE_FIELDS) {
      // The server derives status from checkpoints, so only an explicit status edit is a change of its own.
      if (field === "status" && hasCheckpointChange) continue;
      if (!same(previous[field], node[field])) {
        (from as Record<string, unknown>)[field] = previous[field] ?? null;
        (to as Record<string, unknown>)[field] = node[field] ?? null;
      }
    }
    if (Object.keys(to).length) updates.push({ kind: "node:update", nodeId: node.id, from, to });
  }

  const beforeEdges = new Map(before.edges.map((edge) => [edgeKey(edge), edge]));
  const afterEdges = new Map(after.edges.map((edge) => [edgeKey(edge), edge]));
  const edgeOps: CanvasOp[] = [];
  for (const [key, edge] of afterEdges) {
    const old = beforeEdges.get(key);
    if (!old) edgeOps.push({ kind: "edge:create", edge });
    else if (old.label !== edge.label || (old.edge_type || "dependency") !== (edge.edge_type || "dependency")) {
      edgeOps.push({ kind: "edge:update", edge, from: { label: old.label ?? null, edge_type: old.edge_type }, to: { label: edge.label ?? null, edge_type: edge.edge_type } });
    }
  }
  const edgeDeletes: CanvasOp[] = [];
  for (const [key, edge] of beforeEdges) if (!afterEdges.has(key)) edgeDeletes.push({ kind: "edge:delete", edge });

  // Edges go first when deleting nodes and last when creating them, so no operation references a missing endpoint.
  return [...creates, ...updates, ...checkpoints, ...edgeOps, ...edgeDeletes, ...deletes];
}

function invertOp(op: CanvasOp): CanvasOp {
  switch (op.kind) {
    case "node:create": return { kind: "node:delete", node: op.node };
    case "node:delete": return { kind: "node:create", node: op.node };
    case "node:update": return { ...op, from: op.to, to: op.from };
    case "checkpoint:add": return { ...op, kind: "checkpoint:delete" };
    case "checkpoint:delete": return { ...op, kind: "checkpoint:add" };
    case "checkpoint:toggle": return { ...op, from: op.to, to: op.from };
    case "checkpoint:edit": return { ...op, from: op.to, to: op.from };
    case "edge:create": return { kind: "edge:delete", edge: op.edge };
    case "edge:delete": return { kind: "edge:create", edge: op.edge };
    case "edge:update": return { ...op, from: op.to, to: op.from };
  }
}

export function invertOps(ops: CanvasOp[]): CanvasOp[] {
  // Deletions of edges/nodes must run before creations when reversed, so re-sort after inverting.
  return reorder([...ops].reverse().map(invertOp));
}

const ORDER: Record<CanvasOp["kind"], number> = {
  "node:create": 0, "node:update": 1, "checkpoint:add": 2, "checkpoint:toggle": 2, "checkpoint:edit": 2, "checkpoint:delete": 2,
  "edge:create": 3, "edge:update": 3, "edge:delete": 4, "node:delete": 5,
};

function reorder(ops: CanvasOp[]) {
  const nodes = new Map<string, CanvasNode>();
  for (const op of ops) if (op.kind === "node:create" || op.kind === "node:delete") nodes.set(op.node.id, op.node);
  const depth = (op: CanvasOp) => (op.kind === "node:create" || op.kind === "node:delete" ? parentDepth(op.node, nodes) : 0);
  return ops
    .map((op, index) => ({ op, index }))
    .sort((a, b) => ORDER[a.op.kind] - ORDER[b.op.kind]
      || (a.op.kind === "node:delete" ? depth(b.op) - depth(a.op) : depth(a.op) - depth(b.op))
      || a.index - b.index)
    .map(({ op }) => op);
}

export const findCheckpoint = (node: CanvasNode | undefined, checkpoint: CanvasCheckpoint) =>
  node?.checkpoints.find((item) => item.id === checkpoint.id)
  ?? node?.checkpoints.find((item) => item.title === checkpoint.title && item.is_completed === checkpoint.is_completed)
  ?? node?.checkpoints.find((item) => item.title === checkpoint.title);

export const findEdge = (edges: CanvasEdge[], edge: CanvasEdge) =>
  edges.find((item) => item.id === edge.id) ?? edges.find((item) => edgeKey(item) === edgeKey(edge));

/** Applies ops to local state, skipping any that no longer make sense (for example, a collaborator deleted the target). */
export function applyOps(state: CanvasState, ops: CanvasOp[]): CanvasState {
  let nodes = state.nodes;
  let edges = state.edges;
  const patch = (nodeId: string, change: (node: CanvasNode) => CanvasNode) => {
    nodes = nodes.map((node) => (node.id === nodeId ? change(node) : node));
  };
  for (const op of ops) {
    const exists = (nodeId: string) => nodes.some((node) => node.id === nodeId);
    switch (op.kind) {
      case "node:create":
        if (!exists(op.node.id)) nodes = [...nodes, { ...op.node, checkpoints: op.node.checkpoints || [] }];
        break;
      case "node:delete":
        nodes = nodes.filter((node) => node.id !== op.node.id);
        edges = edges.filter((edge) => edge.source_node_id !== op.node.id && edge.target_node_id !== op.node.id);
        break;
      case "node:update":
        if (exists(op.nodeId)) patch(op.nodeId, (node) => ({ ...node, ...op.to }));
        break;
      case "checkpoint:add":
        if (exists(op.nodeId)) patch(op.nodeId, (node) => (node.checkpoints.some((item) => item.id === op.checkpoint.id) ? node : { ...node, checkpoints: [...node.checkpoints, op.checkpoint] }));
        break;
      case "checkpoint:delete":
        patch(op.nodeId, (node) => {
          const target = findCheckpoint(node, op.checkpoint);
          return target ? { ...node, checkpoints: node.checkpoints.filter((item) => item.id !== target.id) } : node;
        });
        break;
      case "checkpoint:toggle":
        patch(op.nodeId, (node) => {
          const target = findCheckpoint(node, op.checkpoint);
          if (!target) return node;
          const next = node.checkpoints.map((item) => (item.id === target.id ? { ...item, is_completed: op.to } : item));
          return { ...node, checkpoints: next, status: statusFromCheckpoints(next, node.status) };
        });
        break;
      case "checkpoint:edit":
        patch(op.nodeId, (node) => {
          const target = findCheckpoint(node, op.checkpoint);
          return target ? { ...node, checkpoints: node.checkpoints.map((item) => (item.id === target.id ? { ...item, title: op.to } : item)) } : node;
        });
        break;
      case "edge:create":
        if (exists(op.edge.source_node_id) && exists(op.edge.target_node_id) && !findEdge(edges, op.edge)) edges = [...edges, op.edge];
        break;
      case "edge:delete": {
        const target = findEdge(edges, op.edge);
        if (target) edges = edges.filter((edge) => edge.id !== target.id);
        break;
      }
      case "edge:update": {
        const target = findEdge(edges, op.edge);
        if (target) edges = edges.map((edge) => (edge.id === target.id ? { ...edge, ...op.to } : edge));
        break;
      }
    }
  }
  return { nodes, edges };
}

export interface OpSummary { text: string; counts: Record<string, number> }

const nounOf = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const joinAnd = (parts: string[]) => (parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`);

/** Past-tense description of what happened, for confirmations such as "Added 3 cards and 2 connections". */
export function describeOpsDone(ops: CanvasOp[]): string {
  const { counts } = summarizeOps(ops);
  const clauses = [
    ["added", [counts.added && nounOf(counts.added, "card"), counts.connectionsAdded && nounOf(counts.connectionsAdded, "connection")]],
    ["updated", [counts.changed && nounOf(counts.changed, "card"), counts.connectionsChanged && nounOf(counts.connectionsChanged, "connection")]],
    ["changed", [counts.checkpoints && nounOf(counts.checkpoints, "checkpoint")]],
    ["removed", [counts.removed && nounOf(counts.removed, "card"), counts.connectionsRemoved && nounOf(counts.connectionsRemoved, "connection")]],
  ]
    .map(([verb, nouns]) => [verb, (nouns as Array<string | number | undefined>).filter(Boolean) as string[]] as const)
    .filter(([, nouns]) => nouns.length)
    .map(([verb, nouns]) => `${verb} ${joinAnd(nouns)}`);
  if (!clauses.length) return "No changes";
  const sentence = joinAnd(clauses);
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
export function summarizeOps(ops: CanvasOp[]): OpSummary {
  const counts: Record<string, number> = {};
  const bump = (key: string) => { counts[key] = (counts[key] || 0) + 1; };
  for (const op of ops) {
    if (op.kind === "node:create") bump("added");
    else if (op.kind === "node:delete") bump("removed");
    else if (op.kind === "node:update") bump("changed");
    else if (op.kind.startsWith("checkpoint:")) bump("checkpoints");
    else if (op.kind === "edge:create") bump("connectionsAdded");
    else if (op.kind === "edge:delete") bump("connectionsRemoved");
    else bump("connectionsChanged");
  }
  const noun = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
  const parts = [
    counts.added && `add ${noun(counts.added, "card")}`,
    counts.removed && `remove ${noun(counts.removed, "card")}`,
    counts.changed && `change ${noun(counts.changed, "card")}`,
    counts.checkpoints && `change ${noun(counts.checkpoints, "checkpoint")}`,
    counts.connectionsAdded && `add ${noun(counts.connectionsAdded, "connection")}`,
    counts.connectionsRemoved && `remove ${noun(counts.connectionsRemoved, "connection")}`,
    counts.connectionsChanged && `change ${noun(counts.connectionsChanged, "connection")}`,
  ].filter(Boolean) as string[];
  return { text: parts.length ? parts.join(", ") : "make no changes", counts };
}

export interface History {
  entries: CanvasOp[][];
  /** Number of entries currently applied; entries.slice(index) are redoable. */
  index: number;
}

export const MAX_HISTORY_ENTRIES = 50;
export const emptyHistory = (): History => ({ entries: [], index: 0 });

export function recordHistory(history: History, ops: CanvasOp[]): History {
  if (!ops.length) return history;
  const entries = [...history.entries.slice(0, history.index), ops].slice(-MAX_HISTORY_ENTRIES);
  return { entries, index: entries.length };
}

export const canUndo = (history: History) => history.index > 0;
export const canRedo = (history: History) => history.index < history.entries.length;
