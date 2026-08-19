import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateFallbackWorkflow,
  generateWorkflowWithGemini,
  AIWorkflowResult,
} from "./gemini";
import { executeAIPipeline } from "./pipeline";
import { autoLayoutNodes } from "../canvas/auto-layout";
import { CanvasNode, CanvasEdge } from "../canvas/types";
import { CanvasAIContext } from "./types";

describe("AI Workflow Generation & Multi-Phase Pipeline", () => {
  const originalEnv = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  it("generateFallbackWorkflow generates a deep, comprehensive acyclic DAG milestone graph on empty canvas", () => {
    const workflow = generateFallbackWorkflow("Build a SaaS with Stripe billing");

    expect(workflow.intent).toBe("create_pipeline");
    expect(workflow.summary).toContain("Build a SaaS with Stripe billing");
    // Deep fallback should provide at least 5 milestones
    expect(workflow.milestones.length).toBeGreaterThanOrEqual(5);
    expect(workflow.edges.length).toBeGreaterThanOrEqual(4);

    // Verify all milestones have at least 4 detailed checkpoints
    for (const milestone of workflow.milestones) {
      expect(milestone.tempId).toBeDefined();
      expect(milestone.title).toBeDefined();
      expect(milestone.checkpoints.length).toBeGreaterThanOrEqual(4);
    }

    // Verify all edges link valid tempIds without self-loops
    const milestoneIds = new Set(workflow.milestones.map((m) => m.tempId));
    for (const edge of workflow.edges) {
      expect(milestoneIds.has(edge.fromId)).toBe(true);
      expect(milestoneIds.has(edge.toId)).toBe(true);
      expect(edge.fromId).not.toBe(edge.toId);
    }
  });

  it("generateFallbackWorkflow customizes domain milestones based on keywords (e-commerce)", () => {
    const workflow = generateFallbackWorkflow("Build an e-commerce store with product catalog and cart");

    expect(workflow.milestones.length).toBeGreaterThanOrEqual(4);
    const titles = workflow.milestones.map((m) => m.title.toLowerCase());
    const hasEcommerceTopic = titles.some((t) => t.includes("catalog") || t.includes("cart") || t.includes("order") || t.includes("product"));
    expect(hasEcommerceTopic).toBe(true);
  });

  it("generateFallbackWorkflow inserts an intermediate step between step 2 and step 3 and shifts ordering", () => {
    const mockContext: CanvasAIContext = {
      existingMilestones: [
        {
          id: "uuid-step-1",
          order: 0,
          title: "Step 1: Database Setup",
          checkpoints: [{ id: "cp-1", title: "Init schema", is_completed: true }],
        },
        {
          id: "uuid-step-2",
          order: 1,
          title: "Step 2: API Endpoints",
          checkpoints: [{ id: "cp-2", title: "Build routes", is_completed: false }],
        },
        {
          id: "uuid-step-3",
          order: 2,
          title: "Step 3: Frontend UI",
          checkpoints: [{ id: "cp-3", title: "Build views", is_completed: false }],
        },
      ],
      existingEdges: [
        { sourceId: "uuid-step-1", targetId: "uuid-step-2" },
        { sourceId: "uuid-step-2", targetId: "uuid-step-3" },
      ],
    };

    const result = generateFallbackWorkflow(
      "Add a QA testing step between step 2 and step 3",
      mockContext
    );

    expect(result.intent).toBe("update_pipeline");
    expect(result.summary).toContain("Inserted");
    expect(result.milestones.length).toBe(4);

    // The new step should be inserted at index 2 (between step 2 and original step 3)
    const insertedStep = result.milestones.find((m) => m.tempId && !m.id);
    expect(insertedStep).toBeDefined();
    expect(insertedStep?.title).toContain("Quality Assurance");
    expect(insertedStep?.checkpoints.length).toBeGreaterThanOrEqual(4);

    // Step 3 should have its sort order shifted
    const step3 = result.milestones.find((m) => m.id === "uuid-step-3");
    expect(step3?.sortOrder).toBe(3);

    // Edges should be rewired: step 2 -> new step -> step 3 (direct 2->3 edge removed)
    const directEdge = result.edges.find(
      (e) => e.fromId === "uuid-step-2" && e.toId === "uuid-step-3"
    );
    expect(directEdge).toBeUndefined();

    const edgeToNew = result.edges.find(
      (e) => e.fromId === "uuid-step-2" && e.toId === insertedStep?.tempId
    );
    const edgeFromNew = result.edges.find(
      (e) => e.fromId === insertedStep?.tempId && e.toId === "uuid-step-3"
    );
    expect(edgeToNew).toBeDefined();
    expect(edgeFromNew).toBeDefined();
  });

  it("executeAIPipeline gracefully runs with fallback when GEMINI_API_KEY is not set", async () => {
    delete process.env.GEMINI_API_KEY;
    const workflow = await executeAIPipeline("Realtime multiplayer game");

    expect(workflow.milestones.length).toBeGreaterThanOrEqual(5);
    expect(workflow.edges.length).toBeGreaterThanOrEqual(4);
    for (const m of workflow.milestones) {
      expect(m.checkpoints.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("executeAIPipeline successfully processes multi-phase Gemini responses", async () => {
    process.env.GEMINI_API_KEY = "test_key_123";

    const mockAiResponse: AIWorkflowResult = {
      intent: "update_pipeline",
      summary: "Added Caching step between API and Frontend",
      milestones: [
        {
          id: "uuid-1",
          title: "Database Setup",
          description: "PostgreSQL setup",
          color: "default",
          sortOrder: 0,
          checkpoints: [
            { id: "cp-1", title: "Create schema", isCompleted: true },
            { id: "cp-2", title: "Run migrations", isCompleted: true },
            { id: "cp-3", title: "Set RLS", isCompleted: true },
            { id: "cp-4", title: "Add indexes", isCompleted: true },
          ],
        },
        {
          id: "uuid-2",
          title: "API Layer",
          description: "Server routes",
          color: "purple",
          sortOrder: 1,
          checkpoints: [
            { id: "cp-5", title: "CRUD handlers", isCompleted: false },
            { id: "cp-6", title: "Zod schemas", isCompleted: false },
            { id: "cp-7", title: "Auth guard", isCompleted: false },
            { id: "cp-8", title: "Error handler", isCompleted: false },
          ],
        },
        {
          tempId: "m_new_cache",
          title: "Redis Caching Layer",
          description: "High speed caching",
          color: "amber",
          sortOrder: 2,
          checkpoints: [
            { title: "Configure Redis instance" },
            { title: "Set TTL invalidation" },
            { title: "Cache hot queries" },
            { title: "Add benchmark tests" },
          ],
        },
        {
          id: "uuid-3",
          title: "Frontend Client",
          description: "React views",
          color: "amber",
          sortOrder: 3,
          checkpoints: [
            { id: "cp-9", title: "Connect SWR hooks", isCompleted: false },
            { id: "cp-10", title: "Build tables", isCompleted: false },
            { id: "cp-11", title: "Add toasts", isCompleted: false },
            { id: "cp-12", title: "Add error boundary", isCompleted: false },
          ],
        },
      ],
      edges: [
        { fromId: "uuid-1", toId: "uuid-2" },
        { fromId: "uuid-2", toId: "m_new_cache" },
        { fromId: "m_new_cache", toId: "uuid-3" },
      ],
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

    const result = await generateWorkflowWithGemini(
      "Add a Redis cache step between step 2 and step 3",
      {
        existingMilestones: [
          { id: "uuid-1", order: 0, title: "Database", checkpoints: [] },
          { id: "uuid-2", order: 1, title: "API", checkpoints: [] },
          { id: "uuid-3", order: 2, title: "Frontend", checkpoints: [] },
        ],
        existingEdges: [
          { sourceId: "uuid-1", targetId: "uuid-2" },
          { sourceId: "uuid-2", targetId: "uuid-3" },
        ],
      }
    );

    expect(result.intent).toBe("update_pipeline");
    expect(result.summary).toBe("Added Caching step between API and Frontend");
    expect(result.milestones.length).toBe(4);
    expect(result.edges.length).toBe(3);
  });

  it("calculates non-overlapping DAG auto-layout with balanced vertical centering", () => {
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
