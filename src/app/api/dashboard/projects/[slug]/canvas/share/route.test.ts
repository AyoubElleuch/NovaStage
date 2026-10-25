import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  user: vi.fn(), project: vi.fn(), owner: vi.fn(), from: vi.fn(),
  upsert: vi.fn(), remove: vi.fn(), select: vi.fn(), eq: vi.fn(), single: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getAuthenticatedUser: mocks.user }));
vi.mock("@/lib/projects", () => ({ getProjectBySlug: mocks.project, isProjectOwner: mocks.owner }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: mocks.from }) }));
import { GET, POST, DELETE } from "./route";

const context = () => ({ params: Promise.resolve({ slug: "private-name" }) });
const request = (method: string, origin = "http://localhost:3000") => new NextRequest("http://localhost:3000/api/dashboard/projects/private-name/canvas/share", { method, headers: { origin } });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "owner" });
  mocks.project.mockResolvedValue({ id: "project-id" });
  mocks.owner.mockResolvedValue(true);
  const query = { select: mocks.select, eq: mocks.eq, maybeSingle: mocks.single, delete: mocks.remove, upsert: mocks.upsert };
  mocks.from.mockReturnValue(query);
  mocks.select.mockReturnValue(query);
  mocks.remove.mockReturnValue(query);
  mocks.eq.mockReturnValue(query);
  mocks.single.mockResolvedValue({ data: { token: "a".repeat(64) }, error: null });
  mocks.upsert.mockResolvedValue({ error: null });
});

describe("canvas share management", () => {
  it.each([GET, POST, DELETE])("rejects anonymous requests without touching shares", async handler => {
    mocks.user.mockResolvedValue(null);
    expect((await handler(request("GET"), context())).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it.each([GET, POST, DELETE])("rejects members who are not owners", async handler => {
    mocks.owner.mockResolvedValue(false);
    expect((await handler(request("GET"), context())).status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("creates a cryptographically random token without rotating an existing link", async () => {
    const result = await POST(request("POST"), context());
    expect(result.status).toBe(200);
    const [row, options] = mocks.upsert.mock.calls[0];
    expect(row).toEqual({ project_id: "project-id", token: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(options).toEqual({ onConflict: "project_id", ignoreDuplicates: true });
    expect(await result.json()).toEqual({ token: "a".repeat(64) });
    expect(result.headers.get("cache-control")).toBe("private, no-store");
  });
  it("does not create a link when loading settings", async () => {
    const result = await GET(request("GET"), context());
    expect(await result.json()).toEqual({ token: "a".repeat(64) });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("revokes only the owner's project link", async () => {
    mocks.eq.mockResolvedValueOnce({ error: null });
    const result = await DELETE(request("DELETE"), context());
    expect(mocks.remove).toHaveBeenCalled();
    expect(mocks.eq).toHaveBeenCalledWith("project_id", "project-id");
    expect(await result.json()).toEqual({ token: null });
  });
  it("rejects cross-origin writes", async () => {
    expect((await POST(request("POST", "https://other.example"), context())).status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("returns a generic error without leaking database details", async () => {
    mocks.upsert.mockResolvedValue({ error: { message: "private database detail" } });
    const result = await POST(request("POST"), context());
    expect(result.status).toBe(503);
    expect(JSON.stringify(await result.json())).not.toContain("private database");
  });
});
