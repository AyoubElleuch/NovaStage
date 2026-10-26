/**
 * Phase 2: Deep Workflow Generation
 * Generates comprehensive branching DAG pipelines with domain-aware checkpoints and parallel groupings.
 */

import {
  CanvasAIContext,
  AIWorkflowResult,
  PromptDecomposition,
} from "../types";
import { buildGenerationSystemInstruction } from "../prompts/system-generate";
import { callGemini } from "../gemini";

import { assertSemanticGraph } from "../semantic-graph";

const WORKFLOW_SCHEMA = {
  type: "OBJECT",
  properties: {
    intent: {
      type: "STRING",
      enum: ["create_pipeline", "update_pipeline", "create_parallel"],
    },
    summary: { type: "STRING" },
    milestones: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          tempId: { type: "STRING" },
          title: { type: "STRING" },
          description: { type: "STRING" },
          color: {
            type: "STRING",
            enum: ["default", "amber", "purple", "rose"],
          },
          phase: {
            type: "STRING",
            enum: ["planning", "architecture", "implementation", "testing", "deployment", "operations"],
          },
          parallelGroup: { type: "STRING" },
          sortOrder: { type: "INTEGER" },
          checkpoints: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                title: { type: "STRING" },
                isCompleted: { type: "BOOLEAN" },
              },
              required: ["title"],
            },
          },
        },
        required: ["title", "checkpoints"],
      },
    },
    edges: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          fromId: { type: "STRING" },
          toId: { type: "STRING" },
        },
        required: ["fromId", "toId"],
      },
    },
    deletedMilestoneIds: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: ["intent", "summary", "milestones", "edges"],
};

/**
 * Execute Phase 2: Generate deep workflow DAG with Gemini
 */
export async function generateDeepWorkflow(
  prompt: string,
  decomposition?: PromptDecomposition,
  context?: CanvasAIContext
): Promise<AIWorkflowResult> {
  const systemInstruction = buildGenerationSystemInstruction(prompt, decomposition);

  // Format existing canvas context into clear text
  let contextDescription = "The canvas is currently empty. Generate a brand-new comprehensive pipeline.";
  if (context?.existingMilestones && context.existingMilestones.length > 0) {
    const simplifiedMilestones = context.existingMilestones.map((m, idx) => ({
      id: m.id,
      stepNumber: idx + 1,
      order: m.order,
      title: m.title,
      description: m.description,
      color: m.color,
      status: m.status,
      checkpoints: m.checkpoints.map((cp) => ({
        id: cp.id,
        title: cp.title,
        isCompleted: cp.is_completed,
      })),
    }));

    const simplifiedEdges = (context.existingEdges || []).map((e) => ({
      fromId: e.sourceId,
      toId: e.targetId,
    }));

    contextDescription = `Current Canvas Graph State:\n${JSON.stringify(
      {
        existingMilestones: simplifiedMilestones,
        existingEdges: simplifiedEdges,
      },
      null,
      2
    )}`;
  }

  let decompositionContext = "";
  if (decomposition) {
    decompositionContext = `\n\nPhase 1 Architectural Decomposition:\n${JSON.stringify(
      {
        projectType: decomposition.projectType,
        complexityTier: decomposition.complexityTier,
        domainTags: decomposition.domainTags,
        targetMilestones: decomposition.targetMilestoneCount,
        suggestedParallelTracks: decomposition.suggestedParallelTracks,
        concernAreas: decomposition.concernAreas.map((c) => ({
          name: c.name,
          category: c.category,
          priority: c.priority,
          dependencies: c.dependencies,
        })),
        techStackHints: decomposition.techStackHints,
        riskFactors: decomposition.riskFactors,
      },
      null,
      2
    )}`;
  }

  const userPromptText = `Selected mode: Workflow. Operation: ${context?.operation || "create"}. ${context?.operation === "update" ? "Return the complete desired workflow, retaining existing milestone and checkpoint IDs." : "Create a distinct new workflow using new tempIds only. Existing work is context; do not modify or delete it."}\n${contextDescription}${decompositionContext}\n\nUser Request: "${prompt}"`;

  let feedback = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await callGemini<AIWorkflowResult>(userPromptText + feedback, WORKFLOW_SCHEMA, {
      systemInstruction, temperature: 0.2,
    });
    try {
      if (!result) throw new Error("No structured workflow was returned.");
      const workflow = { ...result, intent: context?.operation === "update" ? "update_pipeline" as const : "create_pipeline" as const, mode: "workflow" as const, decomposition };
      assertSemanticGraph(workflow, "workflow");
      return workflow;
    } catch (error) {
      feedback = "\nPrevious draft rejected: " + (error instanceof Error ? error.message : "Invalid workflow") + ". Return the complete corrected graph. Do not invent missing tasks or dependencies.";
    }
  }
  throw new Error("The AI provider did not return a valid workflow. No canvas changes were applied; please retry." + feedback);
}
