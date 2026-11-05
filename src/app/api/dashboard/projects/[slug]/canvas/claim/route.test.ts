import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createFakeSupabase, type Row } from "@/lib/test-utils/fake-supabase";

const mocks = vi.hoisted(() => ({
  session: vi.fn(), project: vi.fn(), member: vi.fn(), owner: vi.fn(), tables: {} as Record<string, Row[]>,
  claimDirect: vi.fn(), releaseDirect: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getAuthenticatedProfile: mocks.session }));
vi.mock("@/lib/projects", () => ({ getProjectBySlug: mocks.project, isProjectMember: mocks.member, isProjectOwner: mocks.owner }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => createFakeSupabase(mocks.tables) }));
vi.mock("@/lib/redis/client", () => ({ safeRedisSet: vi.fn(), safeRedisDel: vi.fn(), safeRedisExpire: vi.fn() }));
vi.mock("@/lib/canvas/server", () => ({ claimCanvasNodeDirect: mocks.claimDirect, releaseCanvasNodeDirect: mocks.releaseDirect }));
import { POST } from "./route";

const context = () => ({ params: Promise.resolve({ slug: "launch" }) });
const post = (body: unknown) => POST(new NextRequest("http://localhost:3000/api/dashboard/projects/launch/canvas/claim", { method: "POST", body: JSON.stringify(body) }), context());

beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ user: { id: "alice" } });
  mocks.project.mockResolvedValue({ id: "p1" });
  mocks.member.mockResolvedValue(true);
  mocks.owner.mockResolvedValue(false);
  mocks.tables = {
    canvas_nodes: [
      { id: "mine", project_id: "p1", claimed_by: "alice", claim_expires_at: "2000-01-01T00:00:00.000Z" },
      { id: "theirs", project_id: "p1", claimed_by: "bob", claim_expires_at: "2000-01-01T00:00:00.000Z" },
    ],
  };
});

describe("claim heartbeat", () => {
  it("renews only a claim the caller still holds and reports a lost claim", async () => {
    const renewed = await post({ action: "heartbeat", node_id: "mine" });
    const body = await renewed.json();
    expect(body.success).toBe(true);
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(new Date(String(mocks.tables.canvas_nodes[0].claim_expires_at)).getTime()).toBeGreaterThan(Date.now());

    const lost = await post({ action: "heartbeat", node_id: "theirs" });
    expect(await lost.json()).toEqual({ success: false, error: "You no longer hold this claim" });
    expect(mocks.tables.canvas_nodes[1].claim_expires_at).toBe("2000-01-01T00:00:00.000Z");
  });

  it("keeps ordinary authorization answers distinguishable from a revoked membership", async () => {
    mocks.member.mockResolvedValueOnce(false);
    const removed = await post({ action: "heartbeat", node_id: "mine" });
    expect(removed.status).toBe(403);
    expect(await removed.json()).toEqual({ error: "Forbidden" });

    mocks.tables.canvas_claim_requests = [{ id: "r1", project_id: "p1", node_id: "theirs", requester_id: "carol", current_holder_id: "bob", status: "pending" }];
    const denied = await post({ action: "resolve_claim", request_id: "r1", accept: true });
    expect(denied.status).toBe(403);
    expect((await denied.json()).error).toBe("Not authorized to resolve this request");
    const forced = await post({ action: "force_unlock", node_id: "theirs" });
    expect(forced.status).toBe(403);
    expect((await forced.json()).error).not.toBe("Forbidden");
  });
});
