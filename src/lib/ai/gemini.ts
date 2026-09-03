/**
 * Google Gemini AI Low-Level API Client & Comprehensive Domain Fallback Engine
 * Handles multi-model fallback chains, strict JSON schema validation,
 * and high-fidelity deterministic offline workflows.
 */

import {
  CanvasAIContext,
  AIWorkflowResult,
  AIProcessedMilestone,
  AIProcessedEdge,
} from "./types";
import { DOMAIN_TEMPLATES } from "./prompts/domain-templates";

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

export interface GeminiCallOptions {
  systemInstruction?: string;
  temperature?: number;
  modelOverride?: string;
}

/**
 * OpenAI API Caller with JSON Schema response format
 */
async function callOpenAI<T>(
  prompt: string,
  schema: object,
  options?: GeminiCallOptions
): Promise<T | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = options?.modelOverride || process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const messages: Array<{ role: "system" | "user"; content: string }> = [];

  if (options?.systemInstruction) {
    messages.push({ role: "system", content: options.systemInstruction });
  }
  messages.push({
    role: "user",
    content: `${prompt}\n\nYou MUST respond strictly with a valid JSON object conforming to this schema:\n${JSON.stringify(schema, null, 2)}`,
  });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const textContent = data.choices?.[0]?.message?.content;
      if (textContent) {
        return JSON.parse(textContent) as T;
      }
    } else {
      const err = await response.text().catch(() => "");
      console.warn(`[OpenAI] ${model} error (${response.status}): ${err}`);
    }
  } catch (err: unknown) {
    console.warn(`[OpenAI] Exception:`, err);
  }
  return null;
}

/**
 * Generic AI / LLM Caller supporting Google Gemini and OpenAI with multi-model fallback
 */
export async function callGemini<T>(
  prompt: string,
  schema: object,
  options?: GeminiCallOptions
): Promise<T | null> {
  // Check if OpenAI is explicitly chosen or Gemini is unconfigured
  const preferOpenAI =
    process.env.AI_PROVIDER === "openai" ||
    (Boolean(process.env.OPENAI_API_KEY) && !process.env.GEMINI_API_KEY);

  if (preferOpenAI) {
    const openAIResult = await callOpenAI<T>(prompt, schema, options);
    if (openAIResult) return openAIResult;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    // If Gemini key is missing, attempt OpenAI as alternate
    if (process.env.OPENAI_API_KEY) {
      return callOpenAI<T>(prompt, schema, options);
    }
    return null;
  }

  const primaryModel = options?.modelOverride || process.env.GEMINI_MODEL?.trim() || "gemini-3.7-flash";
  const candidateModels = [
    primaryModel,
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-2.5-pro",
    "gemini-pro-latest",
  ].filter((v, i, a) => a.indexOf(v) === i);

  const fullPrompt = options?.systemInstruction
    ? `${options.systemInstruction}\n\n${prompt}`
    : prompt;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: fullPrompt }],
      },
    ],
    generationConfig: {
      temperature: options?.temperature ?? 0.2,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };

  let lastErrorMsg = "";

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (textContent) {
          try {
            const parsed = JSON.parse(textContent) as T;
            if (parsed) {
              return parsed;
            }
          } catch {
            console.warn(`[Gemini AI] Model ${model} returned malformed JSON, trying next model...`);
          }
        }
      } else {
        const errBody = await response.text().catch(() => "");
        lastErrorMsg = `Model ${model} (${response.status}): ${errBody || response.statusText}`;
        console.warn(`[Gemini AI] ${model} unavailable (${response.status}). Trying next model...`);
      }
    } catch (fetchErr: unknown) {
      const msg = fetchErr instanceof Error ? fetchErr.message : "Network error";
      lastErrorMsg = `Model ${model} exception: ${msg}`;
      console.warn(`[Gemini AI] Network issue on ${model}: ${msg}. Trying next model...`);
    }
  }

  console.warn(`[Gemini AI] All candidate models failed (${lastErrorMsg}).`);
  return null;
}

/**
 * Domain-aware rich fallback template generator
 */
function buildDomainFallbackMilestones(
  prompt: string,
  domainKey: string
): { milestones: AIProcessedMilestone[]; edges: AIProcessedEdge[] } {
  const template = DOMAIN_TEMPLATES[domainKey] || DOMAIN_TEMPLATES.saas;
  const milestones: AIProcessedMilestone[] = [];
  const edges: AIProcessedEdge[] = [];

  // 1. Discovery / Architecture
  milestones.push({
    tempId: "m_init",
    title: "1. System Discovery & Technical Architecture",
    description: `Define system specifications, data models, and infrastructure for ${prompt.slice(0, 40)}`,
    color: "default",
    phase: "planning",
    sortOrder: 0,
    checkpoints: [
      { title: "Define technical specifications and core architecture diagram" },
      { title: "Design PostgreSQL schema with foreign keys and compound indexes" },
      { title: "Configure development, staging, and production environment variables" },
      { title: "Set up CI/CD GitHub Actions workflow with typecheck and automated test suites" },
      { title: "Establish security headers, CORS policies, and rate-limiting rules" },
    ],
  });

  // 2. Add domain-specific milestones
  template.recommendedMilestones.forEach((m, idx) => {
    const tempId = `m_domain_${idx + 1}`;
    milestones.push({
      tempId,
      title: `${idx + 2}. ${m.title}`,
      description: m.description,
      color: m.color,
      phase: m.phase,
      sortOrder: idx + 1,
      checkpoints: m.checkpoints.map((cp) => ({ title: cp })),
    });
  });

  // 3. QA & Security Hardening
  const qaIndex = milestones.length;
  milestones.push({
    tempId: "m_qa",
    title: `${qaIndex + 1}. Quality Assurance & Security Hardening`,
    description: "Execute end-to-end testing, security audits, and load verification",
    color: "rose",
    phase: "testing",
    sortOrder: qaIndex,
    checkpoints: [
      { title: "Execute Playwright end-to-end tests for critical user journeys" },
      { title: "Perform security audit covering OWASP Top 10 vulnerabilities" },
      { title: "Execute load testing with 500+ concurrent requests under 200ms latency" },
      { title: "Validate error boundaries and fallback UI states across all viewports" },
      { title: "Verify database backup procedures and disaster recovery failover" },
    ],
  });

  // 4. Production Release
  const releaseIndex = milestones.length;
  milestones.push({
    tempId: "m_release",
    title: `${releaseIndex + 1}. Production Release & Monitoring`,
    description: "Deploy to production infrastructure, configure CDN, and enable telemetry alerts",
    color: "rose",
    phase: "deployment",
    sortOrder: releaseIndex,
    checkpoints: [
      { title: "Deploy database migrations to production cluster with zero downtime" },
      { title: "Configure production domain DNS with SSL certificate automation" },
      { title: "Set up real-time error telemetry and latency threshold alerting" },
      { title: "Conduct smoke test verification on live production endpoints" },
      { title: "Publish system documentation and onboard initial pilot users" },
    ],
  });

  // 5. Build Branching DAG Edges
  // Connect init -> first 2 domain steps in parallel
  if (milestones.length >= 4) {
    edges.push({ fromId: "m_init", toId: "m_domain_1" });
    if (milestones.some((m) => m.tempId === "m_domain_2")) {
      edges.push({ fromId: "m_init", toId: "m_domain_2" });
    }

    // Connect middle steps
    for (let i = 1; i < template.recommendedMilestones.length; i++) {
      const prevId = `m_domain_${i}`;
      const nextId = `m_domain_${i + 1}`;
      if (milestones.some((m) => m.tempId === nextId)) {
        edges.push({ fromId: prevId, toId: nextId });
      }
    }

    // Connect last domain step(s) to QA
    const lastDomainId = `m_domain_${template.recommendedMilestones.length}`;
    edges.push({ fromId: lastDomainId, toId: "m_qa" });

    // Connect QA to Release
    edges.push({ fromId: "m_qa", toId: "m_release" });
  } else {
    // Linear fallback if short
    for (let i = 0; i < milestones.length - 1; i++) {
      edges.push({ fromId: milestones[i].tempId!, toId: milestones[i + 1].tempId! });
    }
  }

  return { milestones, edges };
}

/**
 * Deep, comprehensive deterministic fallback engine
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
        /between (?:step\s*)?(\d+|one|two|three|four|five|six|seven|eight)\s+and\s+(?:step\s*)?(\d+|one|two|three|four|five|six|seven|eight)/i
      );

      const wordToNum: Record<string, number> = {
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
      };

      if (betweenMatch) {
        const stepA = Number(wordToNum[betweenMatch[1].toLowerCase()] || betweenMatch[1]);
        const stepB = Number(wordToNum[betweenMatch[2].toLowerCase()] || betweenMatch[2]);
        const insertAfterIndex = Math.min(stepA, stepB);

        // Sort existing milestones by order
        const sorted = [...existingMilestones].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const prevMilestone = sorted[insertAfterIndex - 1] || sorted[0];
        const nextMilestone = sorted[insertAfterIndex] || sorted[sorted.length - 1];

        // Extract topic if mentioned
        let newTitle = "Intermediate Milestone";
        let desc = `Workflow stage inserted between ${prevMilestone.title} and ${nextMilestone.title}`;
        let checkpoints: { title: string }[] = [
          { title: "Define technical specifications and architecture design" },
          { title: "Implement core service logic and database migrations" },
          { title: "Build client user interface and state hooks" },
          { title: "Execute integration tests and verify boundary conditions" },
          { title: "Review telemetry, audit logs, and performance metrics" },
        ];

        if (lowerPrompt.includes("qa") || lowerPrompt.includes("testing")) {
          newTitle = "Quality Assurance & Automated Testing";
          desc = "Comprehensive test suites, integration tests, and edge-case validation";
          checkpoints = [
            { title: "Write unit tests for business logic edge cases" },
            { title: "Develop Playwright end-to-end user workflow tests" },
            { title: "Execute stress test verifying API response latency" },
            { title: "Validate accessibility (a11y) and responsive viewport compliance" },
            { title: "Review automated test coverage reports in CI" },
          ];
        } else if (lowerPrompt.includes("security") || lowerPrompt.includes("audit")) {
          newTitle = "Security & Compliance Audit";
          desc = "Vulnerability assessment, permission matrix verification, and penetration testing";
          checkpoints = [
            { title: "Audit PostgreSQL Row-Level Security policies" },
            { title: "Perform static application security testing (SAST)" },
            { title: "Verify cryptographic password hashing and token rotation" },
            { title: "Inspect CORS headers and Content Security Policy" },
            { title: "Review third-party dependency vulnerabilities (npm audit)" },
          ];
        } else if (lowerPrompt.includes("cache") || lowerPrompt.includes("redis")) {
          newTitle = "Redis Caching & Performance Layer";
          desc = "Distributed caching, cache invalidation strategies, and latency reduction";
          checkpoints = [
            { title: "Deploy Redis cluster with connection pooling" },
            { title: "Implement read-through caching for high-frequency database queries" },
            { title: "Build smart cache invalidation on resource mutations" },
            { title: "Configure sliding-window API rate limiting" },
            { title: "Benchmark latency before and after caching layer" },
          ];
        } else if (lowerPrompt.includes("analytics") || lowerPrompt.includes("monitoring")) {
          newTitle = "Telemetry & System Monitoring";
          desc = "Real-time metrics, OpenTelemetry tracing, and alerting thresholds";
          checkpoints = [
            { title: "Configure OpenTelemetry distributed request tracing" },
            { title: "Build admin metrics dashboard for active users and error rates" },
            { title: "Set up automated PagerDuty alert triggers for 5xx spikes" },
            { title: "Implement structured JSON application logging" },
            { title: "Create scheduled healthcheck ping endpoints" },
          ];
        } else {
          newTitle = `Inserted Step ${insertAfterIndex + 1}`;
        }

        const newTempId = `m_new_${Date.now()}`;
        const newMilestone: AIProcessedMilestone = {
          tempId: newTempId,
          title: newTitle,
          description: desc,
          color: "amber",
          sortOrder: insertAfterIndex,
          checkpoints,
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
        for (const e of existingEdges) {
          if (e.sourceId === prevMilestone.id && e.targetId === nextMilestone.id) {
            continue;
          }
          updatedEdges.push({ fromId: e.sourceId, toId: e.targetId });
        }
        updatedEdges.push({ fromId: prevMilestone.id, toId: newTempId });
        updatedEdges.push({ fromId: newTempId, toId: nextMilestone.id });

        return {
          intent: "update_pipeline",
          mode: "workflow" as const,
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
        mode: "workflow" as const,
        summary: `Updated workflow with new checkpoint tasks and milestone refinements.`,
        milestones: updatedMilestones,
        edges: updatedEdges,
      };
    }
  }

  // Scenario 2: Create new deep, branching pipeline matching domain keywords
  let domainKey = "saas";
  if (lowerPrompt.includes("shop") || lowerPrompt.includes("ecommerce") || lowerPrompt.includes("product") || lowerPrompt.includes("order")) {
    domainKey = "ecommerce";
  } else if (lowerPrompt.includes("realtime") || lowerPrompt.includes("collaborat") || lowerPrompt.includes("websocket") || lowerPrompt.includes("chat")) {
    domainKey = "realtime";
  } else if (lowerPrompt.includes("api") || lowerPrompt.includes("microservice") || lowerPrompt.includes("backend") || lowerPrompt.includes("grpc")) {
    domainKey = "api_backend";
  } else if (lowerPrompt.includes("mobile") || lowerPrompt.includes("ios") || lowerPrompt.includes("android") || lowerPrompt.includes("react native")) {
    domainKey = "mobile_cloud";
  }

  const { milestones, edges } = buildDomainFallbackMilestones(cleanPrompt, domainKey);
  const titleSummary = cleanPrompt.length > 60 ? `${cleanPrompt.slice(0, 60)}…` : cleanPrompt;

  return {
    intent: "create_pipeline",
    mode: "workflow" as const,
    summary: `Comprehensive workflow pipeline generated for: ${titleSummary}`,
    milestones,
    edges,
  };
}

/**
 * Backward compatibility wrapper delegating to the new pipeline orchestrator
 */
export async function generateWorkflowWithGemini(
  prompt: string,
  context?: CanvasAIContext
): Promise<AIWorkflowResult> {
  const { executeAIPipeline } = await import("./pipeline");
  return executeAIPipeline(prompt, "workflow", context);
}

