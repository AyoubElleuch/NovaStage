import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { authenticateMcp, createHandoffToken, createMcpToken, hashMcpToken } from "./auth";

const mock = vi.hoisted(() => ({ connection: null as unknown, handoff: null as unknown, banned: false, member: true, outage: false, user: true, writes: [] as unknown[], filters: [] as unknown[] }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({
  auth: { admin: { getUserById: async () => ({ data: { user: mock.user ? { id: "user" } : null } }) } },
  from: (table: string) => {
    const query = { select: () => query, eq: (key: string, value: unknown) => { mock.filters.push([key, value]); return query; },
      update: (payload: unknown) => { mock.writes.push(payload); return query; },
      maybeSingle: async () => ({ data: table === "canvas_mcp_connections" ? mock.connection : table === "canvas_mcp_drafts" ? mock.handoff : table === "project_banned_members" ? mock.banned ? { id: "ban" } : null : table === "project_members" && mock.member ? { user_id: "user" } : null, error: mock.outage ? new Error("DB down") : null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
    }; return query;
  },
}) }));
beforeEach(() => { vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-server-signing-secret"); mock.handoff = null; mock.connection = { id: "connection", project_id: "project", user_id: "user", expires_at: "2100-01-01T00:00:00Z" }; mock.member = true; mock.banned = false; mock.outage = false; mock.user = true; mock.writes.length = 0; mock.filters.length = 0; });
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
const request = (token: string) => new Request("https://novastage.test/api/mcp", { headers: { authorization: `Bearer ${token}` } });
it("uses random tokens and only queries hashes, never the raw credential", async () => {
  const token = createMcpToken();
  expect(token).toMatch(/^ns_mcp_[a-f0-9]{64}$/);
  expect(createMcpToken()).not.toBe(token);
  expect(await authenticateMcp(request(token))).toEqual({ projectId: "project", userId: "user" });
  expect(mock.filters).toContainEqual(["token_hash", hashMcpToken(token)]);
  expect(JSON.stringify(mock.filters)).not.toContain(token);
  expect(mock.writes).toHaveLength(1);
});
it("rejects malformed, revoked and expired tokens", async () => {
  expect(await authenticateMcp(request("fake"))).toBeNull();
  mock.connection = null;
  expect(await authenticateMcp(request(createMcpToken()))).toBeNull();
  mock.connection = { expires_at: "2000-01-01T00:00:00Z" };
  expect(await authenticateMcp(request(createMcpToken()))).toBeNull();
  expect(mock.writes).toHaveLength(0);
});
it("immediately rejects removed and banned members and deleted accounts", async () => {
  mock.member = false;
  expect(await authenticateMcp(request(createMcpToken()))).toBeNull();
  mock.member = true; mock.banned = true;
  expect(await authenticateMcp(request(createMcpToken()))).toBeNull();
  mock.banned = false; mock.user = false;
  expect(await authenticateMcp(request(createMcpToken()))).toBeNull();
  expect(mock.writes).toHaveLength(0);
});
it("fails closed on credential storage errors", async () => {
  mock.outage = true;
  await expect(authenticateMcp(request(createMcpToken()))).rejects.toThrow("unavailable");
});
it("authenticates a temporary session only for its pending draft and never creates a persistent connection", async () => {
  const id = "30000000-0000-4000-8000-000000000001";
  const handoff = createHandoffToken(id);
  mock.handoff = { id, project_id: "project", user_id: "user", status: "pending" };
  expect(await authenticateMcp(request(handoff.token))).toEqual({ projectId: "project", userId: "user", requestId: id });
  expect(mock.filters).toContainEqual(["id", id]);
  expect(mock.filters).toContainEqual(["status", "pending"]);
  expect(mock.writes).toHaveLength(0);
  expect(createHandoffToken(id).token).not.toBe(handoff.token);
  mock.handoff = { id, status: "ready" };
  expect(await authenticateMcp(request(handoff.token))).toBeNull();
  mock.handoff = { id, status: "dismissed" };
  expect(await authenticateMcp(request(handoff.token))).toBeNull();
});
it("rejects expired and tampered handoff credentials before reading the database", async () => {
  vi.useFakeTimers();
  const { token } = createHandoffToken("30000000-0000-4000-8000-000000000001");
  const [payload, signature] = token.split(".");
  expect(await authenticateMcp(request(`${payload}.${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`))).toBeNull();
  const modified = Buffer.from(JSON.stringify({ id: "30000000-0000-4000-8000-000000000002", exp: Date.now() + 900000 })).toString("base64url");
  expect(await authenticateMcp(request(`ns_handoff_${modified}.${signature}`))).toBeNull();
  vi.advanceTimersByTime(15 * 60 * 1000 + 1);
  expect(await authenticateMcp(request(token))).toBeNull();
  expect(mock.filters).toHaveLength(0);
});
