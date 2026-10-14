import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyAWSServiceNodes } from "./ai-reconcile";
import type { CanvasNode } from "./types";
import type { AIWorkflowResult } from "../ai/types";

const { writes, from } = vi.hoisted(() => {
  const writes: { table: string; operation: string; payload: Record<string, unknown> }[] = [];
  const from = vi.fn((table: string) => {
    const result = { data: { id: "created-service" }, error: null };
    const query = {
      insert: (payload: Record<string, unknown>) => {
        writes.push({ table, operation: "insert", payload });
        return query;
      },
      update: (payload: Record<string, unknown>) => {
        writes.push({ table, operation: "update", payload });
        return query;
      },
      delete: () => query,
      eq: () => query,
      or: () => query,
      select: () => query,
      single: async () => result,
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
    };
    return query;
  });
  return { writes, from };
});

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from }) }));
vi.mock("./server", () => ({ getProjectCanvasData: async () => ({ nodes: [], edges: [] }) }));

const legacy: CanvasNode = {
  id: "legacy-dns", project_id: "project", title: "Global DNS & Latency Routing",
  description: "Existing DNS", status: "draft", position_x: 100, position_y: 100,
  width: 260, height: 220, color: "default", sort_order: 0, claimed_by: null,
  version: 1, checkpoints: [], node_type: "aws_service",
  aws_metadata: { serviceId: "route53", category: "networking", config: { routing: "latency" } },
};

describe("AI AWS catalog node persistence", () => {
  beforeEach(() => { writes.length = 0; vi.clearAllMocks(); });

  it.each(["aws_architecture", "full_stack"] as const)("creates current catalog cards for %s without rewriting saved legacy nodes", async (mode) => {
    const result: AIWorkflowResult = {
      mode, intent: "create_pipeline", summary: "Create architecture", milestones: [], edges: [],
      serviceNodes: [{ tempId: "dns", serviceId: "route53", name: "Global DNS & Latency Routing", description: "Routes traffic", config: { routing: "latency" } }],
    };
    const before = structuredClone(legacy);
    await applyAWSServiceNodes("project", result, { nodes: [legacy], edges: [] });
    expect(writes).toHaveLength(1);
    expect(writes[0]).toEqual({
      table: "canvas_nodes", operation: "insert", payload: expect.objectContaining({
        node_type: "aws_service", title: "Amazon Route 53", width: 200, height: 220,
        description: "Global DNS & Latency Routing\n\nRoutes traffic",
        aws_metadata: { serviceId: "route53", category: "networking", region: "us-east-1", config: { type: "A", routing: "latency" } },
      }),
    });
    expect(legacy).toEqual(before);
  });

  it("preserves legacy identity, label and sizing when AI updates an existing service", async () => {
    await applyAWSServiceNodes("project", {
      intent: "update_pipeline", summary: "Update DNS", milestones: [], edges: [],
      serviceNodes: [{ id: legacy.id, tempId: legacy.id, serviceId: "route53", name: legacy.title, config: { type: "AAAA" } }],
    }, { nodes: [legacy], edges: [] });
    expect(writes).toHaveLength(1);
    expect(writes[0]).toEqual({ table: "canvas_nodes", operation: "update", payload: expect.objectContaining({
      title: legacy.title, width: legacy.width, height: legacy.height,
      aws_metadata: expect.objectContaining({ config: { type: "AAAA" } }),
    }) });
  });
});
