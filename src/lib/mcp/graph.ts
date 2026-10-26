import { randomUUID } from "node:crypto";
import type { CanvasNode } from "../canvas/types";
import type { AIWorkflowResult } from "../ai/types";
import { buildGeneratedGraph } from "../canvas/generated-graph";

/** Compute geometry with semantic IDs before assigning random persistence IDs. */
export function buildMcpGraph(input: AIWorkflowResult, existing: CanvasNode[]) {
  const graph = buildGeneratedGraph(input, existing);
  const ids = new Map(graph.nodes.map(node => [node.id, randomUUID()]));
  const resolve = (id: string) => ids.get(id)!;
  return { ...graph,
    nodes: graph.nodes.map(node => ({ ...node, id: resolve(node.id),
      parent_group_id: node.parent_group_id ? resolve(node.parent_group_id) : null,
      group_metadata: node.group_metadata ? { ...node.group_metadata, childNodeIds: node.group_metadata.childNodeIds.map(resolve) } : null,
      checkpoints: node.checkpoints.map(cp => ({ ...cp, id: randomUUID(), node_id: resolve(node.id) })),
    })),
    edges: graph.edges.map(edge => ({ ...edge, id: randomUUID(), source_node_id: resolve(edge.source_node_id), target_node_id: resolve(edge.target_node_id) })),
  };
}
