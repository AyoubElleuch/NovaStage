/**
 * Google Gemini AI Canvas Workflow Service
 * Converts natural language & voice prompts into structured NovaStage milestone graphs,
 * supporting both new pipeline creation and intelligent in-place updates.
 */

import {
  CanvasAIContext,
  AIWorkflowResult,
  AIProcessedMilestone,
  AIProcessedEdge,
} from "./types";

export * from "./types";

// Legacy type aliases for backward compatibility
export type GeneratedMilestone = {
  tempId: string;
  title: string;
  description?: string;
  color?: "default" | "amber" | "purple" | "rose";
  checkpoints: string[];
};

export type GeneratedEdge = {
  fromTempId: string;
  toTempId: string;
};

export type GeneratedWorkflow = {
  summary: string;
  milestones: GeneratedMilestone[];
  edges: GeneratedEdge[];
};

const SYSTEM_INSTRUCTION = `You are an elite software architect and technical project manager for NovaStage, a collaborative visual workflow canvas.
Your task is to analyze the user's request and either:
1. CREATE a new workflow pipeline (when the canvas is empty, or when the user explicitly requests an additional separate pipeline).
2. UPDATE the existing workflow pipeline in-place (when the user asks to insert steps, shift ordering, modify milestones, rewire edges, or add/update checkpoints).

Strict Architectural Rules:
1. Intent Recognition:
   - If the canvas is empty or the user asks to create a brand-new distinct pipeline alongside the current one: set "intent": "create_pipeline".
   - If the canvas already has milestones and the user asks to modify, add a step, insert between steps, reorder, delete, or update tasks/checkpoints: set "intent": "update_pipeline".

2. In-Place Updates & Step Insertion:
   - When inserting a step between step X and step Y (e.g. "Add a QA step between step 2 and step 3"):
     a) Keep existing milestones with their original "id" (UUID) and update their "sortOrder" so subsequent steps are incremented/shifted up by 1.
     b) Create the new intermediate milestone with "tempId": "m_new_1", descriptive title, color, and actionable checkpoints.
     c) Rewire edges: remove the direct edge between X and Y, and output edges connecting X -> new intermediate step -> Y.
   - When updating milestone content, title, or checkpoints for an existing step: retain its "id" (UUID) and provide the updated checkpoint list.
   - When deleting a step: include its ID in "deletedMilestoneIds" and reconnect adjacent milestone edges so the pipeline flow remains unbroken.

3. DAG Graph Integrity:
   - Every step must have a unique identifier ("id" for existing steps, "tempId" for newly created steps).
   - All edges must reference valid identifiers in "fromId" and "toId".
   - NEVER create circular dependencies (the graph must remain a clean acyclic DAG).
   - Assign color accents meaningfully:
     - "default" for general architecture, setup, infrastructure
     - "purple" for core business logic, APIs, backend services
     - "amber" for frontend, UI/UX, client components, auth
     - "rose" for testing, security auditing, deployment / launch
   - Provide 3 to 6 actionable, clear checkpoints per milestone.`;

/**
 * Deterministic fallback engine for offline development and testing
 */
export function generateFallbackWorkflow(
  prompt: string,
  context?: CanvasAIContext
): AIWorkflowResult {
  const cleanPrompt = prompt.trim();
  const lowerPrompt = cleanPrompt.toLowerCase();
  const existingMilestones = context?.existingMilestones || [];
  const existingEdges = context?.existingEdges || [];

  // Scenario 1: Modify existing pipeline if milestones exist and prompt indicates mutation
  if (existingMilestones.length > 0) {
    const isExplicitNewPipeline =
      lowerPrompt.includes("create a new pipeline") ||
      lowerPrompt.includes("create another pipeline") ||
      lowerPrompt.includes("build a new workflow") ||
      lowerPrompt.includes("separate pipeline");

    if (!isExplicitNewPipeline) {
      // Check for "between step X and step Y" or "between X and Y"
      const betweenMatch = lowerPrompt.match(
        /between (?:step\s*)?(\d+|one|two|three|four|five)\s+and\s+(?:step\s*)?(\d+|one|two|three|four|five)/i
      );

      const wordToNum: Record<string, number> = {
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
      };

      if (betweenMatch) {
        const stepA = Number(wordToNum[betweenMatch[1].toLowerCase()] || betweenMatch[1]);
        const stepB = Number(wordToNum[betweenMatch[2].toLowerCase()] || betweenMatch[2]);
        const insertAfterIndex = Math.min(stepA, stepB);

        // Sort existing milestones by order
        const sorted = [...existingMilestones].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const prevMilestone = sorted[insertAfterIndex - 1] || sorted[0];
        const nextMilestone = sorted[insertAfterIndex] || sorted[sorted.length - 1];

        // Extract topic if mentioned (e.g. "Add a QA and testing step between step 2 and step 3")
        let newTitle = "Intermediate Milestone";
        if (lowerPrompt.includes("qa") || lowerPrompt.includes("testing")) {
          newTitle = "Quality Assurance & Testing";
        } else if (lowerPrompt.includes("security") || lowerPrompt.includes("audit")) {
          newTitle = "Security & Compliance Audit";
        } else if (lowerPrompt.includes("analytics") || lowerPrompt.includes("monitoring")) {
          newTitle = "Analytics & System Monitoring";
        } else if (lowerPrompt.includes("cache") || lowerPrompt.includes("redis")) {
          newTitle = "Caching & Performance Optimization";
        } else {
          newTitle = `Inserted Step ${insertAfterIndex + 1}`;
        }

        const newTempId = `m_new_${Date.now()}`;
        const newMilestone: AIProcessedMilestone = {
          tempId: newTempId,
          title: newTitle,
          description: `Intermediate workflow stage inserted between ${prevMilestone.title} and ${nextMilestone.title}`,
          color: "amber",
          sortOrder: insertAfterIndex,
          checkpoints: [
            { title: "Define validation criteria and requirements" },
            { title: "Execute test suites and verify benchmarks" },
            { title: "Review telemetry and sign off" },
          ],
        };

        const updatedMilestones: AIProcessedMilestone[] = [];
        let currentOrder = 0;

        for (let i = 0; i < sorted.length; i++) {
          if (i === insertAfterIndex) {
            updatedMilestones.push(newMilestone);
            currentOrder++;
          }
          const m = sorted[i];
          updatedMilestones.push({
            id: m.id,
            title: m.title,
            description: m.description,
            color: (m.color as "default" | "amber" | "purple" | "rose") || "default",
            sortOrder: currentOrder,
            checkpoints: m.checkpoints.map((cp) => ({
              id: cp.id,
              title: cp.title,
              isCompleted: cp.is_completed,
            })),
          });
          currentOrder++;
        }

        if (insertAfterIndex >= sorted.length) {
          updatedMilestones.push(newMilestone);
        }

        // Re-wire edges
        const updatedEdges: AIProcessedEdge[] = [];
        // Keep edges that don't connect prevMilestone directly to nextMilestone
        for (const e of existingEdges) {
          if (e.sourceId === prevMilestone.id && e.targetId === nextMilestone.id) {
            // Replaced by 2 new edges
            continue;
          }
          updatedEdges.push({ fromId: e.sourceId, toId: e.targetId });
        }
        updatedEdges.push({ fromId: prevMilestone.id, toId: newTempId });
        updatedEdges.push({ fromId: newTempId, toId: nextMilestone.id });

        return {
          intent: "update_pipeline",
          summary: `Inserted "${newTitle}" between step ${insertAfterIndex} and step ${insertAfterIndex + 1}, shifted milestone order, and reconnected dependencies.`,
          milestones: updatedMilestones,
          edges: updatedEdges,
        };
      }

      // Check for adding checkpoint or generic step updates
      const updatedMilestones: AIProcessedMilestone[] = existingMilestones.map((m, idx) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        color: (m.color as "default" | "amber" | "purple" | "rose") || "default",
        sortOrder: idx,
        checkpoints: [
          ...m.checkpoints.map((cp) => ({
            id: cp.id,
            title: cp.title,
            isCompleted: cp.is_completed,
          })),
          ...(idx === 0
            ? [{ title: `Updated requirement: ${cleanPrompt.slice(0, 40)}` }]
            : []),
        ],
      }));

      const updatedEdges: AIProcessedEdge[] = existingEdges.map((e) => ({
        fromId: e.sourceId,
        toId: e.targetId,
      }));

      return {
        intent: "update_pipeline",
        summary: `Updated workflow with new checkpoint tasks and milestone refinements.`,
        milestones: updatedMilestones,
        edges: updatedEdges,
      };
    }
  }

  // Scenario 2: Create new pipeline (Canvas is empty or user requested new pipeline)
  const titleSummary = cleanPrompt.length > 50 ? `${cleanPrompt.slice(0, 50)}...` : cleanPrompt;

  return {
    intent: "create_pipeline",
    summary: `Workflow pipeline generated for: ${titleSummary}`,
    milestones: [
      {
        tempId: "m1",
        title: "Foundation & Architecture",
        description: "Set up repository, PostgreSQL schemas, and security policies",
        color: "default",
        sortOrder: 0,
        checkpoints: [
          { title: "Initialize Next.js & Tailwind workspace" },
          { title: "Configure database schema and RLS policies" },
          { title: "Set up environment credentials and healthcheck" },
        ],
      },
      {
        tempId: "m2",
        title: "Core Service & API Layer",
        description: "Implement primary API endpoints and domain business logic",
        color: "purple",
        sortOrder: 1,
        checkpoints: [
          { title: "Build secure server action handlers" },
          { title: "Implement validation middleware and rate limits" },
          { title: "Write service unit and integration tests" },
        ],
      },
      {
        tempId: "m3",
        title: "Interactive Client Interface",
        description: "Build reactive UI components and state management",
        color: "amber",
        sortOrder: 2,
        checkpoints: [
          { title: "Develop responsive dashboard and viewports" },
          { title: "Hook up realtime WebSocket subscriptions" },
          { title: "Add user notification toasts and feedback modals" },
        ],
      },
      {
        tempId: "m4",
        title: "Validation & Launch",
        description: "End-to-end verification, performance tuning, and rollout",
        color: "rose",
        sortOrder: 3,
        checkpoints: [
          { title: "Conduct security audit and edge-case testing" },
          { title: "Optimize query performance and asset bundles" },
          { title: "Deploy to production environment" },
        ],
      },
    ],
    edges: [
      { fromId: "m1", toId: "m2" },
      { fromId: "m2", toId: "m3" },
      { fromId: "m3", toId: "m4" },
    ],
  };
}

/**
 * Call Google Gemini 2.0 / 3.7 Flash API to generate or update structured workflow JSON
 */
export async function generateWorkflowWithGemini(
  prompt: string,
  context?: CanvasAIContext
): Promise<AIWorkflowResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    console.warn(
      "[Gemini AI] GEMINI_API_KEY is not configured. Utilizing safe fallback workflow generator."
    );
    return generateFallbackWorkflow(prompt, context);
  }

  // Format existing canvas context into clear text for Gemini
  let contextDescription = "The canvas is currently empty.";
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

  const userContent = `${SYSTEM_INSTRUCTION}\n\n${contextDescription}\n\nUser Request: "${prompt}"`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: userContent }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: {
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
      },
    },
  };

  const primaryModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.7-flash";
  const candidateModels = [
    primaryModel,
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-2.5-pro",
    "gemini-pro-latest",
  ].filter((v, i, a) => a.indexOf(v) === i);

  let lastErrorMsg = "";

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (textContent) {
          try {
            const parsed = JSON.parse(textContent) as AIWorkflowResult;
            if (
              parsed.milestones &&
              Array.isArray(parsed.milestones) &&
              parsed.milestones.length > 0
            ) {
              return parsed;
            }
          } catch {
            console.warn(
              `[Gemini AI] Model ${model} returned malformed JSON, trying next model...`
            );
          }
        }
      } else {
        const errBody = await response.text().catch(() => "");
        lastErrorMsg = `Model ${model} (${response.status}): ${errBody || response.statusText}`;
        console.warn(
          `[Gemini AI] ${model} unavailable (status ${response.status}). Seamlessly switching to next model...`
        );
      }
    } catch (fetchErr: unknown) {
      const msg = fetchErr instanceof Error ? fetchErr.message : "Network error";
      lastErrorMsg = `Model ${model} fetch exception: ${msg}`;
      console.warn(`[Gemini AI] Network issue on ${model}. Trying next model...`);
    }
  }

  // Graceful final fallback
  console.warn(
    `[Gemini AI] All candidate models encountered high demand or errors (${lastErrorMsg}). Activating safe fallback workflow generator.`
  );
  return generateFallbackWorkflow(prompt, context);
}
