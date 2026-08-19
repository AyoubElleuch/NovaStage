import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyAIWorkflowResult } from "./ai-reconcile";
import { CanvasNode, CanvasEdge } from "./types";
import { AIWorkflowResult } from "@/lib/ai/types";

// Mock Supabase admin client
const mockAdminClient = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockAdminClient,
}));

vi.mock("./server", () => ({
  getProjectCanvasData: vi.fn(),
}));

import { getProjectCanvasData } from "./server";

describe("AI Canvas Graph Reconciliation Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies new pipeline generation on empty canvas", async () => {
    const aiResult: AIWorkflowResult = {
      intent: "create_pipeline",
      summary: "Generated 3-step pipeline",
      milestones: [
        {
          tempId: "m1",
          title: "Step 1",
          color: "default",
          checkpoints: [{ title: "Task 1" }],
        },
        {
          tempId: "m2",
          title: "Step 2",
          color: "purple",
          checkpoints: [{ title: "Task 2" }],
        },
      ],
      edges: [{ fromId: "m1", toId: "m2" }],
    };

    const insertedNodes = [
      { id: "uuid-node-1", project_id: "p1", title: "Step 1", position_x: 100, position_y: 100, sort_order: 0 },
      { id: "uuid-node-2", project_id: "p1", title: "Step 2", position_x: 480, position_y: 100, sort_order: 1 },
    ];

    const mockSelect = vi.fn().mockResolvedValue({ data: insertedNodes, error: null });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === "canvas_nodes") {
        return { insert: mockInsert, update: mockUpdate };
      }
      if (table === "canvas_checkpoints") {
        return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
      }
      if (table === "canvas_edges") {
        return { insert: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
      }
      return {};
    });

    const result = await applyAIWorkflowResult("p1", aiResult, { nodes: [], edges: [] });

    expect(result.intent).toBe("create_pipeline");
    expect(result.nodes.length).toBe(2);
    expect(mockAdminClient.from).toHaveBeenCalledWith("canvas_nodes");
  });

  it("applies step insertion between step 2 and step 3 with edge rewiring and shift", async () => {
    const existingNodes: CanvasNode[] = [
      {
        id: "uuid-step-1",
        project_id: "p1",
        title: "Step 1: Auth",
        description: "",
        status: "completed",
        position_x: 100,
        position_y: 100,
        width: 280,
        height: 170,
        color: "default",
        sort_order: 0,
        claimed_by: null,
        version: 1,
        checkpoints: [],
      },
      {
        id: "uuid-step-2",
        project_id: "p1",
        title: "Step 2: Backend API",
        description: "",
        status: "in_progress",
        position_x: 480,
        position_y: 100,
        width: 280,
        height: 170,
        color: "purple",
        sort_order: 1,
        claimed_by: null,
        version: 1,
        checkpoints: [],
      },
      {
        id: "uuid-step-3",
        project_id: "p1",
        title: "Step 3: Deployment",
        description: "",
        status: "draft",
        position_x: 860,
        position_y: 100,
        width: 280,
        height: 170,
        color: "rose",
        sort_order: 2,
        claimed_by: null,
        version: 1,
        checkpoints: [],
      },
    ];

    const existingEdges: CanvasEdge[] = [
      {
        id: "edge-1-2",
        project_id: "p1",
        source_node_id: "uuid-step-1",
        target_node_id: "uuid-step-2",
        source_handle: "right",
        target_handle: "left",
      },
      {
        id: "edge-2-3",
        project_id: "p1",
        source_node_id: "uuid-step-2",
        target_node_id: "uuid-step-3",
        source_handle: "right",
        target_handle: "left",
      },
    ];

    const aiResult: AIWorkflowResult = {
      intent: "update_pipeline",
      summary: "Inserted QA Testing milestone between step 2 and step 3",
      milestones: [
        {
          id: "uuid-step-1",
          title: "Step 1: Auth",
          sortOrder: 0,
          checkpoints: [],
        },
        {
          id: "uuid-step-2",
          title: "Step 2: Backend API",
          sortOrder: 1,
          checkpoints: [],
        },
        {
          tempId: "m_new_qa",
          title: "Intermediate QA Testing",
          description: "Integration testing phase",
          color: "amber",
          sortOrder: 2,
          checkpoints: [{ title: "Run test suite" }, { title: "Verify load threshold" }],
        },
        {
          id: "uuid-step-3",
          title: "Step 3: Deployment",
          sortOrder: 3,
          checkpoints: [],
        },
      ],
      edges: [
        { fromId: "uuid-step-1", toId: "uuid-step-2" },
        { fromId: "uuid-step-2", toId: "m_new_qa" },
        { fromId: "m_new_qa", toId: "uuid-step-3" },
      ],
    };

    const newlyCreatedQaNode: CanvasNode = {
      id: "uuid-step-qa",
      project_id: "p1",
      title: "Intermediate QA Testing",
      description: "Integration testing phase",
      status: "draft",
      position_x: 860,
      position_y: 100,
      width: 280,
      height: 170,
      color: "amber",
      sort_order: 2,
      claimed_by: null,
      version: 1,
      checkpoints: [],
    };

    const finalMockNodes: CanvasNode[] = [
      existingNodes[0],
      existingNodes[1],
      newlyCreatedQaNode,
      { ...existingNodes[2], sort_order: 3, position_x: 1240 },
    ];

    const finalMockEdges: CanvasEdge[] = [
      existingEdges[0],
      {
        id: "edge-2-qa",
        project_id: "p1",
        source_node_id: "uuid-step-2",
        target_node_id: "uuid-step-qa",
        source_handle: "right",
        target_handle: "left",
      },
      {
        id: "edge-qa-3",
        project_id: "p1",
        source_node_id: "uuid-step-qa",
        target_node_id: "uuid-step-3",
        source_handle: "right",
        target_handle: "left",
      },
    ];

    vi.mocked(getProjectCanvasData).mockResolvedValue({
      nodes: finalMockNodes,
      edges: finalMockEdges,
      claimRequests: [],
    });

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === "canvas_nodes") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: newlyCreatedQaNode, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      if (table === "canvas_checkpoints") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ data: [], error: null }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        };
      }
      if (table === "canvas_edges") {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {};
    });

    const result = await applyAIWorkflowResult("p1", aiResult, {
      nodes: existingNodes,
      edges: existingEdges,
    });

    expect(result.intent).toBe("update_pipeline");
    expect(result.summary).toContain("QA Testing");
    expect(result.nodes.length).toBe(4);
    expect(result.edges.length).toBe(3);
  });
});
