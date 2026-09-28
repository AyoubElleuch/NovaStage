import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardProjectsData } from "@/lib/dashboard-data";
import ProjectsWorkspace from "./projects-workspace";
import SettingsWorkspace from "./settings/settings-workspace";

const swrState = vi.hoisted(() => ({ result: {} as Record<string, unknown> }));
const revalidate = vi.hoisted(() => vi.fn());

vi.mock("swr", () => ({
  default: () => swrState.result,
  useSWRConfig: () => ({ mutate: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/components/notifications/notification-provider", () => ({
  useNotifications: () => ({ notify: vi.fn() }),
}));

beforeEach(() => {
  revalidate.mockClear();
  swrState.result = { data: undefined, error: new Error("offline"), isLoading: false, mutate: revalidate };
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", window.clearTimeout);
});

describe("user workspace recovery", () => {
  it("shows a retry instead of an empty projects page when loading fails", () => {
    render(<ProjectsWorkspace />);
    expect(screen.getByRole("alert").textContent).toContain("Projects could not load");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(revalidate).toHaveBeenCalledOnce();
  });

  it("shows a retry instead of blank account details when settings fail", () => {
    render(<SettingsWorkspace />);
    expect(screen.getByRole("alert").textContent).toContain("Settings could not load");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(revalidate).toHaveBeenCalledOnce();
  });

  it("uses the project's ten-member limit for cards and join approvals", async () => {
    const data: DashboardProjectsData = {
      userName: "Owner",
      projects: [{ id: "p1", slug: "alpha", name: "Alpha", role: "owner", updatedAt: "Today", members: 5, maxMembers: 10, pendingRequestsCount: 1 }],
    };
    swrState.result = { data, error: undefined, isLoading: false, mutate: revalidate };
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const body = url.includes("/members?")
        ? { success: true, members: Array.from({ length: 5 }, (_, index) => ({ userId: `u${index}`, role: index === 0 ? "owner" : "collaborator", fullName: `Member ${index}` })) }
        : url.includes("/requests?")
          ? { success: true, requests: [{ id: "r1", projectId: "p1", userId: "u5", status: "pending", fullName: "Applicant", createdAt: "Today" }] }
          : { success: true, bannedMembers: [] };
      return { ok: true, json: async () => body };
    }));

    render(<ProjectsWorkspace />);
    expect(screen.getByText("5/10 members")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "View 1 pending join requests" }));
    const approve = await screen.findByRole("button", { name: "Approve" });
    await waitFor(() => expect(approve.hasAttribute("disabled")).toBe(false));
  });

  it("ignores late member responses from a previously opened project", async () => {
    swrState.result = {
      data: {
        userName: "Owner",
        projects: [
          { id: "p1", slug: "alpha", name: "Alpha", role: "owner", updatedAt: "Today", members: 1, pendingRequestsCount: 1 },
          { id: "p2", slug: "beta", name: "Beta", role: "owner", updatedAt: "Today", members: 1, pendingRequestsCount: 2 },
        ],
      } satisfies DashboardProjectsData,
      error: undefined,
      isLoading: false,
      mutate: revalidate,
    };
    let resolveFirst!: (value: unknown) => void;
    const firstResponse = new Promise<unknown>((resolve) => { resolveFirst = resolve; });
    vi.stubGlobal("fetch", vi.fn((input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/members?projectId=p1")) return firstResponse;
      const body = url.includes("/members?")
        ? { success: true, members: [{ userId: "u2", role: "owner", fullName: "Beta Owner" }] }
        : url.includes("/requests?")
          ? { success: true, requests: [] }
          : { success: true, bannedMembers: [] };
      return Promise.resolve({ ok: true, json: async () => body });
    }));

    render(<ProjectsWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "View 1 pending join requests" }));
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    fireEvent.click(screen.getByRole("button", { name: "View 2 pending join requests" }));
    fireEvent.click(screen.getByRole("button", { name: "Members (0/5)" }));
    await screen.findByText("Beta Owner");

    await act(async () => {
      resolveFirst({ ok: true, json: async () => ({ success: true, members: [{ userId: "u1", role: "owner", fullName: "Alpha Owner" }] }) });
    });
    expect(screen.queryByText("Alpha Owner")).toBeNull();
    expect(screen.getByText("Beta Owner")).toBeDefined();
  });
});
