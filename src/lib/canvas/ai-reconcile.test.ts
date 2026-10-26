import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyAWSServiceNodes, applyAIWorkflowResult } from "./ai-reconcile";
import { sampleArchitecture, sampleWorkflow } from "../mcp/test-fixtures";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));
vi.mock("./server", () => ({ getProjectCanvasData: async () => ({ nodes: [], edges: [] }) }));
describe("atomic built-in graph persistence", () => {
  beforeEach(() => rpc.mockReset().mockResolvedValue({ error: null }));
  it.each(["workflow", "aws_architecture"] as const)("builds and validates %s before one write", async mode => {
    const input = mode === "workflow" ? sampleWorkflow() : sampleArchitecture();
    const apply = mode === "workflow" ? applyAIWorkflowResult : applyAWSServiceNodes;
    await apply("project", { ...input, intent: "create_pipeline" }, { nodes: [], edges: [] }, "user");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("apply_canvas_ai_graph", expect.objectContaining({ p_project_id: "project", p_user_id: "user", p_mode: mode }));
    const graph = rpc.mock.calls[0][1].p_graph;
    expect(graph.nodes.every((node: { node_type: string }) => mode === "workflow" ? node.node_type === "milestone" : ["group", "aws_service"].includes(node.node_type))).toBe(true);
  });
  it("rejects mixed content before any write and never reports success after a failed transaction", async () => {
    await expect(applyAWSServiceNodes("project", { ...sampleArchitecture(), intent: "create_pipeline", milestones: sampleWorkflow().milestones }, { nodes: [], edges: [] }, "user")).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockResolvedValue({ error: { message: "constraint" } });
    await expect(applyAIWorkflowResult("project", { ...sampleWorkflow(), intent: "create_pipeline" }, { nodes: [], edges: [] }, "user")).rejects.toThrow("Nothing was saved");
  });
});
