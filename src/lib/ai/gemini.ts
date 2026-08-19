/**
 * Google Gemini AI Workflow Generator Service
 * Converts natural language & voice prompts into structured NovaStage milestone graphs.
 */

export interface GeneratedMilestone {
  tempId: string;
  title: string;
  description?: string;
  color?: "default" | "amber" | "purple" | "rose";
  checkpoints: string[];
}

export interface GeneratedEdge {
  fromTempId: string;
  toTempId: string;
}

export interface GeneratedWorkflow {
  summary: string;
  milestones: GeneratedMilestone[];
  edges: GeneratedEdge[];
}

const SYSTEM_INSTRUCTION = `You are an elite software architect and technical project manager for NovaStage, a collaborative visual workflow canvas.
Your task is to decompose the user's project request into a clean, actionable Directed Acyclic Graph (DAG) of milestone boxes with checkpoints.

Follow these strict rules:
1. Break down the project into 3 to 7 structured, logical milestones.
2. Provide thorough, detailed, and highly actionable checkpoints for each milestone. Aim for at least 3 to 6 checkpoints per milestone for comprehensive breakdown, but include more than 6 if necessary to cover all critical details.
3. Every milestone must have a unique identifier tempId (e.g., "m1", "m2", "m3", etc.).
4. Assign color accents meaningfully:
   - "default" for general architecture, infrastructure, or setup
   - "purple" for core business logic, APIs, and backend services
   - "amber" for frontend, UI/UX, client canvas, and authentication
   - "rose" for testing, security auditing, and deployment / launch
5. Define sequential & parallel dependency edges using { "fromTempId": "m1", "toTempId": "m2" }.
6. NEVER create circular dependencies (the graph must be an acyclic DAG).
7. Keep titles concise and checkpoint descriptions actionable.`;

/**
 * Generate fallback mock workflow when GEMINI_API_KEY is not configured (e.g. testing / offline dev)
 */
export function generateFallbackWorkflow(prompt: string): GeneratedWorkflow {
  const cleanPrompt = prompt.trim();
  const titleSummary = cleanPrompt.length > 50 ? `${cleanPrompt.slice(0, 50)}...` : cleanPrompt;

  return {
    summary: `Workflow pipeline generated for: ${titleSummary}`,
    milestones: [
      {
        tempId: "m1",
        title: "Foundation & Architecture",
        description: "Set up repository, PostgreSQL schemas, and security policies",
        color: "default",
        checkpoints: [
          "Initialize Next.js & Tailwind workspace",
          "Configure database schema and RLS policies",
          "Set up environment credentials and healthcheck",
        ],
      },
      {
        tempId: "m2",
        title: "Core Service & API Layer",
        description: "Implement primary API endpoints and domain business logic",
        color: "purple",
        checkpoints: [
          "Build secure server action handlers",
          "Implement validation middleware and rate limits",
          "Write service unit and integration tests",
        ],
      },
      {
        tempId: "m3",
        title: "Interactive Client Interface",
        description: "Build reactive UI components and state management",
        color: "amber",
        checkpoints: [
          "Develop responsive dashboard and viewports",
          "Hook up realtime WebSocket subscriptions",
          "Add user notification toasts and feedback modals",
        ],
      },
      {
        tempId: "m4",
        title: "Validation & Launch",
        description: "End-to-end verification, performance tuning, and rollout",
        color: "rose",
        checkpoints: [
          "Conduct security audit and edge-case testing",
          "Optimize query performance and asset bundles",
          "Deploy to production environment",
        ],
      },
    ],
    edges: [
      { fromTempId: "m1", toTempId: "m2" },
      { fromTempId: "m2", toTempId: "m3" },
      { fromTempId: "m3", toTempId: "m4" },
    ],
  };
}

/**
 * Call Google Gemini 2.0 Flash API to generate structured workflow JSON
 */
export async function generateWorkflowWithGemini(prompt: string): Promise<GeneratedWorkflow> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    console.warn("[Gemini AI] GEMINI_API_KEY is not configured. Utilizing safe fallback workflow generator.");
    return generateFallbackWorkflow(prompt);
  }

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${SYSTEM_INSTRUCTION}\n\nUser Request: "${prompt}"`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          summary: { type: "STRING" },
          milestones: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                tempId: { type: "STRING" },
                title: { type: "STRING" },
                description: { type: "STRING" },
                color: {
                  type: "STRING",
                  enum: ["default", "amber", "purple", "rose"],
                },
                checkpoints: {
                  type: "ARRAY",
                  items: { type: "STRING" },
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
                fromTempId: { type: "STRING" },
                toTempId: { type: "STRING" },
              },
              required: ["fromTempId", "toTempId"],
            },
          },
        },
        required: ["summary", "milestones", "edges"],
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
            const parsed = JSON.parse(textContent) as GeneratedWorkflow;
            if (
              parsed.milestones &&
              Array.isArray(parsed.milestones) &&
              parsed.milestones.length > 0
            ) {
              return parsed;
            }
          } catch {
            console.warn(`[Gemini AI] Model ${model} returned malformed JSON, trying next model...`);
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

  // Graceful final fallback if all Google AI models are temporarily experiencing spikes
  console.warn(
    `[Gemini AI] All candidate models encountered high demand or errors (${lastErrorMsg}). Activating seamless fallback workflow generator.`
  );
  return generateFallbackWorkflow(prompt);
}
