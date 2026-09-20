/**
 * Phase 2: AWS Architecture Generation
 * Generates comprehensive AWS infrastructure DAGs with VPCs, Subnets, and service nodes.
 */

import {
  CanvasAIContext,
  AIWorkflowResult,
  PromptDecomposition,
} from "../types";
import { buildAWSGenerationSystemInstruction } from "../prompts/system-generate-aws";
import { callGemini } from "../gemini";
import { evaluateArchitectureQuality, hasUsableArchitecture, normalizeArchitectureResult } from "../architecture-quality";

export const AWS_WORKFLOW_SCHEMA = {
  type: "OBJECT",
  properties: {
    intent: {
      type: "STRING",
      enum: ["create_pipeline", "update_pipeline", "create_parallel"],
    },
    summary: { type: "STRING" },
    serviceNodes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          tempId: { type: "STRING" },
          serviceId: { type: "STRING" },
          name: { type: "STRING" },
          description: { type: "STRING" },
          region: { type: "STRING" },
          configEntries: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                key: { type: "STRING" },
                value: { type: "STRING" }
              },
              required: ["key", "value"]
            }
          },
          parentGroupTempId: { type: "STRING" }
        },
        required: ["tempId", "serviceId"]
      }
    },
    groups: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          tempId: { type: "STRING" },
          label: { type: "STRING" },
          style: { 
            type: "STRING",
            enum: ["vpc", "subnet", "region", "availability_zone", "custom"]
          },
          childTempIds: {
            type: "ARRAY",
            items: { type: "STRING" }
          },
          parentGroupTempId: { type: "STRING" }
        },
        required: ["tempId", "label", "style", "childTempIds"]
      }
    },
    dataFlowEdges: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          fromId: { type: "STRING" },
          toId: { type: "STRING" },
          edgeType: { type: "STRING" },
          label: { type: "STRING" },
          protocol: { type: "STRING" }
        },
        required: ["fromId", "toId", "edgeType"]
      }
    },
    deletedServiceNodeIds: { type: "ARRAY", items: { type: "STRING" } },
    deletedGroupIds: { type: "ARRAY", items: { type: "STRING" } }
  },
  required: ["intent", "summary", "serviceNodes", "groups", "dataFlowEdges"],
};

/**
 * Execute Phase 2: Generate AWS architecture DAG with Gemini
 */
export async function generateAWSArchitecture(
  prompt: string,
  decomposition?: PromptDecomposition,
  context?: CanvasAIContext
): Promise<AIWorkflowResult> {
  const systemInstruction = buildAWSGenerationSystemInstruction(prompt, decomposition);

  // Format the complete existing topology; update requests must never be blind.
  let contextDescription = "The canvas is currently empty. Generate a brand-new comprehensive AWS architecture.";
  const hasCanvasContext = Boolean(
    context?.existingMilestones?.length ||
    context?.existingServiceNodes?.length ||
    context?.existingGroups?.length
  );
  if (hasCanvasContext) {
    const simplifiedMilestones = (context?.existingMilestones || []).map((m, idx) => ({
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

    const simplifiedEdges = (context?.existingEdges || []).map((e) => ({
      fromId: e.sourceId,
      toId: e.targetId,
    }));

    contextDescription = `ORCHESTRATION OPERATION: ${context?.operation || "update"}\n` +
      `Current Canvas Graph State (UUIDs are authoritative):\n${JSON.stringify(
      {
        existingMilestones: simplifiedMilestones,
        existingEdges: simplifiedEdges,
        existingServiceNodes: context?.existingServiceNodes || [],
        existingGroups: context?.existingGroups || [],
        existingDataFlowEdges: context?.existingDataFlowEdges || [],
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

  const userPromptText = `${contextDescription}${decompositionContext}\n\nUser Request: "${prompt}"\n\n` +
    (context?.operation === "update"
      ? "Return the complete desired AWS topology after the update. Preserve each retained resource's exact UUID in both id and tempId. Use new_* tempIds only for additions, and list explicit removals in deletedServiceNodeIds/deletedGroupIds."
      : "Create a distinct new architecture. Do not reuse IDs from existing canvas resources.");

  let result = await callGemini<AIWorkflowResult>(userPromptText, AWS_WORKFLOW_SCHEMA, {
    systemInstruction,
    temperature: 0.2,
  });
  result = normalizeArchitectureResult(result);
  let quality = evaluateArchitectureQuality(result, prompt, decomposition);
  if (!quality.ok) {
    result = await callGemini<AIWorkflowResult>(
      `${userPromptText}\n\nThe previous draft was rejected for these reasons:\n- ${quality.issues.join("\n- ")}\nRegenerate the complete topology and correct every issue.`,
      AWS_WORKFLOW_SCHEMA,
      { systemInstruction, temperature: 0.15 }
    );
    result = normalizeArchitectureResult(result);
    quality = evaluateArchitectureQuality(result, prompt, decomposition);
  }

  if (hasUsableArchitecture(result)) {
    if (!quality.ok) {
      console.warn("[AI Pipeline] Accepting a usable AWS topology after quality retry:", quality.issues);
    }
    return {
      ...result,
      intent: context?.operation === "update" ? "update_pipeline" : "create_pipeline",
      mode: "aws_architecture" as const,
      milestones: [],
      edges: [],
      decomposition,
    };
  }

  throw new Error(
    "The AI provider did not return a valid AWS topology. No canvas changes were applied; please retry."
  );
}
