import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicCanvasData, isCanvasShareToken } from "./shared-data";
import type { CanvasNode, CanvasEdge } from "./types";

export async function getSharedCanvas(token: string) {
  if (!isCanvasShareToken(token)) return null;
  const admin = createAdminClient();
  const { data: share, error } = await admin.from("canvas_shares")
    .select("project_id").eq("token", token).maybeSingle();
  if (error) throw new Error("Unable to load shared canvas");
  if (!share) return null;
  // Do not load projects, memberships, profiles, claims, or author identities.
  const [nodes, checkpoints, edges] = await Promise.all([
    admin.from("canvas_nodes").select("id,title,description,status,position_x,position_y,width,height,color,sort_order,node_type,aws_metadata,group_metadata,annotation_metadata,parent_group_id")
      .eq("project_id", share.project_id).order("sort_order").order("created_at"),
    admin.from("canvas_checkpoints").select("id,node_id,title,is_completed,sort_order")
      .eq("project_id", share.project_id).order("sort_order"),
    admin.from("canvas_edges").select("id,source_node_id,target_node_id,source_handle,target_handle,edge_type,label")
      .eq("project_id", share.project_id),
  ]);
  if (nodes.error || checkpoints.error || edges.error) throw new Error("Unable to load shared canvas");
  const byNode = new Map<string, NonNullable<typeof checkpoints.data>>();
  for (const cp of checkpoints.data || []) byNode.set(cp.node_id, [...(byNode.get(cp.node_id) || []), cp]);
  return publicCanvasData((nodes.data || []).map(node => ({
    ...node, position_x: Number(node.position_x), position_y: Number(node.position_y),
    width: Number(node.width), height: Number(node.height), checkpoints: byNode.get(node.id) || [],
  })) as CanvasNode[], (edges.data || []) as CanvasEdge[]);
}
