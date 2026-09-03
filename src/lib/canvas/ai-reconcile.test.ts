import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyAIWorkflowResult, applyAWSServiceNodes } from "./ai-reconcile";
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

  it("applyAWSServiceNodes positions VPC enclosing subnets and wires vertical interlocking bridges", async () => {
    const insertedGroups: Array<Record<string, unknown>> = [];
    const insertedServices: Array<Record<string, unknown>> = [];
    const insertedEdges: Array<Record<string, unknown>> = [];

    vi.mocked(getProjectCanvasData).mockResolvedValue({
      nodes: [
        { id: "uuid-vpc", project_id: "p1", title: "Production VPC", description: "", status: "draft", position_x: 380, position_y: 420, width: 600, height: 310, color: "default", sort_order: 0, claimed_by: null, version: 1, checkpoints: [] },
        { id: "uuid-public-sub", project_id: "p1", title: "Public Subnet", description: "", status: "draft", position_x: 420, position_y: 470, width: 280, height: 220, color: "default", sort_order: 0, claimed_by: null, version: 1, checkpoints: [] },
        { id: "uuid-alb", project_id: "p1", title: "ALB", description: "", status: "draft", position_x: 440, position_y: 515, width: 200, height: 140, color: "default", sort_order: 0, claimed_by: null, version: 1, checkpoints: [] },
      ],
      edges: [
        { id: "edge-bridge-1", project_id: "p1", source_node_id: "m_alb_uuid", target_node_id: "uuid-alb", source_handle: "bottom", target_handle: "top" }
      ],
      claimRequests: [],
    });

    mockAdminClient.from.mockImplementation((table: string) => {
      if (table === "canvas_nodes") {
        return {
          insert: vi.fn().mockImplementation((payload) => ({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockImplementation(() => {
                if (payload.node_type === "group") {
                  const g = { id: `uuid-group-${insertedGroups.length + 1}`, ...payload };
                  insertedGroups.push(g);
                  return Promise.resolve({ data: g, error: null });
                }
                const s = { id: `uuid-svc-${insertedServices.length + 1}`, ...payload };
                insertedServices.push(s);
                return Promise.resolve({ data: s, error: null });
              }),
            }),
          })),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      }
      if (table === "canvas_edges") {
        return {
          insert: vi.fn().mockImplementation((edges) => {
            insertedEdges.push(...edges);
            return Promise.resolve({ data: edges, error: null });
          }),
        };
      }
      return {};
    });

    const fullStackResult: AIWorkflowResult = {
      intent: "create_pipeline",
      mode: "full_stack",
      summary: "Interlocked Full Stack App",
      milestones: [
        { tempId: "m_alb", title: "3. Ingress Routing & SSL Termination", checkpoints: [{ title: "Deploy ALB", isCompleted: false }] }
      ],
      edges: [],
      groups: [
        { tempId: "vpc_1", label: "Production VPC", style: "vpc", childTempIds: ["subnet_public"] },
        { tempId: "subnet_public", parentGroupTempId: "vpc_1", label: "Public Ingress Subnet", style: "subnet", childTempIds: ["alb_1"] }
      ],
      serviceNodes: [
        { tempId: "alb_1", parentGroupTempId: "subnet_public", serviceId: "alb", name: "Application Load Balancer" }
      ],
      dataFlowEdges: [
        { fromId: "m_alb", toId: "alb_1", edgeType: "dependency", label: "Binds Listeners", protocol: "iac" }
      ]
    };

    const initialTempIdMap = {
      "m_alb": "m_alb_uuid"
    };

    const result = await applyAWSServiceNodes(
      "p1",
      fullStackResult,
      { nodes: [], edges: [] },
      initialTempIdMap
    );

    expect(result.nodes.length).toBe(3);
    expect(insertedGroups.length).toBe(2);
    expect(insertedServices.length).toBe(1);

    // Verify VPC container starts at X and subnet sits inside it
    const vpc = insertedGroups.find((g) => ((g.group_metadata as { style: string })?.style === "vpc"));
    const subnet = insertedGroups.find((g) => ((g.group_metadata as { style: string })?.style === "subnet"));
    expect(vpc).toBeDefined();
    expect(subnet).toBeDefined();
    expect((subnet?.position_x as number)).toBeGreaterThan((vpc?.position_x as number));
    expect((subnet?.position_y as number)).toBeGreaterThan((vpc?.position_y as number));

    // Verify interlocking bridge edge: source_handle: "bottom", target_handle: "top"
    expect(insertedEdges.length).toBe(1);
    expect(insertedEdges[0].source_node_id).toBe("m_alb_uuid");
    expect(insertedEdges[0].source_handle).toBe("bottom");
    expect(insertedEdges[0].target_handle).toBe("top");
    expect(insertedEdges[0].label).toBe("Binds Listeners");
  });
});

