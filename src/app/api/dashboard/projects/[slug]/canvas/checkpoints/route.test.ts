import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createFakeSupabase, type Row } from "@/lib/test-utils/fake-supabase";

const mocks = vi.hoisted(() => ({ session: vi.fn(), project: vi.fn(), member: vi.fn(), tables: {} as Record<string, Row[]> }));
vi.mock("@/lib/auth/session", () => ({ getAuthenticatedProfile: mocks.session }));
vi.mock("@/lib/projects", () => ({ getProjectBySlug: mocks.project, isProjectMember: mocks.member }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => createFakeSupabase(mocks.tables) }));
import { POST } from "./route";

const future = () => new Date(Date.now() + 60_000).toISOString();
const past = () => new Date(Date.now() - 60_000).toISOString();
const context = () => ({ params: Promise.resolve({ slug: "launch" }) });
const post = (body: unknown) => POST(new NextRequest("http://localhost:3000/api/dashboard/projects/launch/canvas/checkpoints", { method: "POST", body: JSON.stringify(body) }), context());

beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ user: { id: "alice" } });
  mocks.project.mockResolvedValue({ id: "project-1" });
  mocks.member.mockResolvedValue(true);
  mocks.tables = {
    canvas_nodes: [
      { id: "mine", project_id: "project-1", claimed_by: "alice", claim_expires_at: future(), status: "draft" },
      { id: "theirs", project_id: "project-1", claimed_by: "bob", claim_expires_at: future(), status: "draft" },
      { id: "stale", project_id: "project-1", claimed_by: "alice", claim_expires_at: past(), status: "draft" },
    ],
    canvas_checkpoints: [
      { id: "cp-mine", node_id: "mine", project_id: "project-1", title: "Mine", is_completed: false, sort_order: 0 },
      { id: "cp-theirs", node_id: "theirs", project_id: "project-1", title: "Theirs", is_completed: false, sort_order: 0 },
      { id: "cp-stale", node_id: "stale", project_id: "project-1", title: "Stale", is_completed: false, sort_order: 0 },
    ],
  };
});

const checkpoint = (id: string) => mocks.tables.canvas_checkpoints.find((row) => row.id === id);

describe("canvas checkpoints API", () => {
  it("requires authentication and project membership", async () => {
    mocks.session.mockResolvedValueOnce(null);
    expect((await post({ action: "toggle", node_id: "mine", checkpoint_id: "cp-mine", is_completed: true })).status).toBe(401);
    mocks.member.mockResolvedValueOnce(false);
    expect((await post({ action: "toggle", node_id: "mine", checkpoint_id: "cp-mine", is_completed: true })).status).toBe(403);
    expect(checkpoint("cp-mine")?.is_completed).toBe(false);
  });

  it("toggles a checkpoint on a milestone the caller holds and updates its status", async () => {
    const response = await post({ action: "toggle", node_id: "mine", checkpoint_id: "cp-mine", is_completed: true });
    expect(response.status).toBe(200);
    expect(checkpoint("cp-mine")).toMatchObject({ is_completed: true, completed_by: "alice" });
    expect(mocks.tables.canvas_nodes.find((row) => row.id === "mine")?.status).toBe("completed");
  });

  it("does not let a held milestone's claim authorize another milestone's checkpoint", async () => {
    for (const action of ["toggle", "edit", "delete"]) {
      const response = await post({ action, node_id: "mine", checkpoint_id: "cp-theirs", is_completed: true, title: "Hijacked" });
      expect(response.status, action).toBe(400);
    }
    expect(checkpoint("cp-theirs")).toMatchObject({ title: "Theirs", is_completed: false });
  });

  it("rejects edits when the milestone is held by someone else or the caller's claim expired", async () => {
    expect((await post({ action: "toggle", checkpoint_id: "cp-theirs", is_completed: true })).status).toBe(423);
    expect((await post({ action: "toggle", node_id: "stale", checkpoint_id: "cp-stale", is_completed: true })).status).toBe(423);
    expect((await post({ action: "add", node_id: "theirs", title: "New" })).status).toBe(423);
    expect(mocks.tables.canvas_checkpoints).toHaveLength(3);
  });

  it("derives the milestone from the checkpoint when the client omits it", async () => {
    expect((await post({ action: "edit", checkpoint_id: "cp-mine", title: "Renamed" })).status).toBe(200);
    expect(checkpoint("cp-mine")?.title).toBe("Renamed");
  });

  it("adds checkpoints after the existing ones and requires a milestone", async () => {
    const response = await post({ action: "add", node_id: "mine", title: "Second" });
    expect(response.status).toBe(200);
    expect((await response.json()).checkpoint).toMatchObject({ node_id: "mine", title: "Second", sort_order: 1 });
    expect((await post({ action: "add", title: "Orphan" })).status).toBe(400);
  });

  it("treats deleting a checkpoint that is already gone as success, but reports other missing checkpoints", async () => {
    expect((await post({ action: "delete", node_id: "mine", checkpoint_id: "cp-mine" })).status).toBe(200);
    expect(checkpoint("cp-mine")).toBeUndefined();
    expect(await (await post({ action: "delete", node_id: "mine", checkpoint_id: "cp-mine" })).json()).toEqual({ success: true });
    expect((await post({ action: "toggle", node_id: "mine", checkpoint_id: "cp-mine", is_completed: true })).status).toBe(404);
  });
});
