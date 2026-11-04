import type { CanvasNode, CanvasEdge } from "../canvas/types";

interface AIGenerationResponse {
  success: boolean;
  nodes: CanvasNode[];
  edges?: CanvasEdge[];
  intent?: string;
  summary?: string;
  requests_remaining?: number;
}

export type AIFailureCode =
  | "QUOTA_EXCEEDED"
  | "COLLISION_LOCKED"
  | "AI_GENERATION_FAILED"
  | "TIMEOUT"
  | "NETWORK"
  | "INVALID_REQUEST"
  | "INCOMPLETE"
  | "UNAVAILABLE";

/** A failed generation with enough structure for the UI to offer a useful next step. */
export class AIGenerationError extends Error {
  readonly code: AIFailureCode;
  readonly status?: number;
  /** The route restores the request it consumed when generation fails after the model was called. */
  readonly refunded: boolean;
  readonly generatingUser?: string;
  constructor(message: string, code: AIFailureCode, options: { status?: number; refunded?: boolean; generatingUser?: string } = {}) {
    super(message);
    this.name = "AIGenerationError";
    this.code = code;
    this.status = options.status;
    this.refunded = options.refunded ?? false;
    this.generatingUser = options.generatingUser;
  }
}

function classify(status: number, data: Record<string, unknown>): AIFailureCode {
  if (data.error === "QUOTA_EXCEEDED") return "QUOTA_EXCEEDED";
  if (data.error === "COLLISION_LOCKED" || status === 409) return "COLLISION_LOCKED";
  if (data.error === "AI_GENERATION_FAILED" || status === 502) return "AI_GENERATION_FAILED";
  if (status === 504 || status === 408) return "TIMEOUT";
  if (status === 400) return "INVALID_REQUEST";
  return "UNAVAILABLE";
}

export async function readAIGenerationResponse(response: Response): Promise<AIGenerationResponse> {
  const fallback = response.status === 504 || response.status === 408
    ? "AI generation timed out. Please try a smaller request."
    : "AI generation is temporarily unavailable. Please try again.";
  const data = await response.json().catch(() => null);

  if (!data || typeof data !== "object") {
    throw new AIGenerationError(fallback, response.status === 504 || response.status === 408 ? "TIMEOUT" : "UNAVAILABLE", { status: response.status });
  }
  if (!response.ok) {
    const message = data.message || data.error;
    const code = classify(response.status, data);
    throw new AIGenerationError(
      typeof message === "string" && message.length <= 500 && !/<[^>]+>/.test(message) ? message : fallback,
      code,
      {
        status: response.status,
        // Failures after the quota was taken are restored by the route; quota and lock rejections never took one.
        refunded: code === "AI_GENERATION_FAILED" || code === "UNAVAILABLE",
        generatingUser: typeof data.generatingUser === "string" ? data.generatingUser : undefined,
      }
    );
  }
  if (data.success !== true || !Array.isArray(data.nodes)) {
    throw new AIGenerationError("AI returned an incomplete workflow. Please try again.", "INCOMPLETE", { status: response.status });
  }
  return data;
}

/** Normalises anything thrown while generating (including aborted or offline requests) to an AIGenerationError. */
export function toAIGenerationError(error: unknown): AIGenerationError {
  if (error instanceof AIGenerationError) return error;
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return new AIGenerationError("AI generation timed out. Reload the canvas to check whether it completed before retrying.", "TIMEOUT");
  }
  if (error instanceof TypeError || (error instanceof Error && /failed to fetch|network|load failed/i.test(error.message))) {
    return new AIGenerationError("NovaStage couldn't be reached. Check your connection, then try again.", "NETWORK");
  }
  return new AIGenerationError(error instanceof Error && error.message ? error.message : "AI generation failed. Please try again.", "UNAVAILABLE");
}

export interface AIFailureGuidance {
  title: string;
  message: string;
  /** Next steps the UI can offer, in priority order. */
  actions: Array<"retry" | "use_own_ai" | "reload">;
  note?: string;
}

export function describeAIFailure(error: AIGenerationError, context: { maxRequests?: number } = {}): AIFailureGuidance {
  switch (error.code) {
    case "QUOTA_EXCEEDED":
      return {
        title: "You've used all your AI requests",
        message: context.maxRequests && context.maxRequests < 999
          ? `Your plan includes ${context.maxRequests} built-in AI requests. Your prompt is kept.`
          : "Your prompt is kept.",
        actions: ["use_own_ai"],
        note: "Your own AI (Codex or Claude) doesn't use this allowance.",
      };
    case "COLLISION_LOCKED":
      return {
        title: `${error.generatingUser || "A collaborator"} is generating right now`,
        message: "Only one generation can run per project at a time. Your prompt is kept; try again in a minute.",
        actions: ["retry"],
        note: "This request wasn't counted.",
      };
    case "AI_GENERATION_FAILED":
      return {
        title: "The AI couldn't produce a valid diagram",
        message: "Try a smaller scope or rephrase the request. Your prompt is kept and your canvas is unchanged.",
        actions: ["retry"],
        note: error.refunded ? "This request wasn't counted against your limit." : undefined,
      };
    case "TIMEOUT":
      return {
        title: "Generation took too long",
        message: "The result may still have been added. Reload the canvas to check before you try again.",
        actions: ["reload", "retry"],
      };
    case "NETWORK":
      return { title: "Couldn't reach NovaStage", message: "Check your connection. Nothing was added to your canvas.", actions: ["retry"] };
    case "INVALID_REQUEST":
      return { title: "That request can't be used", message: error.message, actions: [] };
    case "INCOMPLETE":
      return { title: "The AI's answer was incomplete", message: "Nothing was added. Try again, or simplify the request.", actions: ["retry"] };
    default:
      return {
        title: "AI generation is unavailable",
        message: `${error.message} Your prompt is kept.`,
        actions: ["retry"],
        note: error.refunded ? "This request wasn't counted against your limit." : undefined,
      };
  }
}