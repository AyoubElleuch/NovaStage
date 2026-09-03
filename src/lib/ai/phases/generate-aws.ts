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
import { AWS_WEB_APP_FEW_SHOT_EXAMPLE } from "../prompts/aws-few-shot-examples";

const WORKFLOW_SCHEMA = {
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
          tempId: { type: "STRING" },
          serviceId: { type: "STRING" },
          name: { type: "STRING" },
          description: { type: "STRING" },
          region: { type: "STRING" },
          config: {
            type: "OBJECT",
            additionalProperties: { type: "STRING" }
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
    }
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

  // Format existing canvas context into clear text
  let contextDescription = "The canvas is currently empty. Generate a brand-new comprehensive AWS architecture.";
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

  const userPromptText = `${contextDescription}${decompositionContext}\n\nUser Request: "${prompt}"`;

  const result = await callGemini<AIWorkflowResult>(userPromptText, WORKFLOW_SCHEMA, {
    systemInstruction,
    temperature: 0.2,
  });

  if (
    result &&
    Array.isArray(result.serviceNodes) &&
    result.serviceNodes.length > 0 &&
    Array.isArray(result.dataFlowEdges)
  ) {
    return {
      ...result,
      mode: "aws_architecture" as const,
      milestones: [],
      edges: [],
      decomposition,
    };
  }

  // Safe fallback if Gemini is offline or fails
  return {
    intent: "create_pipeline",
    summary: "Generated fallback basic web app architecture.",
    mode: "aws_architecture" as const,
    milestones: [],
    edges: [],
    serviceNodes: AWS_WEB_APP_FEW_SHOT_EXAMPLE.serviceNodes || [],
    groups: AWS_WEB_APP_FEW_SHOT_EXAMPLE.groups || [],
    dataFlowEdges: AWS_WEB_APP_FEW_SHOT_EXAMPLE.dataFlowEdges || [],
    decomposition,
  };
}
