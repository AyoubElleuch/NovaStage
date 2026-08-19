/**
 * Phase 1: Prompt Decomposition & Domain Analysis
 * Analyzes the user's raw prompt into domain tags, complexity tier, concern areas, and parallel tracks.
 */

import { PromptDecomposition } from "../types";
import { DECOMPOSE_SYSTEM_INSTRUCTION } from "../prompts/system-decompose";
import { callGemini } from "../gemini";

const DECOMPOSITION_SCHEMA = {
  type: "OBJECT",
  properties: {
    projectType: { type: "STRING" },
    domainTags: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    complexityTier: {
      type: "STRING",
      enum: ["standard", "advanced", "enterprise"],
    },
    concernAreas: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          category: {
            type: "STRING",
            enum: [
              "core",
              "auth",
              "billing",
              "data",
              "infrastructure",
              "ui_ux",
              "security",
              "testing",
              "operations",
            ],
          },
          priority: {
            type: "STRING",
            enum: ["critical", "high", "medium"],
          },
          description: { type: "STRING" },
          dependencies: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          suggestedCheckpointCount: { type: "INTEGER" },
        },
        required: ["name", "category", "priority", "description", "dependencies"],
      },
    },
    techStackHints: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    riskFactors: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    targetMilestoneCount: {
      type: "OBJECT",
      properties: {
        min: { type: "INTEGER" },
        max: { type: "INTEGER" },
      },
      required: ["min", "max"],
    },
    suggestedParallelTracks: {
      type: "ARRAY",
      items: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
    },
    summary: { type: "STRING" },
  },
  required: [
    "projectType",
    "domainTags",
    "complexityTier",
    "concernAreas",
    "techStackHints",
    "riskFactors",
    "targetMilestoneCount",
    "suggestedParallelTracks",
    "summary",
  ],
};

/**
 * Deterministic fallback decomposition for offline mode or network failure
 */
export function buildFallbackDecomposition(prompt: string): PromptDecomposition {
  const lower = prompt.toLowerCase();
  let projectType = "Fullstack Web Application";
  const domainTags: string[] = [];
  const techStackHints: string[] = ["Next.js", "TypeScript", "Tailwind CSS", "PostgreSQL"];
  const riskFactors: string[] = ["Data consistency", "Latency under load", "Permission enforcement"];

  if (lower.includes("saas") || lower.includes("stripe") || lower.includes("subscript")) {
    projectType = "B2B SaaS Platform";
    domainTags.push("saas", "billing", "tenancy", "auth");
    techStackHints.push("Stripe", "Supabase Auth", "Prisma/Drizzle");
    riskFactors.push("Webhook idempotency", "Tenant isolation leaks", "Subscription grace periods");
  } else if (lower.includes("shop") || lower.includes("ecommerce") || lower.includes("store")) {
    projectType = "E-Commerce Platform";
    domainTags.push("ecommerce", "catalog", "checkout", "inventory");
    techStackHints.push("Redis", "Stripe Checkout", "PostgreSQL");
    riskFactors.push("Flash sale inventory contention", "Abandoned checkout recovery", "Payment gateway timeouts");
  } else if (lower.includes("realtime") || lower.includes("chat") || lower.includes("canvas") || lower.includes("multiplayer")) {
    projectType = "Realtime Collaborative Platform";
    domainTags.push("realtime", "websocket", "multiplayer", "presence");
    techStackHints.push("WebSockets", "Redis Pub/Sub", "Exponential Spring-Lerp");
    riskFactors.push("Broadcast bandwidth saturation", "State desync on network reconnection", "Concurrent edit collisions");
  } else if (lower.includes("api") || lower.includes("microservice") || lower.includes("backend")) {
    projectType = "High-Throughput Microservice API";
    domainTags.push("api", "microservice", "queue", "cache");
    techStackHints.push("Fastify/Express", "BullMQ", "Redis", "OpenTelemetry");
    riskFactors.push("Rate-limit evasion", "Database connection pool exhaustion", "Dead letter queue accumulation");
  } else {
    domainTags.push("web-app", "database", "ui", "testing");
  }

  return {
    projectType,
    domainTags,
    complexityTier: domainTags.length >= 3 ? "advanced" : "standard",
    concernAreas: [
      {
        name: "Discovery & Architecture",
        category: "infrastructure",
        priority: "critical",
        description: "System architecture, schemas, and continuous integration foundation",
        dependencies: [],
        suggestedCheckpointCount: 5,
      },
      {
        name: "Authentication & Security",
        category: "auth",
        priority: "critical",
        description: "User authentication, role-based permissions, and session protection",
        dependencies: ["Discovery & Architecture"],
        suggestedCheckpointCount: 6,
      },
      {
        name: "Core Business Domain",
        category: "core",
        priority: "high",
        description: "Primary domain business logic and API endpoints",
        dependencies: ["Discovery & Architecture"],
        suggestedCheckpointCount: 6,
      },
      {
        name: "Client Interface & Experience",
        category: "ui_ux",
        priority: "high",
        description: "Responsive user interface, state management, and real-time feedback",
        dependencies: ["Core Business Domain"],
        suggestedCheckpointCount: 6,
      },
      {
        name: "Quality Assurance & Launch",
        category: "testing",
        priority: "critical",
        description: "End-to-end testing, security audits, and production deployment",
        dependencies: ["Client Interface & Experience"],
        suggestedCheckpointCount: 6,
      },
    ],
    techStackHints,
    riskFactors,
    targetMilestoneCount: { min: 6, max: 10 },
    suggestedParallelTracks: [["Authentication & Security", "Core Business Domain"]],
    summary: `Technical decomposition for ${projectType}`,
  };
}

/**
 * Execute Phase 1: Decompose user prompt into structured architectural spec
 */
export async function decomposePrompt(prompt: string): Promise<PromptDecomposition> {
  const result = await callGemini<PromptDecomposition>(
    `Analyze and technically decompose this project request:\n\n"${prompt}"`,
    DECOMPOSITION_SCHEMA,
    {
      systemInstruction: DECOMPOSE_SYSTEM_INSTRUCTION,
      temperature: 0.1,
    }
  );

  if (result && result.projectType && result.concernAreas && result.concernAreas.length > 0) {
    return result;
  }

  return buildFallbackDecomposition(prompt);
}
