import { beforeEach, expect, it, vi } from "vitest";
import { authenticateMcp, createMcpToken, hashMcpToken } from "./auth";

const mock = vi.hoisted(() => ({ connection: null as unknown, banned: false, member: true, outage: false, user: true, writes: [] as unknown[], filters: [] as unknown[] }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({
  auth: { admin: { getUserById: async () => ({ data: { user: mock.user ? { id: "user" } : null } }) } },
  from: (table: string) => {
    const query = { select: () => query, eq: (key: string, value: unknown) => { mock.filters.push([key, value]); return query; },
      update: (payload: unknown) => { mock.writes.push(payload); return query; },
      maybeSingle: async () => ({ data: table === "canvas_mcp_connections" ? mock.connection : table === "project_banned_members" ? mock.banned ? { id: "ban" } : null : table === "project_members" && mock.member ? { user_id: "user" } : null, error: mock.outage ? new Error("DB down") : null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
    }; return query;
  },
}) }));
beforeEach(() => { mock.connection = { id: "connection", project_id: "project", user_id: "user", expires_at: "2100-01-01T00:00:00Z" }; mock.member = true; mock.banned = false; mock.outage = false; mock.user = true; mock.writes.length = 0; mock.filters.length = 0; });
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
