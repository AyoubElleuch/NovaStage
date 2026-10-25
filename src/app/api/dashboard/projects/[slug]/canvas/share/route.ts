import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getProjectBySlug, isProjectOwner } from "@/lib/projects";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSameOriginRequest } from "@/lib/security/request-origin";

type Context = { params: Promise<{ slug: string }> };
const response = (body: unknown, status = 200) => NextResponse.json(body, {
  status, headers: { "Cache-Control": "private, no-store" },
});

async function manage(request: NextRequest, context: Context) {
  try {
    if (request.method !== "GET" && !isSameOriginRequest(request, process.env.NEXT_PUBLIC_APP_URL)) {
      return response({ error: "Please reload this page and try again." }, 403);
    }
    const user = await getAuthenticatedUser();
    if (!user) return response({ error: "Unauthorized" }, 401);
    const { slug } = await context.params;
    const project = await getProjectBySlug(slug);
    if (!project || !await isProjectOwner(project.id, user.id)) return response({ error: "Forbidden" }, 403);
    const admin = createAdminClient();
    if (request.method === "DELETE") {
      const { error } = await admin.from("canvas_shares").delete().eq("project_id", project.id);
      if (error) throw error;
      return response({ token: null });
    }
    if (request.method === "POST") {
      // Upsert preserves the existing link, including simultaneous create requests.
      const { error } = await admin.from("canvas_shares").upsert({
        project_id: project.id, token: randomBytes(32).toString("hex"),
      }, { onConflict: "project_id", ignoreDuplicates: true });
      if (error) throw error;
    }
    const { data, error } = await admin.from("canvas_shares").select("token")
      .eq("project_id", project.id).maybeSingle();
    if (error) throw error;
    return response({ token: data?.token || null });
  } catch {
    return response({ error: "Canvas sharing is unavailable. Please try again." }, 503);
  }
}

export const GET = manage;
export const POST = manage;
export const DELETE = manage;
