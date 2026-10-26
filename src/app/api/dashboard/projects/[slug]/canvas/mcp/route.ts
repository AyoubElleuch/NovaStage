import { getAuthenticatedUser } from "@/lib/auth/session";
import { getProjectBySlug } from "@/lib/projects";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMcpToken, hashMcpToken, hasMcpProjectAccess } from "@/lib/mcp/auth";
import { prepareWorkflow } from "@/lib/mcp/workflow";
import { getProjectCanvasData } from "@/lib/canvas/server";
import { buildMcpGraph } from "@/lib/mcp/graph";
import { checkRateLimitAsync } from "@/lib/security/rate-limit";
import { isSameOriginRequest } from "@/lib/security/request-origin";

type Context = { params: Promise<{ slug: string }> };
const reply = (body: unknown, status = 200) => Response.json(body, {
  status, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
});

async function handle(request: Request, context: Context) {
  try {
    if (!isSameOriginRequest(request, process.env.NEXT_PUBLIC_APP_URL)) return reply({ error: "Invalid request origin." }, 403);
    const user = await getAuthenticatedUser();
    if (!user) return reply({ error: "Unauthorized" }, 401);
    const { slug } = await context.params;
    const project = await getProjectBySlug(slug);
    if (!project || !await hasMcpProjectAccess(project.id, user.id)) return reply({ error: "Forbidden" }, 403);
    const admin = createAdminClient();
    if (request.method === "GET") {
      const [connection, drafts] = await Promise.all([
        admin.from("canvas_mcp_connections").select("expires_at,last_used_at").eq("project_id", project.id).eq("user_id", user.id).maybeSingle(),
        admin.from("canvas_mcp_drafts").select("id,prompt,mode,status,workflow,validation,created_at")
          .eq("project_id", project.id).eq("user_id", user.id).in("status", ["pending", "ready", "applying", "failed"])
          .order("created_at", { ascending: false }).limit(10),
      ]);
      if (connection.error || drafts.error) throw new Error("MCP is unavailable. Apply database migration 023_canvas_mcp.sql.");
      return reply({ connection: connection.data, drafts: drafts.data || [] });
    }
    if (request.method === "DELETE") {
      const { error } = await admin.from("canvas_mcp_connections").delete().eq("project_id", project.id).eq("user_id", user.id);
      if (error) throw error;
      return reply({ success: true });
    }
    const limit = await checkRateLimitAsync(`mcp-manage:${user.id}`, { maxAttempts: 30, windowSeconds: 60 });
    if (!limit.allowed) return reply({ error: "Too many requests. Try again shortly." }, 429);
    const body = await request.json().catch(() => null);
    if (body?.action === "connect") {
      const token = createMcpToken();
      const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
      const { error } = await admin.from("canvas_mcp_connections").upsert({
        project_id: project.id, user_id: user.id, token_hash: hashMcpToken(token), expires_at: expiresAt, last_used_at: null,
      }, { onConflict: "project_id,user_id" });
      if (error) throw new Error("MCP is unavailable. Apply database migration 023_canvas_mcp.sql.");
      return reply({ token, expiresAt });
    }
    if (body?.action === "request") {
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt || prompt.length > 8000 || !["workflow", "aws_architecture", "full_stack"].includes(body.mode)) return reply({ error: "Enter a prompt of up to 8,000 characters and a valid mode." }, 400);
      const { data: connection } = await admin.from("canvas_mcp_connections").select("id")
        .eq("project_id", project.id).eq("user_id", user.id).gt("expires_at", new Date().toISOString()).maybeSingle();
      if (!connection) return reply({ error: "Create an MCP connection first." }, 409);
      const { error } = await admin.from("canvas_mcp_drafts").insert({ project_id: project.id, user_id: user.id, prompt, mode: body.mode });
      if (error) throw error;
      return reply({ success: true });
    }
    if (!["apply", "dismiss"].includes(body?.action) || typeof body.id !== "string") return reply({ error: "Invalid action." }, 400);
    if (body.action === "dismiss") {
      const { error } = await admin.from("canvas_mcp_drafts").update({ status: "dismissed" })
        .eq("id", body.id).eq("project_id", project.id).eq("user_id", user.id).in("status", ["pending", "ready", "failed"]);
      if (error) throw error;
      return reply({ success: true });
    }

    const { data: draft, error } = await admin.from("canvas_mcp_drafts").select("workflow")
      .eq("id", body.id).eq("project_id", project.id).eq("user_id", user.id).eq("status", "ready").maybeSingle();
    if (error) throw error;
    if (!draft) return reply({ error: "This draft is no longer available." }, 409);
    const { workflow } = prepareWorkflow(draft.workflow);
    const current = await getProjectCanvasData(project.id);
    const graph = buildMcpGraph(workflow, current.nodes);
    // The RPC locks the draft and project rows, checks membership and generation,
    // then commits all nodes, tasks, edges, and acceptance together (or none).
    const { error: applyError } = await admin.rpc("apply_canvas_mcp_draft", {
      p_draft_id: body.id, p_user_id: user.id, p_graph: graph,
    });
    if (applyError) return reply({ error: "The draft could not be applied. Nothing was saved. Refresh and try again when the canvas is idle." }, 409);
    return reply({ success: true });
  } catch (error) {
    console.error("MCP canvas request failed", error);
    return reply({ error: "Canvas connections are unavailable. Check that migration 023_canvas_mcp.sql is installed and try again." }, 503);
  }
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
