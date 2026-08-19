/**
 * NovaStage Multi-Phase AI Workflow Pipeline Orchestrator
 *
 * Architecture:
 * 1. Phase 1: Architectural Decomposition & Domain Analysis (Gemini Call #1)
 * 2. Phase 2: Deep Branching DAG Workflow Generation (Gemini Call #2)
 * 3. Phase 3: Local Deterministic Graph Validation & Auto-Repair (Algorithmic)
 */

import { CanvasAIContext, AIWorkflowResult } from "./types";
import { decomposePrompt } from "./phases/decompose";
import { generateDeepWorkflow } from "./phases/generate";
import { validateAndRepairWorkflow } from "./phases/validate";

export * from "./types";

/**
 * Executes the complete 3-phase AI workflow generation pipeline
 */
export async function executeAIPipeline(
  prompt: string,
  context?: CanvasAIContext
): Promise<AIWorkflowResult> {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) {
    throw new Error("Prompt cannot be empty");
  }

  // Phase 1: Decompose prompt into structured architectural specification
  let decomposition;
  try {
    decomposition = await decomposePrompt(cleanPrompt);
  } catch (decompErr) {
    console.warn("[AI Pipeline] Phase 1 decomposition encountered error, continuing with fallback:", decompErr);
  }

  // Phase 2: Generate deep branching workflow DAG
  const rawWorkflow = await generateDeepWorkflow(cleanPrompt, decomposition, context);

  // Phase 3: Validate, sanitize, and auto-repair graph DAG
  const { workflow: validatedWorkflow, report } = validateAndRepairWorkflow(rawWorkflow);

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[AI Pipeline] Generated ${validatedWorkflow.milestones.length} milestones, ${validatedWorkflow.edges.length} edges. Validation report:`,
      report
    );
  }

  return validatedWorkflow;
}
