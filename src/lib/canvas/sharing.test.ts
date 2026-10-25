import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: mock.from }) }));
import { getSharedCanvas } from "./sharing";

beforeEach(() => vi.resetAllMocks());
it("rejects invalid tokens before querying the database", async () => {
  expect(await getSharedCanvas("private-project-name")).toBeNull();
  expect(mock.from).not.toHaveBeenCalled();
});
it("returns no canvas for an unknown or revoked token", async () => {
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
  mock.from.mockReturnValue(query);
  expect(await getSharedCanvas("a".repeat(64))).toBeNull();
  expect(mock.from).toHaveBeenCalledExactlyOnceWith("canvas_shares");
  expect(query.eq).toHaveBeenCalledWith("token", "a".repeat(64));
});
it("scopes every read to the token's project and never queries project or member metadata", async () => {
  const queries: { table: string; eq: ReturnType<typeof vi.fn> }[] = [];
  mock.from.mockImplementation(table => {
    const query = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { project_id: "shared-project" }, error: null }),
      then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null }),
    };
    queries.push({ table, eq: query.eq });
    return query;
  });
  expect(await getSharedCanvas("b".repeat(64))).toEqual({ nodes: [], edges: [] });
  expect(queries.map(q => q.table)).toEqual(["canvas_shares", "canvas_nodes", "canvas_checkpoints", "canvas_edges"]);
  for (const query of queries.slice(1)) expect(query.eq).toHaveBeenCalledWith("project_id", "shared-project");
});
