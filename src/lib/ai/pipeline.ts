/**
 * NovaStage Multi-Phase AI Workflow Pipeline Orchestrator
 *
 * Architecture:
 * 1. Phase 1: Architectural Decomposition & Domain Analysis (Gemini Call #1)
 * 2. Phase 2: Deep Branching DAG Workflow Generation (Gemini Call #2)
 *    - Mode A: Milestone workflow DAG
 *    - Mode B: AWS infrastructure architecture topology
 *    - Mode C: Full stack (both milestones + AWS architecture)
 * 3. Phase 3: Local Deterministic Graph Validation & Auto-Repair (Algorithmic)
 */

import { CanvasAIContext, AIWorkflowResult, AIGenerationMode } from "./types";
import { decomposePrompt } from "./phases/decompose";
import { generateDeepWorkflow } from "./phases/generate";
import { generateAWSArchitecture } from "./phases/generate-aws";
import { generateFullStack } from "./phases/generate-fullstack";
import { validateAndRepairWorkflow } from "./phases/validate";

export * from "./types";

/**
 * Executes the complete 3-phase AI workflow generation pipeline
 * @param prompt - User's natural language description
 * @param mode - Generation mode: "workflow", "aws_architecture", or "full_stack"
 * @param context - Current canvas state for in-place updates
 */
export async function executeAIPipeline(
  prompt: string,
  mode: AIGenerationMode = "workflow",
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

  // Phase 2: Generate workflow/architecture based on mode
  let rawWorkflow: AIWorkflowResult;
  switch (mode) {
    case "aws_architecture":
      rawWorkflow = await generateAWSArchitecture(cleanPrompt, decomposition, context);
      break;
    case "full_stack":
      rawWorkflow = await generateFullStack(cleanPrompt, decomposition, context);
      break;
    case "workflow":
    default:
      rawWorkflow = await generateDeepWorkflow(cleanPrompt, decomposition, context);
      break;
  }

  // Phase 3: Validate, sanitize, and auto-repair graph DAG
  const { workflow: validatedWorkflow, report } = validateAndRepairWorkflow(rawWorkflow);

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[AI Pipeline] Mode: ${mode}. Generated ${validatedWorkflow.milestones.length} milestones, ` +
      `${validatedWorkflow.serviceNodes?.length ?? 0} service nodes, ` +
      `${validatedWorkflow.edges.length} edges. Validation report:`,
      report
    );
  }

  return validatedWorkflow;
}

