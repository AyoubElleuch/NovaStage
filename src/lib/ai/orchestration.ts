import type { AIGenerationMode, AIGenerationOperation } from "./types";
import type { CanvasNode } from "@/lib/canvas/types";

const EXPLICIT_CREATE = /\b(new|another|separate|fresh|from scratch)\b|\bcreate (?:a )?(?:new|second)\b/i;
const EXPLICIT_UPDATE = /\b(update|modify|change|edit|add|remove|delete|replace|move|connect|disconnect|resize|improve|expand|simplify|secure|scale|fix)\b/i;

/**
 * Resolve create vs update before calling the model. Existing canvases default to
 * update unless the user explicitly asks for a separate/new graph; this prevents
 * accidental duplicate architectures when a request is phrased conversationally.
 */
export function resolveGenerationOperation(
  mode: AIGenerationMode,
  prompt: string,
  nodes: Pick<CanvasNode, "node_type">[],
  requested?: unknown
): AIGenerationOperation {
  if (requested === "create" || requested === "update") return requested;

  const hasRelevantContent = nodes.some((node) => {
    const type = node.node_type || "milestone";
    if (mode === "workflow") return type === "milestone";
    if (mode === "aws_architecture") return type === "aws_service" || type === "group";
    return type === "milestone" || type === "aws_service" || type === "group";
  });

  if (!hasRelevantContent) return "create";
  if (EXPLICIT_CREATE.test(prompt)) return "create";
  if (EXPLICIT_UPDATE.test(prompt)) return "update";
  return "update";
}
