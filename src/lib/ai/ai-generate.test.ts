import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateFallbackWorkflow,
  generateWorkflowWithGemini,
  GeneratedWorkflow,
} from "./gemini";
import { autoLayoutNodes } from "../canvas/auto-layout";
import { CanvasNode, CanvasEdge } from "../canvas/types";

describe("AI Workflow Generation & Gemini Service", () => {
  const originalEnv = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  it("generateFallbackWorkflow generates a valid acyclic DAG milestone graph", () => {
    const workflow = generateFallbackWorkflow("Build a SaaS with Stripe billing");

    expect(workflow.summary).toContain("Build a SaaS with Stripe billing");
    expect(workflow.milestones.length).toBeGreaterThanOrEqual(3);
    expect(workflow.edges.length).toBeGreaterThanOrEqual(2);

    // Verify all milestones have checkpoints
    for (const milestone of workflow.milestones) {
      expect(milestone.tempId).toBeDefined();
      expect(milestone.title).toBeDefined();
      expect(milestone.checkpoints.length).toBeGreaterThanOrEqual(2);
    }

    // Verify all edges link valid tempIds
    const milestoneIds = new Set(workflow.milestones.map((m) => m.tempId));
    for (const edge of workflow.edges) {
      expect(milestoneIds.has(edge.fromTempId)).toBe(true);
      expect(milestoneIds.has(edge.toTempId)).toBe(true);
      expect(edge.fromTempId).not.toBe(edge.toTempId);
    }
  });

  it("generateWorkflowWithGemini uses fallback when GEMINI_API_KEY is not set", async () => {
    delete process.env.GEMINI_API_KEY;
    const workflow = await generateWorkflowWithGemini("Realtime multiplayer game");

    expect(workflow.milestones.length).toBe(4);
    expect(workflow.edges.length).toBe(3);
  });

  it("generateWorkflowWithGemini successfully parses Gemini API structured JSON response", async () => {
    process.env.GEMINI_API_KEY = "test_key_123";

    const mockAiResponse: GeneratedWorkflow = {
      summary: "E-Commerce Pipeline with Stripe",
      milestones: [
        {
          tempId: "step_1",
          title: "Product Database",
          description: "Setup PostgreSQL products schema",
          color: "default",
          checkpoints: ["Create schema", "Add migrations"],
        },
        {
          tempId: "step_2",
          title: "Cart & Checkout API",
          description: "Stripe checkout session integration",
          color: "purple",
          checkpoints: ["Stripe webhook handler", "Order status DB"],
        },
      ],
      edges: [{ fromTempId: "step_1", toTempId: "step_2" }],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(mockAiResponse) }],
            },
          },
        ],
      }),
    });

    vi.stubGlobal("fetch", mockFetch);

    const result = await generateWorkflowWithGemini("Build an online store with cart");

    expect(result.summary).toBe("E-Commerce Pipeline with Stripe");
    expect(result.milestones.length).toBe(2);
    expect(result.edges.length).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("calculates non-overlapping DAG auto-layout for AI generated milestone boxes", () => {
    const mockNodes: CanvasNode[] = [
      {
        id: "node_1",
        project_id: "p1",
        title: "Setup DB",
        description: "Configure schema",
        status: "draft",
        position_x: 0,
        position_y: 0,
        width: 280,
        height: 170,
        color: "default",
        sort_order: 0,
        claimed_by: null,
        version: 1,
        checkpoints: [],
      },
      {
        id: "node_2",
        project_id: "p1",
        title: "Build API",
        description: "Endpoints",
        status: "draft",
        position_x: 0,
        position_y: 0,
        width: 280,
        height: 170,
        color: "purple",
        sort_order: 1,
        claimed_by: null,
        version: 1,
        checkpoints: [],
      },
    ];

    const mockEdges: CanvasEdge[] = [
      {
        id: "e1",
        project_id: "p1",
        source_node_id: "node_1",
        target_node_id: "node_2",
        source_handle: "right",
        target_handle: "left",
      },
    ];

    const layouted = autoLayoutNodes(mockNodes, mockEdges, { startX: 100, startY: 100 });

    expect(layouted[0].position_x).toBe(100);
    expect(layouted[1].position_x).toBe(480); // startX + 380px HORIZONTAL_SPACING
  });
});
