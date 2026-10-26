import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const hashMcpToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const createMcpToken = () => `ns_mcp_${randomBytes(32).toString("hex")}`;
const HANDOFF_TTL = 15 * 60 * 1000;
const handoffSignature = (payload: string) => {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing server credential for desktop handoffs.");
  return createHmac("sha256", secret).update(`novastage-desktop-handoff-v1.${payload}`).digest();
};

/** Signed, short-lived capability tied to an owned pending draft; never a durable client credential. */
export function createHandoffToken(requestId: string) {
  const expiresAt = new Date(Date.now() + HANDOFF_TTL).toISOString();
  const payload = Buffer.from(JSON.stringify({ id: requestId, exp: Date.parse(expiresAt), nonce: randomBytes(16).toString("hex") })).toString("base64url");
  return { token: `ns_handoff_${payload}.${handoffSignature(payload).toString("base64url")}`, expiresAt };
}

function readHandoffToken(token: string): string | null {
  const match = token.match(/^ns_handoff_([a-zA-Z0-9_-]{1,512})\.([a-zA-Z0-9_-]{43})$/);
  if (!match) return null;
  const expected = handoffSignature(match[1]), actual = Buffer.from(match[2], "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(match[1], "base64url").toString("utf8"));
    if (typeof payload.id !== "string" || !/^[a-f0-9-]{36}$/i.test(payload.id) ||
      !Number.isSafeInteger(payload.exp) || payload.exp <= Date.now() || payload.exp > Date.now() + HANDOFF_TTL) return null;
    return payload.id;
  } catch { return null; }
}

export interface McpScope { projectId: string; userId: string; requestId?: string }

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

export async function authenticateMcp(request: Request): Promise<McpScope | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer (\S{1,1024})$/i)?.[1];
  if (!token) return null;
  const handoff = token.startsWith("ns_handoff_");
  const requestId = handoff ? readHandoffToken(token) : null;
  if (handoff ? !requestId : !/^ns_mcp_[a-f0-9]{64}$/.test(token)) return null;
  const admin = createAdminClient();
  const { data, error } = handoff
    ? await admin.from("canvas_mcp_drafts").select("id,project_id,user_id,status")
      .eq("id", requestId).eq("status", "pending").maybeSingle()
    : await admin.from("canvas_mcp_connections")
      .select("id,project_id,user_id,expires_at").eq("token_hash", hashMcpToken(token)).maybeSingle();
  if (error) throw new Error("MCP connections are unavailable. Apply migration 023_canvas_mcp.sql.");
  if (!data) return null;
  if (handoff) {
    if (!("status" in data) || data.status !== "pending") return null;
  } else if (!("expires_at" in data) || !Number.isFinite(Date.parse(data.expires_at)) || Date.parse(data.expires_at) <= Date.now()) return null;
  // Recheck membership on every request, including after a collaborator is removed.
  if (!await hasMcpProjectAccess(data.project_id, data.user_id)) return null;
  const { data: user } = await admin.auth.admin.getUserById(data.user_id);
  if (!user?.user || user.user.banned_until && Date.parse(user.user.banned_until) > Date.now()) return null;
  if (!handoff) {
    const { error: updateError } = await admin.from("canvas_mcp_connections")
      .update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
    if (updateError) throw new Error("Unable to verify MCP connection.");
  }
  return { projectId: data.project_id as string, userId: data.user_id as string, ...(handoff ? { requestId: data.id as string } : {}) };
}
