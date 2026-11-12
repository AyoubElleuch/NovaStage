import { expect, it, vi, beforeEach } from "vitest";
vi.mock("@/lib/canvas/sharing", () => ({ getSharedCanvas: vi.fn() }));
import { getSharedCanvas } from "@/lib/canvas/sharing";
import { GET } from "./route";
const load = vi.mocked(getSharedCanvas);
const context = { params: Promise.resolve({ token: "a".repeat(64) }) };
beforeEach(() => vi.resetAllMocks());

it("returns only the allowlisted canvas with no caching", async () => {
  load.mockResolvedValue({ nodes: [], edges: [] });
  const response = await GET(new Request("https://example.com"), context);
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(await response.json()).toEqual({ nodes: [], edges: [] });
  expect(load).toHaveBeenCalledWith("a".repeat(64));
});
it("rejects revoked tokens", async () => {
  load.mockResolvedValue(null);
  expect((await GET(new Request("https://example.com"), context)).status).toBe(404);
});
it("does not expose database errors", async () => {
  load.mockRejectedValue(new Error("private database information"));
  const response = await GET(new Request("https://example.com"), context);
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private database");
});
