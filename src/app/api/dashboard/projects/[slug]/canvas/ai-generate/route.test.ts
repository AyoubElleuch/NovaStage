import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const mockRpc = vi.fn();
const mockSupabaseClient = {
  rpc: mockRpc,
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}));

vi.mock("@/lib/auth/session", () => ({
  getAuthenticatedProfile: vi.fn(async () => ({
    user: { id: "user-123", email: "alice@example.com" },
    profile: { id: "user-123", role: "developer" },
    roles: ["developer"],
    permissions: [],
  })),
}));

vi.mock("@/lib/projects", () => ({
  getProjectBySlug: vi.fn(async (slug: string) => {
    if (slug === "test-proj") {
      return { id: "proj-456", slug: "test-proj", title: "Test Project" };
    }
    return null;
  }),
  isProjectMember: vi.fn(async () => true),
}));

vi.mock("@/lib/canvas/server", () => ({
  getProjectCanvasData: vi.fn(async () => ({
    nodes: [],
    edges: [],
    claimRequests: [],
  })),
  applyAIWorkflowResult: vi.fn(async () => ({
    intent: "create_pipeline",
    summary: "Generated workflow",
    nodes: [],
    edges: [],
  })),
}));

vi.mock("@/lib/ai/pipeline", () => ({
  executeAIPipeline: vi.fn(async () => ({
    intent: "create_pipeline",
    summary: "Generated workflow",
    milestones: [],
    edges: [],
  })),
}));

describe("POST /api/dashboard/projects/[slug]/canvas/ai-generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully executes pipeline and invokes RPC functions with new signatures (no p_user_id)", async () => {
    mockRpc.mockImplementation(async (fnName: string) => {
      if (fnName === "acquire_project_ai_lock") {
        return { data: { success: true }, error: null };
      }
      if (fnName === "consume_user_ai_quota") {
        return {
          data: { success: true, requests_used: 1, requests_remaining: 9 },
          error: null,
        };
      }
      if (fnName === "release_project_ai_lock") {
        return { data: { success: true }, error: null };
      }
      return { data: null, error: null };
    });

    const req = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      body: JSON.stringify({ prompt: "Create a blog pipeline" }),
    });

    const res = await POST(req, { params: Promise.resolve({ slug: "test-proj" }) });
    expect(res.status).toBe(200);

    const resJson = await res.json();
    expect(resJson.success).toBe(true);

    // Verify acquire_project_ai_lock called with only p_project_id
    expect(mockRpc).toHaveBeenCalledWith("acquire_project_ai_lock", {
      p_project_id: "proj-456",
    });

    // Verify consume_user_ai_quota called with no args
    expect(mockRpc).toHaveBeenCalledWith("consume_user_ai_quota");

    // Verify release_project_ai_lock called with only p_project_id
    expect(mockRpc).toHaveBeenCalledWith("release_project_ai_lock", {
      p_project_id: "proj-456",
    });
  });

  it("handles quota exceeded error and does not consume quota or execute pipeline", async () => {
    mockRpc.mockImplementation(async (fnName: string) => {
      if (fnName === "acquire_project_ai_lock") {
        return { data: { success: true }, error: null };
      }
      if (fnName === "consume_user_ai_quota") {
        return {
          data: {
            success: false,
            error: "You have reached the limit of 10 AI generation requests.",
            requests_used: 10,
            requests_remaining: 0,
          },
          error: null,
        };
      }
      if (fnName === "release_project_ai_lock") {
        return { data: { success: true }, error: null };
      }
      return { data: null, error: null };
    });

    const req = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      body: JSON.stringify({ prompt: "Create an e-commerce workflow" }),
    });

    const res = await POST(req, { params: Promise.resolve({ slug: "test-proj" }) });
    expect(res.status).toBe(403);

    const resJson = await res.json();
    expect(resJson.error).toBe("QUOTA_EXCEEDED");

    // Lock was acquired and then released in finally
    expect(mockRpc).toHaveBeenCalledWith("acquire_project_ai_lock", {
      p_project_id: "proj-456",
    });
    expect(mockRpc).toHaveBeenCalledWith("release_project_ai_lock", {
      p_project_id: "proj-456",
    });
  });

  it("restores quota with parameterless restore_user_ai_quota on AI pipeline failure", async () => {
    const { executeAIPipeline } = await import("@/lib/ai/pipeline");
    vi.mocked(executeAIPipeline).mockRejectedValueOnce(new Error("Gemini quota exhausted"));

    mockRpc.mockImplementation(async (fnName: string) => {
      if (fnName === "acquire_project_ai_lock") {
        return { data: { success: true }, error: null };
      }
      if (fnName === "consume_user_ai_quota") {
        return {
          data: { success: true, requests_used: 5, requests_remaining: 5 },
          error: null,
        };
      }
      if (fnName === "restore_user_ai_quota") {
        return { data: { success: true }, error: null };
      }
      if (fnName === "release_project_ai_lock") {
        return { data: { success: true }, error: null };
      }
      return { data: null, error: null };
    });

    const req = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      body: JSON.stringify({ prompt: "Failing prompt" }),
    });

    const res = await POST(req, { params: Promise.resolve({ slug: "test-proj" }) });
    expect(res.status).toBe(502);

    // Verify restore_user_ai_quota called without arguments
    expect(mockRpc).toHaveBeenCalledWith("restore_user_ai_quota");

    // Verify lock released in finally
    expect(mockRpc).toHaveBeenCalledWith("release_project_ai_lock", {
      p_project_id: "proj-456",
    });
  });
});
