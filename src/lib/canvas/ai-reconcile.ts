import { createAdminClient } from "@/lib/supabase/admin";
import type { CanvasNode, CanvasEdge } from "./types";
import type { AIWorkflowResult, AIGenerationMode } from "../ai/types";
import { assertSemanticGraph } from "../ai/semantic-graph";
import { buildAIGraph } from "./ai-graph";
import { getProjectCanvasData } from "./server";

async function applyGraph(projectId: string, result: AIWorkflowResult, existingData: { nodes: CanvasNode[]; edges: CanvasEdge[] }, userId: string, mode: AIGenerationMode) {
  assertSemanticGraph({ ...result, mode: result.mode || mode }, mode);
  const graph = buildAIGraph(result, existingData.nodes, mode);
  const { error } = await createAdminClient().rpc("apply_canvas_ai_graph", {
    p_project_id: projectId, p_user_id: userId, p_mode: mode, p_graph: graph,
  });
  if (error) throw new Error("The generated diagram could not be saved atomically. Nothing was saved. Check migration 026 and refresh before retrying.");
  const saved = await getProjectCanvasData(projectId);
  return { ...saved, summary: result.summary, intent: result.intent, tempIdToUuid: graph.tempIdToUuid };
}

export function applyAIWorkflowResult(projectId: string, result: AIWorkflowResult, existingData: { nodes: CanvasNode[]; edges: CanvasEdge[] }, userId: string) {
  return applyGraph(projectId, result, existingData, userId, "workflow");
}

export function applyAWSServiceNodes(projectId: string, result: AIWorkflowResult, existingData: { nodes: CanvasNode[]; edges: CanvasEdge[] }, userId: string) {
  return applyGraph(projectId, result, existingData, userId, "aws_architecture");
}
