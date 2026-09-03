/**
 * Phase 2: Full-Stack Generation
 * Unifies execution roadmap milestones and AWS cloud architecture topology
 * into an interlocked, cohesive full-stack payload.
 */

import {
  CanvasAIContext,
  AIWorkflowResult,
  PromptDecomposition,
  AIProcessedMilestone,
  AIProcessedServiceNode,
  AIProcessedGroup,
  AIProcessedDataFlowEdge,
} from "../types";
import { buildFullStackSystemInstruction } from "../prompts/system-generate-aws";
import { callGemini } from "../gemini";
import { FULL_STACK_FEW_SHOT_EXAMPLE } from "../prompts/aws-few-shot-examples";

const FULL_STACK_SCHEMA = {
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
          tempId: { type: "STRING" },
          title: { type: "STRING" },
          description: { type: "STRING" },
          phase: {
            type: "STRING",
            enum: ["planning", "architecture", "implementation", "testing", "deployment", "operations"],
          },
          checkpoints: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                tempId: { type: "STRING" },
                title: { type: "STRING" },
                isCompleted: { type: "BOOLEAN" },
              },
              required: ["title"],
            },
          },
        },
        required: ["tempId", "title", "checkpoints"],
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
            additionalProperties: { type: "STRING" },
          },
          parentGroupTempId: { type: "STRING" },
        },
        required: ["tempId", "serviceId"],
      },
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
            enum: ["vpc", "subnet", "region", "availability_zone", "custom"],
          },
          childTempIds: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          parentGroupTempId: { type: "STRING" },
        },
        required: ["tempId", "label", "style", "childTempIds"],
      },
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
          protocol: { type: "STRING" },
        },
        required: ["fromId", "toId", "edgeType"],
      },
    },
  },
  required: ["intent", "summary", "milestones", "edges", "serviceNodes", "groups", "dataFlowEdges"],
};

/**
 * Ensures interlocking bridge edges exist between milestones and their corresponding AWS components.
 */
function ensureInterlockingBridges(
  milestones: AIProcessedMilestone[],
  serviceNodes: AIProcessedServiceNode[],
  groups: AIProcessedGroup[],
  existingDataFlowEdges: AIProcessedDataFlowEdge[]
): AIProcessedDataFlowEdge[] {
  const edges = [...existingDataFlowEdges];
  const connectedMilestones = new Set<string>();

  // Check which milestones are already connected to an AWS resource
  for (const edge of edges) {
    if (milestones.some((m) => m.tempId === edge.fromId || m.id === edge.fromId)) {
      connectedMilestones.add(edge.fromId);
    }
  }

  // If any milestones are missing links to AWS resources, intelligently bridge them
  for (const m of milestones) {
    const mId = m.tempId || m.id || "";
    if (connectedMilestones.has(mId)) continue;

    const lowerTitle = (m.title + " " + (m.description || "")).toLowerCase();
    
    // Find closest service match
    let bestService = serviceNodes.find((s) => {
      const sId = s.serviceId.toLowerCase();
      const sName = (s.name || "").toLowerCase();
      return lowerTitle.includes(sId) || (sName && lowerTitle.includes(sName));
    });

    // Domain heuristic fallbacks
    if (!bestService) {
      if (lowerTitle.includes("db") || lowerTitle.includes("data") || lowerTitle.includes("schema") || lowerTitle.includes("sql") || lowerTitle.includes("postgres")) {
        bestService = serviceNodes.find((s) => s.serviceId === "rds" || s.serviceId === "dynamodb" || s.serviceId === "aurora");
      } else if (lowerTitle.includes("cache") || lowerTitle.includes("session")) {
        bestService = serviceNodes.find((s) => s.serviceId === "elasticache");
      } else if (lowerTitle.includes("cdn") || lowerTitle.includes("dns") || lowerTitle.includes("domain") || lowerTitle.includes("edge")) {
        bestService = serviceNodes.find((s) => s.serviceId === "cloudfront" || s.serviceId === "route53");
      } else if (lowerTitle.includes("network") || lowerTitle.includes("vpc") || lowerTitle.includes("subnet")) {
        const vpcGroup = groups.find((g) => g.style === "vpc");
        if (vpcGroup) {
          edges.push({
            fromId: mId,
            toId: vpcGroup.tempId,
            edgeType: "dependency",
            label: "Provisions VPC Fabric",
            protocol: "iac",
          });
          connectedMilestones.add(mId);
          continue;
        }
      } else if (lowerTitle.includes("api") || lowerTitle.includes("container") || lowerTitle.includes("docker") || lowerTitle.includes("service")) {
        bestService = serviceNodes.find((s) => s.serviceId === "ecs" || s.serviceId === "eks" || s.serviceId === "lambda");
      } else if (lowerTitle.includes("monitor") || lowerTitle.includes("log") || lowerTitle.includes("metric") || lowerTitle.includes("alarm")) {
        bestService = serviceNodes.find((s) => s.serviceId === "cloudwatch");
      } else if (lowerTitle.includes("sec") || lowerTitle.includes("key") || lowerTitle.includes("encrypt")) {
        bestService = serviceNodes.find((s) => s.serviceId === "kms" || s.serviceId === "waf" || s.serviceId === "iam");
      }
    }

    if (bestService) {
      edges.push({
        fromId: mId,
        toId: bestService.tempId,
        edgeType: "dependency",
        label: "Provisions & Configures",
        protocol: "iac",
      });
      connectedMilestones.add(mId);
    }
  }

  return edges;
}

/**
 * Execute Phase 2: Generate unified, interlocked Full-Stack architecture and roadmap
 */
export async function generateFullStack(
  prompt: string,
  decomposition?: PromptDecomposition,
  context?: CanvasAIContext
): Promise<AIWorkflowResult> {
  const systemInstruction = buildFullStackSystemInstruction(prompt, decomposition);

  const contextSnippet = context?.existingMilestones?.length
    ? `\nEXISTING CANVAS MILESTONES TO EXTEND:\n${context.existingMilestones.map((m) => `- ${m.title}`).join("\n")}\n`
    : "";

  const userContent = `USER SYSTEM ARCHITECTURE & PROJECT REQUEST:
"${prompt}"
${contextSnippet}
Produce a complete, senior-architect-grade Full-Stack Architecture and Execution Roadmap.
Ensure:
1. Every milestone is an actionable engineering step with deep technical checkpoints.
2. The AWS architecture has a proper VPC container with public, private, and database subnets.
3. Edge services (CloudFront, Route 53) are outside the VPC.
4. Add interlocking cross-edges in dataFlowEdges connecting each milestone to its corresponding AWS resource.
`;

  try {
    const rawResult = await callGemini<AIWorkflowResult>(
      userContent,
      FULL_STACK_SCHEMA,
      {
        systemInstruction,
        temperature: 0.2,
      }
    );

    if (rawResult && rawResult.serviceNodes && rawResult.serviceNodes.length > 0) {
      const bridgedDataFlowEdges = ensureInterlockingBridges(
        rawResult.milestones || [],
        rawResult.serviceNodes || [],
        rawResult.groups || [],
        rawResult.dataFlowEdges || []
      );

      return {
        intent: rawResult.intent || "create_pipeline",
        mode: "full_stack" as const,
        summary: rawResult.summary || "Generated interlocked full-stack architecture and roadmap.",
        milestones: rawResult.milestones || [],
        edges: rawResult.edges || [],
        serviceNodes: rawResult.serviceNodes || [],
        groups: rawResult.groups || [],
        dataFlowEdges: bridgedDataFlowEdges,
        decomposition,
      };
    }
  } catch (err) {
    console.warn("Gemini full-stack generation error, activating gold-standard fallback:", err);
  }

  // Safe fallback to the gold-standard interlocked example
  return {
    ...FULL_STACK_FEW_SHOT_EXAMPLE,
    mode: "full_stack" as const,
    decomposition,
  };
}

