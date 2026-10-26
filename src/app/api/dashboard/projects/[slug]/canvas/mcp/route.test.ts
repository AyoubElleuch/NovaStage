import { beforeEach, expect, it, vi } from "vitest";
import { GET, POST, DELETE } from "./route";
import { sampleWorkflow } from "@/lib/mcp/test-fixtures";

const mock = vi.hoisted(() => ({
  user: true, member: true, rpc: vi.fn(), draft: null as unknown,
  writes: [] as { table: string; operation: string; body?: Record<string, unknown>; filters: [string, unknown][] }[],
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ getAuthenticatedUser: async () => mock.user ? { id: "user" } : null }));
vi.mock("@/lib/projects", () => ({ getProjectBySlug: async () => ({ id: "project" }) }));
vi.mock("@/lib/mcp/auth", () => ({ hasMcpProjectAccess: async () => mock.member, createMcpToken: () => "ns_mcp_" + "a".repeat(64), hashMcpToken: () => "hashed-token", createHandoffToken: () => ({ token: "temporary-handoff", expiresAt: "2100-01-01" }) }));
vi.mock("@/lib/security/rate-limit", () => ({ checkRateLimitAsync: async () => ({ allowed: true }) }));
vi.mock("@/lib/canvas/server", () => ({ getProjectCanvasData: async () => ({ nodes: [], edges: [] }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mock.rpc, from: (table: string) => {
  const operation = { table, operation: "read", body: undefined as Record<string, unknown> | undefined, filters: [] as [string, unknown][] };
  mock.writes.push(operation);
  const result = () => ({ data: table === "canvas_mcp_drafts" ? mock.draft : { id: "connection", expires_at: "2100-01-01", last_used_at: null }, error: null });
  const query = {
    select: () => query, eq: (key: string, value: unknown) => { operation.filters.push([key, value]); return query; },
    gt: () => query, in: () => query, order: () => query, limit: () => query,
    upsert: (body: Record<string, unknown>) => { operation.operation = "upsert"; operation.body = body; return query; },
    insert: (body: Record<string, unknown>) => { operation.operation = "insert"; operation.body = body; return query; },
    update: (body: Record<string, unknown>) => { operation.operation = "update"; operation.body = body; return query; },
    delete: () => { operation.operation = "delete"; return query; }, maybeSingle: async () => result(), single: async () => result(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
  }; return query;
} }) }));
const context = { params: Promise.resolve({ slug: "project" }) };
const request = (body: unknown, origin = "https://novastage.test") => new Request("https://novastage.test/api/dashboard/projects/project/canvas/mcp", { method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); mock.user = true; mock.member = true; mock.draft = null; mock.writes.length = 0; mock.rpc.mockResolvedValue({ error: null }); });

it("requires login, current membership and the correct origin before creating credentials", async () => {
  expect((await POST(request({ action: "connect" }, "https://evil.test"), context)).status).toBe(403);
  mock.user = false;
  expect((await POST(request({ action: "connect" }), context)).status).toBe(401);
  mock.user = true; mock.member = false;
  expect((await POST(request({ action: "connect" }), context)).status).toBe(403);
  expect(mock.writes).toHaveLength(0);
});
it("stores only the hash when creating/replacing a connection and returns the secret once", async () => {
  const response = await POST(request({ action: "connect" }), context);
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.token).toMatch(/^ns_mcp_/);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(mock.writes[0].body).toMatchObject({ project_id: "project", user_id: "user", token_hash: "hashed-token", last_used_at: null });
  expect(JSON.stringify(mock.writes)).not.toContain(result.token);
  const get = await GET(new Request("https://novastage.test"), context);
  expect(JSON.stringify(await get.json())).not.toContain(result.token);
});
it("revokes only the current user's connection for this canvas", async () => {
  expect((await DELETE(new Request("https://novastage.test", { method: "DELETE" }), context)).status).toBe(200);
  expect(mock.writes[0]).toMatchObject({ operation: "delete", filters: [["project_id", "project"], ["user_id", "user"]] });
});
it("queues a prompt without invoking an AI model or quota RPC", async () => {
  expect((await POST(request({ action: "request", prompt: "Design a serverless backend", mode: "aws_architecture" }), context)).status).toBe(200);
  expect(mock.writes.find(write => write.operation === "insert")?.body).toMatchObject({ project_id: "project", user_id: "user", mode: "aws_architecture" });
  expect(mock.rpc).not.toHaveBeenCalled();
  expect((await POST(request({ action: "request", prompt: "x".repeat(8001), mode: "workflow" }), context)).status).toBe(400);
});
it("accepts only an owned ready draft using the atomic RPC and propagates transaction failure", async () => {
  mock.draft = { workflow: sampleWorkflow() };
  expect((await POST(request({ action: "apply", id: "draft" }), context)).status).toBe(200);
  expect(mock.writes[0].filters).toEqual([["id", "draft"], ["project_id", "project"], ["user_id", "user"], ["status", "ready"]]);
  expect(mock.rpc).toHaveBeenCalledWith("apply_canvas_mcp_draft", expect.objectContaining({ p_draft_id: "draft", p_user_id: "user", p_graph: expect.objectContaining({ nodes: expect.any(Array) }) }));
  mock.rpc.mockResolvedValue({ error: new Error("Rollback") });
  const rejected = await POST(request({ action: "apply", id: "draft" }), context);
  expect(rejected.status).toBe(409);
  expect((await rejected.json()).error).toContain("Nothing was saved");
});
it("rejects unavailable drafts before building or saving a diagram", async () => {
  expect((await POST(request({ action: "apply", id: "foreign-draft" }), context)).status).toBe(409);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it.each(["codex", "claude"])("prepares %s with an owned pending request and short-lived access, without rotating MCP credentials", async provider => {
  mock.draft = { id: "30000000-0000-4000-8000-000000000001" };
  const response = await POST(request({ action: "launch", provider, prompt: "Design an API", mode: "workflow" }), context);
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.url).toMatch(provider === "codex" ? /^codex:\/\/new\?prompt=/ : /^claude:\/\/code\/new\?q=/);
  expect(result.prompt).toContain("http");
  expect(result.prompt).toContain("temporary-handoff");
  expect(result.requestId).toBe("30000000-0000-4000-8000-000000000001");
  expect(mock.writes).toHaveLength(1);
  expect(mock.writes[0]).toMatchObject({ table: "canvas_mcp_drafts", operation: "insert", body: { project_id: "project", user_id: "user", prompt: "Design an API", mode: "workflow" } });
  expect(mock.rpc).not.toHaveBeenCalled();
  expect(response.headers.get("cache-control")).toContain("no-store");
});
it("rejects unsupported desktop apps before queuing a request", async () => {
  expect((await POST(request({ action: "launch", provider: "other", prompt: "Diagram", mode: "workflow" }), context)).status).toBe(400);
  expect(mock.writes).toHaveLength(0);
});
it.each(["launch", "request"])("rejects an unsupported %s mode without queuing a request", async action => {
  expect((await POST(request({ action, provider: "codex", prompt: "Diagram", mode: "unsupported" }), context)).status).toBe(400);
  expect(mock.writes).toHaveLength(0);
});
