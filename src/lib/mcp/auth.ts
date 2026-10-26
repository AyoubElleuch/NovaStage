import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const hashMcpToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const createMcpToken = () => `ns_mcp_${randomBytes(32).toString("hex")}`;

/** Access revocation must not wait for the general project membership cache. */
export async function hasMcpProjectAccess(projectId: string, userId: string) {
  const admin = createAdminClient();
  const [banned, member, owner] = await Promise.all([
    admin.from("project_banned_members").select("id").eq("project_id", projectId).eq("user_id", userId).maybeSingle(),
    admin.from("project_members").select("user_id").eq("project_id", projectId).eq("user_id", userId).maybeSingle(),
    admin.from("projects").select("created_by").eq("id", projectId).eq("created_by", userId).maybeSingle(),
  ]);
  return !banned.error && !member.error && !owner.error && !banned.data && Boolean(member.data || owner.data);
}

export async function authenticateMcp(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (ns_mcp_[a-f0-9]{64})$/i)?.[1];
  if (!token) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.from("canvas_mcp_connections")
    .select("id,project_id,user_id,expires_at").eq("token_hash", hashMcpToken(token)).maybeSingle();
  if (error) throw new Error("MCP connections are unavailable. Apply migration 023_canvas_mcp.sql.");
  if (!data || !Number.isFinite(Date.parse(data.expires_at)) || Date.parse(data.expires_at) <= Date.now()) return null;
  // Recheck membership on every request, including after a collaborator is removed.
  if (!await hasMcpProjectAccess(data.project_id, data.user_id)) return null;
  const { data: user } = await admin.auth.admin.getUserById(data.user_id);
  if (!user?.user || user.user.banned_until && Date.parse(user.user.banned_until) > Date.now()) return null;
  const { error: updateError } = await admin.from("canvas_mcp_connections")
    .update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  if (updateError) throw new Error("Unable to verify MCP connection.");
  return { projectId: data.project_id as string, userId: data.user_id as string };
}
