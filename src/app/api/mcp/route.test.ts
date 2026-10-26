import { beforeEach, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { POST, GET } from "./route";
import { sampleWorkflow, sampleArchitecture } from "@/lib/mcp/test-fixtures";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), limit: vi.fn(), writes: [] as { table: string; body: Record<string, unknown> }[], filters: [] as [string, string, unknown][] }));
vi.mock("@/lib/mcp/auth", () => ({ authenticateMcp: mocks.auth }));
vi.mock("@/lib/security/rate-limit", () => ({ checkRateLimitAsync: mocks.limit, getClientIp: async () => "test-client" }));
vi.mock("@/lib/canvas/server", () => ({ getProjectCanvasData: async () => ({ nodes: [], edges: [] }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: (table: string) => {
  let write = false;
  const query = {
    select: () => query, eq: (key: string, value: unknown) => { mocks.filters.push([table, key, value]); return query; }, in: () => query, order: () => query, limit: () => query,
    insert: (body: Record<string, unknown>) => { write = true; mocks.writes.push({ table, body }); return query; },
    update: (body: Record<string, unknown>) => { write = true; mocks.writes.push({ table, body }); return query; },
    maybeSingle: async () => ({ data: { id: "draft-id" }, error: null }),
    then: (resolve: (value: unknown) => void) => Promise.resolve({ data: write ? { id: "draft-id" } : [], error: null }).then(resolve),
  }; return query;
} }) }));
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ projectId: "project", userId: "user" }); mocks.limit.mockResolvedValue({ allowed: true }); mocks.writes.length = 0; mocks.filters.length = 0; });

it("supports real SDK initialization, discovery, canvas reads, catalog searches and draft proposals over HTTP", async () => {
  const client = new Client({ name: "codex-claude-compatibility-test", version: "1" });
  const transport = new StreamableHTTPClientTransport(new URL("https://novastage.test/api/mcp"), {
    fetch: async (input, init) => {
      const request = new Request(input, init);
      return request.method === "POST" ? POST(request) : GET();
    },
  });
  await client.connect(transport);
  try {
    expect((await client.listTools()).tools.map(tool => tool.name)).toEqual(["get_canvas", "list_requests", "search_aws_services", "propose_workflow"]);
    const canvas = await client.callTool({ name: "get_canvas", arguments: {} });
    expect(canvas.isError).toBeUndefined();
    const services = await client.callTool({ name: "search_aws_services", arguments: { query: "lambda" } });
    expect(JSON.stringify(services)).toContain("lambda");
    const proposal = await client.callTool({ name: "propose_workflow", arguments: { prompt: "Design an API", workflow: sampleWorkflow() } });
    expect(proposal.isError).toBeUndefined();
    expect(JSON.stringify(proposal)).toContain("ready");
    expect(mocks.writes).toHaveLength(1);
    expect(mocks.writes[0].body).toMatchObject({ project_id: "project", user_id: "user", status: "ready" });
    const invalid = sampleArchitecture(); invalid.serviceNodes[0].serviceId = "fake-service";
    const rejected = await client.callTool({ name: "propose_workflow", arguments: { prompt: "Invalid API", workflow: invalid } });
    expect(rejected.isError).toBe(true);
    expect(mocks.writes).toHaveLength(1);
  } finally { await client.close(); }
});
it("rejects foreign origins before credential lookups", async () => {
  expect((await POST(new Request("https://novastage.test/api/mcp", { method: "POST", headers: { origin: "https://evil.test" } }))).status).toBe(403);
  expect(mocks.auth).not.toHaveBeenCalled();
});
it("rejects missing credentials, limits abuse, and fails closed on database outages", async () => {
  const request = () => new Request("https://novastage.test/api/mcp", { method: "POST" });
  mocks.auth.mockResolvedValue(null);
  expect((await POST(request())).status).toBe(401);
  mocks.auth.mockRejectedValue(new Error("Database unavailable"));
  expect((await POST(request())).status).toBe(503);
  mocks.limit.mockResolvedValue({ allowed: false });
  expect((await POST(request())).status).toBe(429);
});
it("returns 405 for a standalone SSE subscription", () => { expect(GET().status).toBe(405); });
it("supports direct HTTP calls from desktop assistants and restricts temporary access to the original request", async () => {
  const requestId = "30000000-0000-4000-8000-000000000001";
  mocks.auth.mockResolvedValue({ projectId: "project", userId: "user", requestId });
  const call = async (name: string, args = {}) => {
    const response = await POST(new Request("https://novastage.test/api/mcp", { method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2025-11-25" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
    }));
    expect(response.status).toBe(200);
    return response.json();
  };
  expect((await call("list_requests")).result.isError).toBeUndefined();
  expect(mocks.filters).toContainEqual(["canvas_mcp_drafts", "id", requestId]);
  const rejected = await call("propose_workflow", { requestId: "30000000-0000-4000-8000-000000000002", prompt: "Foreign request", workflow: sampleWorkflow() });
  expect(rejected.result.isError).toBe(true);
  expect(mocks.writes).toHaveLength(0);
  const missing = await call("propose_workflow", { prompt: "Unscoped draft", workflow: sampleWorkflow() });
  expect(missing.result.isError).toBe(true);
  expect(mocks.writes).toHaveLength(0);
  const accepted = await call("propose_workflow", { requestId, prompt: "Design an API", workflow: sampleWorkflow() });
  expect(accepted.result.isError).toBeUndefined();
  expect(mocks.writes).toHaveLength(1);
});
