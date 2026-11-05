import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ session: vi.fn(), project: vi.fn(), member: vi.fn(), owner: vi.fn(), create: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getAuthenticatedProfile: mocks.session }));
vi.mock("@/lib/projects", () => ({ getProjectBySlug: mocks.project, isProjectMember: mocks.member, isProjectOwner: mocks.owner }));
vi.mock("@/lib/canvas/server", () => ({
  getProjectCanvasData: vi.fn(), createCanvasNode: mocks.create, updateCanvasNode: vi.fn(), deleteCanvasNode: vi.fn(),
  createCanvasEdge: vi.fn(), deleteCanvasEdge: mocks.remove, updateCanvasEdge: vi.fn(),
}));
import { POST } from "./route";

const context = () => ({ params: Promise.resolve({ slug: "launch" }) });
const post = (body: unknown) => POST(new NextRequest("http://localhost:3000/api/dashboard/projects/launch/canvas", { method: "POST", body: JSON.stringify(body) }), context());

beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ user: { id: "alice" } });
  mocks.project.mockResolvedValue({ id: "p1" });
  mocks.member.mockResolvedValue(true);
  mocks.owner.mockResolvedValue(false);
});

describe("canvas mutations", () => {
  it("does not report success when a card could not be created", async () => {
    mocks.create.mockResolvedValueOnce(null);
    const response = await post({ action: "create_node", id: "n1", title: "Lost" });
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ success: false, error: expect.any(String) });
  });

  it("returns the created card when it was stored", async () => {
    mocks.create.mockResolvedValueOnce({ id: "n1", title: "Kept" });
    const response = await post({ action: "create_node", id: "n1", title: "Kept" });
    expect(await response.json()).toEqual({ success: true, node: { id: "n1", title: "Kept" } });
  });

  it("requires authentication and membership", async () => {
    mocks.session.mockResolvedValueOnce(null);
    expect((await post({ action: "delete_edge", edge_id: "e" })).status).toBe(401);
    mocks.member.mockResolvedValueOnce(false);
    expect((await post({ action: "delete_edge", edge_id: "e" })).status).toBe(403);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
