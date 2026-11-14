import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase, type Row } from "@/lib/test-utils/fake-supabase";

const mocks = vi.hoisted(() => ({ tables: {} as Record<string, Row[]> }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => createFakeSupabase(mocks.tables) }));
vi.mock("@/lib/redis/client", () => ({ safeRedisSet: vi.fn(), safeRedisDel: vi.fn(), safeRedisExpire: vi.fn() }));
import { createCanvasEdge, deleteCanvasEdge, updateCanvasNode } from "./server";

const future = () => new Date(Date.now() + 60_000).toISOString();
const past = () => new Date(Date.now() - 60_000).toISOString();

beforeEach(() => {
  mocks.tables = {
    canvas_nodes: [
      { id: "mine", project_id: "p1", claimed_by: "alice", claim_expires_at: future(), node_type: "milestone" },
      { id: "theirs", project_id: "p1", claimed_by: "bob", claim_expires_at: future(), node_type: "milestone" },
      { id: "free", project_id: "p1", claimed_by: null, claim_expires_at: null, node_type: "milestone" },
      { id: "lapsed", project_id: "p1", claimed_by: "alice", claim_expires_at: past(), node_type: "milestone" },
      { id: "foreign", project_id: "p2", claimed_by: null, claim_expires_at: null, node_type: "milestone" },
    ],
    canvas_edges: [
      { id: "edge-1", project_id: "p1", source_node_id: "mine", target_node_id: "theirs", source_handle: "right", target_handle: "left" },
      { id: "edge-2", project_id: "p1", source_node_id: "theirs", target_node_id: "free", source_handle: "right", target_handle: "left" },
      { id: "foreign-edge", project_id: "p2", source_node_id: "foreign", target_node_id: "foreign", source_handle: "right", target_handle: "left" },
    ],
  };
});

describe("creating connections", () => {
  it("refuses endpoints outside the project, even for the owner", async () => {
    expect(await createCanvasEdge("p1", "mine", "foreign", "right", "left", "alice", true)).toBeNull();
    expect(await createCanvasEdge("p1", "mine", "missing", "right", "left", "alice", false)).toBeNull();
    expect(mocks.tables.canvas_edges).toHaveLength(3);
  });

  it("requires a live claim on one milestone unless a card is unclaimed or the user owns the project", async () => {
    expect(await createCanvasEdge("p1", "theirs", "lapsed", "right", "left", "alice", false)).toBeNull();
    expect(await createCanvasEdge("p1", "mine", "theirs", "bottom", "top", "alice", false)).toMatchObject({ source_node_id: "mine" });
    expect(await createCanvasEdge("p1", "free", "theirs", "bottom", "top", "alice", false)).not.toBeNull();
    expect(await createCanvasEdge("p1", "theirs", "lapsed", "bottom", "top", "owner", true)).not.toBeNull();
  });

  it("does not duplicate an identical connection and rejects self links and unknown types", async () => {
    const existing = await createCanvasEdge("p1", "mine", "theirs", "right", "left", "alice", false);
    expect(existing?.id).toBe("edge-1");
    expect(mocks.tables.canvas_edges.filter((edge) => edge.source_node_id === "mine" && edge.target_node_id === "theirs")).toHaveLength(1);
    const updated = await createCanvasEdge("p1", "mine", "theirs", "right", "left", "alice", false, "data_flow");
    expect(updated).toMatchObject({ id: "edge-1", edge_type: "data_flow" });
    expect(await createCanvasEdge("p1", "mine", "mine", "right", "left", "alice", false)).toBeNull();
    await expect(createCanvasEdge("p1", "mine", "free", "right", "left", "alice", false, "nonsense" as never)).rejects.toThrow("Invalid connection type");
  });
});

describe("deleting connections", () => {
  it("never deletes a connection that belongs to another project", async () => {
    expect(await deleteCanvasEdge("foreign-edge", "p1", "alice", true)).toEqual({ success: true });
    expect(mocks.tables.canvas_edges.some((edge) => edge.id === "foreign-edge")).toBe(true);
  });

  it("requires a claim on a linked card unless the user owns the project", async () => {
    expect(await deleteCanvasEdge("edge-2", "p1", "alice", false)).toEqual({ success: false });
    expect(mocks.tables.canvas_edges.some((edge) => edge.id === "edge-2")).toBe(true);
    expect(await deleteCanvasEdge("edge-1", "p1", "alice", false)).toEqual({ success: true });
    expect(mocks.tables.canvas_edges.some((edge) => edge.id === "edge-1")).toBe(false);
    expect(await deleteCanvasEdge("edge-2", "p1", "owner", true)).toEqual({ success: true });
  });
});

describe("updating cards", () => {
  it("lets anyone move a card but requires a live claim to change its content", async () => {
    expect(await updateCanvasNode("theirs", "p1", { position_x: 40 }, "alice")).toEqual({ success: true });
    expect(mocks.tables.canvas_nodes.find((node) => node.id === "theirs")?.position_x).toBe(40);
    expect(await updateCanvasNode("theirs", "p1", { title: "Mine now" }, "alice")).toMatchObject({ success: false, error: expect.stringContaining("must claim") });
    expect(await updateCanvasNode("lapsed", "p1", { title: "Stale" }, "alice")).toMatchObject({ success: false });
    expect(await updateCanvasNode("mine", "p1", { title: "Renamed" }, "alice")).toEqual({ success: true });
    expect(await updateCanvasNode("foreign", "p1", { title: "Hijack" }, "alice")).toEqual({ success: false, error: "Node not found" });
  });
});
