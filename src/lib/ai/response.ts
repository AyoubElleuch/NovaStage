import type { CanvasNode, CanvasEdge } from "../canvas/types";

interface AIGenerationResponse {
  success: boolean;
  nodes: CanvasNode[];
  edges?: CanvasEdge[];
  intent?: string;
  summary?: string;
  requests_remaining?: number;
}

export async function readAIGenerationResponse(response: Response): Promise<AIGenerationResponse> {
  const fallback = response.status === 504 || response.status === 408
    ? "AI generation timed out. Please try a smaller request."
    : "AI generation is temporarily unavailable. Please try again.";
  const data = await response.json().catch(() => null);

  if (!data || typeof data !== "object") throw new Error(fallback);
  if (!response.ok) {
    const message = data.message || data.error;
    throw new Error(typeof message === "string" && message.length <= 500 && !/<[^>]+>/.test(message)
      ? message
      : fallback);
  }
  if (data.success !== true || !Array.isArray(data.nodes)) {
    throw new Error("AI returned an incomplete workflow. Please try again.");
  }
  return data;
}