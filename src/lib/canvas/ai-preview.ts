import { createAdminClient } from "@/lib/supabase/admin";
import type { AIWorkflowResult, AIGenerationMode } from "@/lib/ai/types";
import { assertSemanticGraph } from "@/lib/ai/semantic-graph";
import { buildAIGraph } from "./ai-graph";
import type { CanvasNode } from "./types";

export async function canvasFingerprint(projectId: string): Promise<string> {
  const { data, error } = await createAdminClient().rpc("canvas_content_fingerprint", {
    p_project_id: projectId,
  });
  if (error || typeof data !== "string")
    throw new Error("Canvas preview is unavailable. Check migration 028.");
  return data;
}

export async function createCanvasPreview(
  projectId: string,
  userId: string,
  mode: AIGenerationMode,
  result: AIWorkflowResult,
  nodes: CanvasNode[],
  baseline: string,
) {
  assertSemanticGraph({ ...result, mode }, mode);
  const graph = buildAIGraph(result, nodes, mode);
  const admin = createAdminClient();
  // Bound retention without a scheduled job; prompts are never stored here.
  await admin
    .from("canvas_ai_previews")
    .delete()
    .eq("user_id", userId)
    .lt("expires_at", new Date().toISOString());
  const { data, error } = await admin
    .from("canvas_ai_previews")
    .insert({
      project_id: projectId,
      user_id: userId,
      mode,
      graph,
      baseline,
      summary: result.summary,
    })
    .select("id, expires_at")
    .single();
  if (error || !data) throw new Error("Unable to save the AI preview. Nothing was applied.");
  return {
    id: data.id as string,
    expiresAt: data.expires_at as string,
    nodes: graph.nodes,
    edges: graph.edges,
    deletedIds: graph.deletedIds,
  };
}
