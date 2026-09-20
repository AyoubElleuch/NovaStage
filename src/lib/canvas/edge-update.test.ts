import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mocks }));
vi.mock("@/lib/redis/client", () => ({ safeRedisSet: vi.fn(), safeRedisDel: vi.fn() }));
vi.mock("./ai-reconcile", () => ({ applyAIWorkflowResult: vi.fn(), applyAWSServiceNodes: vi.fn() }));
import { updateCanvasEdge } from "./server";

const updates = { label: " HTTPS / 443 ", edge_type: "network" as const };
function setup(claimedBy: string, expires: string, exists = true) {
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: exists ? { source_node_id: "a", target_node_id: "b" } : null }),
    single: vi.fn().mockResolvedValue({ data: { id: "edge", label: "HTTPS / 443", edge_type: "network" } }),
  };
  mocks.from.mockImplementation((table) => table === "canvas_nodes" ? {
    select: () => ({ in: () => ({ eq: () => Promise.resolve({ data: [{ claimed_by: claimedBy, claim_expires_at: expires }] }) }) }),
  } : query);
  return query;
}
beforeEach(() => vi.clearAllMocks());
describe("connection persistence permissions", () => {
  it("rejects an expired claim without writing", async () => {
    const query = setup("user", "2000-01-01");
    expect((await updateCanvasEdge("edge", "project", "user", false, updates)).success).toBe(false);
    expect(query.update).not.toHaveBeenCalled();
  });
  it("saves only whitelisted fields with project scoping for an active claimant", async () => {
    const query = setup("user", "2999-01-01");
    expect((await updateCanvasEdge("edge", "project", "user", false, updates)).success).toBe(true);
    expect(query.update).toHaveBeenCalledWith({ label: "HTTPS / 443", edge_type: "network" });
    expect(query.eq).toHaveBeenCalledWith("project_id", "project");
  });
  it("rejects missing connections even for project owners", async () => {
    const query = setup("user", "2999-01-01", false);
    expect((await updateCanvasEdge("edge", "project", "user", true, updates)).success).toBe(false);
    expect(query.update).not.toHaveBeenCalled();
  });
  it("rejects oversized labels before accessing storage", async () => {
    expect((await updateCanvasEdge("edge", "project", "user", true, { ...updates, label: "x".repeat(121) })).success).toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
