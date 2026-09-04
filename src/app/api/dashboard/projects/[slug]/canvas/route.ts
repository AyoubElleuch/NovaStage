import { NextRequest, NextResponse } from "next/server";
import { getProjectBySlug, isProjectMember, isProjectOwner } from "@/lib/projects";
import { getAuthenticatedProfile } from "@/lib/auth/session";
import {
  getProjectCanvasData,
  createCanvasNode,
  updateCanvasNode,
  deleteCanvasNode,
  createCanvasEdge,
  deleteCanvasEdge,
} from "@/lib/canvas/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getAuthenticatedProfile();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await context.params;
    const project = await getProjectBySlug(slug);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isMember = await isProjectMember(project.id, session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const canvasData = await getProjectCanvasData(project.id);
    return NextResponse.json({
      project: { id: project.id, slug: project.slug, name: project.name },
      ...canvasData,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Canvas GET API error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getAuthenticatedProfile();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await context.params;
    const project = await getProjectBySlug(slug);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isMember = await isProjectMember(project.id, session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    const isOwner = await isProjectOwner(project.id, session.user.id);

    if (action === "create_node") {
      const newNode = await createCanvasNode(
        project.id,
        {
          id: body.id,
          title: body.title || "New Milestone",
          description: body.description || "",
          position_x: body.position_x ?? 100,
          position_y: body.position_y ?? 100,
          width: body.width,
          height: body.height,
          checkpoints: body.checkpoints,
          node_type: body.node_type,
          aws_metadata: body.aws_metadata,
          group_metadata: body.group_metadata,
          annotation_metadata: body.annotation_metadata,
          parent_group_id: body.parent_group_id,
        },
        session.user.id
      );
      return NextResponse.json({ success: true, node: newNode });
    }

    if (action === "update_node") {
      const result = await updateCanvasNode(
        body.node_id,
        project.id,
        body.updates || {},
        session.user.id
      );
      return NextResponse.json(result);
    }

    if (action === "delete_node") {
      const result = await deleteCanvasNode(body.node_id, project.id, session.user.id, isOwner);
      return NextResponse.json(result);
    }

    if (action === "create_edge") {
      const newEdge = await createCanvasEdge(
        project.id,
        body.source_node_id,
        body.target_node_id,
        body.source_handle || "right",
        body.target_handle || "left",
        session.user.id,
        isOwner,
        body.edge_type
      );
      return NextResponse.json({ success: Boolean(newEdge), edge: newEdge });
    }

    if (action === "delete_edge") {
      const result = await deleteCanvasEdge(body.edge_id, project.id, session.user.id, isOwner);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    console.error("Canvas POST API error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
