import { beforeEach, expect, it, vi } from "vitest";
import { requireCanvasAccess } from "./access";

const mocks = vi.hoisted(() => ({ session: vi.fn(), project: vi.fn(), member: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getAuthenticatedProfile: mocks.session }));
vi.mock("@/lib/projects", () => ({
  getProjectBySlug: mocks.project,
  isProjectMember: mocks.member,
}));
const context = () => ({ params: Promise.resolve({ slug: "demo" }) });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ user: { id: "user" } });
  mocks.project.mockResolvedValue({ id: "project" });
  mocks.member.mockResolvedValue(true);
});

it("rejects unauthenticated, missing and non-member access before mutations", async () => {
  mocks.session.mockResolvedValueOnce(null);
  expect((await requireCanvasAccess(context())).response?.status).toBe(401);
  expect(mocks.project).not.toHaveBeenCalled();
  mocks.project.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
  expect((await requireCanvasAccess(context())).response?.status).toBe(404);
  expect((await requireCanvasAccess(context(), 403)).response?.status).toBe(403);
  expect(mocks.member).not.toHaveBeenCalled();
  mocks.member.mockResolvedValueOnce(false);
  const denied = (await requireCanvasAccess(context())).response!;
  expect(denied.status).toBe(403);
  expect(await denied.json()).toEqual({ error: "Forbidden" });
});

it("returns the verified context and propagates lookup failures to the route", async () => {
  const access = await requireCanvasAccess(context());
  expect(access).toEqual({
    response: null,
    session: { user: { id: "user" } },
    project: { id: "project" },
  });
  expect(mocks.project).toHaveBeenCalledWith("demo");
  expect(mocks.member).toHaveBeenCalledWith("project", "user");
  mocks.member.mockRejectedValueOnce(new Error("Database unavailable"));
  await expect(requireCanvasAccess(context())).rejects.toThrow("Database unavailable");
});
