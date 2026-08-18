export type NodeStatus = "draft" | "in_progress" | "blocked" | "completed";

export type HandlePosition = "top" | "right" | "bottom" | "left";

export type CanvasTool = "select" | "hand" | "add_node" | "link";

export interface CanvasCheckpoint {
  id: string;
  node_id: string;
  project_id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
  completed_at?: string | null;
  completed_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClaimInfo {
  userId: string;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  claimedAt: string;
  expiresAt: string;
}

export interface CanvasNode {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: NodeStatus;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  color: string;
  sort_order: number;
  claimed_by: string | null;
  claimed_at?: string | null;
  claim_expires_at?: string | null;
  claim_holder?: {
    id: string;
    email?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
  } | null;
  version: number;
  checkpoints: CanvasCheckpoint[];
  created_at?: string;
  updated_at?: string;
}

export interface CanvasEdge {
  id: string;
  project_id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle: HandlePosition;
  target_handle: HandlePosition;
  created_at?: string;
}

export interface CanvasClaimRequest {
  id: string;
  project_id: string;
  node_id: string;
  node_title?: string;
  requester_id: string;
  requester_name?: string;
  requester_avatar?: string;
  current_holder_id: string;
  status: "pending" | "granted" | "declined" | "expired";
  created_at: string;
  resolved_at?: string | null;
}

export type CanvasNetworkStatus = "online" | "slow" | "reconnecting" | "offline";

export interface CollaboratorPresence {
  userId: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  color: string;
  cursor?: { x: number; y: number } | null;
  selectedNodeId?: string | null;
  lastActive: number;
  latencyMs?: number | null;
  isIdle?: boolean;
}

export interface CursorBroadcastPayload {
  userId: string;
  cursor: { x: number; y: number } | null;
  t: number;
  vx?: number;
  vy?: number;
}

export interface ClaimChangeBroadcastPayload {
  nodeId: string;
  claimedBy: string | null;
  claimHolder: {
    id: string;
    email?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
  } | null;
  expiresAt: string | null;
  action: "claim" | "release" | "force_unlock" | "transfer";
}

export interface NodeUpdateBroadcastPayload {
  nodeId: string;
  updates: Partial<CanvasNode>;
}

export interface CheckpointToggleBroadcastPayload {
  nodeId: string;
  checkpointId: string;
  isCompleted: boolean;
  newStatus?: NodeStatus;
  completedBy?: string | null;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasGraphData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  claimRequests?: CanvasClaimRequest[];
}
