"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  CanvasNode,
  CanvasEdge,
  CanvasCheckpoint,
  CanvasClaimRequest,
  CanvasTool,
  CanvasViewport,
  CollaboratorPresence,
  HandlePosition,
  CanvasNetworkStatus,
} from "@/lib/canvas/types";
import {
  snapToGrid,
  getUserColor,
  getNodeHandlePosition,
  canConnectMilestones,
} from "@/lib/canvas/coordinate-math";
import { autoLayoutNodes } from "@/lib/canvas/auto-layout";
import CanvasViewportContainer from "@/components/canvas/canvas-viewport";
import CanvasNodeComponent from "@/components/canvas/canvas-node";
import CanvasEdgeLayer from "@/components/canvas/canvas-edge-layer";
import CanvasDock from "@/components/canvas/canvas-dock";
import CanvasDrawer from "@/components/canvas/canvas-drawer";
import CanvasHud from "@/components/canvas/canvas-hud";
import CanvasCursors from "@/components/canvas/canvas-cursors";
import CanvasClaimModal from "@/components/canvas/canvas-claim-modal";
import { useNotifications } from "@/components/notifications/notification-provider";

interface ProjectCanvasClientProps {
  project: {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    invite_code?: string;
    created_by?: string | null;
  };
  initialNodes: CanvasNode[];
  initialEdges: CanvasEdge[];
  initialClaimRequests: CanvasClaimRequest[];
  currentUser: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string | null;
  };
  isOwner: boolean;
}

type DragState = {
  nodeId: string;
  startPos: { x: number; y: number };
  pointerStartScreen: { x: number; y: number };
  lastPosition: { x: number; y: number };
};

type DraftEdgeState = {
  sourceNode: CanvasNode;
  sourceHandle: HandlePosition;
  currentPos: { x: number; y: number };
};

export default function ProjectCanvasClient({
  project,
  initialNodes,
  initialEdges,
  currentUser,
  isOwner,
}: ProjectCanvasClientProps) {
  const router = useRouter();
  const { notify } = useNotifications();
  const supabase = useMemo(() => createClient(), []);
  const canvasChannelRef = useRef<RealtimeChannel | null>(null);
  const [isEvicted, setIsEvicted] = useState(false);

  const handleEviction = useCallback(() => {
    setIsEvicted(true);
    notify({
      tone: "error",
      title: "Access Revoked",
      message: "You have been removed from this project by the owner. Redirecting to workspace...",
    });
    if (canvasChannelRef.current) {
      try {
        supabase.removeChannel(canvasChannelRef.current);
      } catch {}
      canvasChannelRef.current = null;
    }
    // Hard redirect immediately to projects dashboard
    window.location.replace("/dashboard");
  }, [notify, supabase]);

  // Core Canvas State
  const [nodes, setNodes] = useState<CanvasNode[]>(initialNodes);
  const [edges, setEdges] = useState<CanvasEdge[]>(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");
  const [snapGrid, setSnapGrid] = useState(true);

  // Network & Connection Quality State
  const [networkStatus, setNetworkStatus] = useState<CanvasNetworkStatus>("online");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const lastOutboundCursorTimeRef = useRef<number>(0);
  const lastOutboundPosRef = useRef<{ x: number; y: number } | null>(null);

  // Viewport State
  const [viewport, setViewport] = useState<CanvasViewport>({
    x: 100,
    y: 100,
    zoom: 1.0,
  });

  // Dragging & Linking State
  const [draggingNode, setDraggingNode] = useState<DragState | null>(null);
  const draggingNodeRef = useRef<DragState | null>(null);

  const [draftEdge, setDraftEdge] = useState<DraftEdgeState | null>(null);
  const draftEdgeRef = useRef<DraftEdgeState | null>(null);

  // Multiplayer Presence & Claims State
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [incomingClaimModal, setIncomingClaimModal] = useState<CanvasClaimRequest | null>(null);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  // ---------------------------------------------------------------------------
  // Canvas CRUD & Concurrency Methods (Declared early for hooks)
  // ---------------------------------------------------------------------------

  // Broadcast Helper to notify peers immediately over Realtime channel
  const broadcastEvent = useCallback((event: string, payload: unknown) => {
    try {
      canvasChannelRef.current?.send({
        type: "broadcast",
        event,
        payload,
      });
    } catch (e) {
      console.warn("Failed to broadcast canvas event:", e);
    }
  }, []);

  // Secure fetch helper that immediately triggers eviction if user lost access
  const secureFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await fetch(input, init);
      if (res.status === 401 || res.status === 403) {
        handleEviction();
        throw new Error("Access Revoked");
      }
      return res;
    },
    [handleEviction]
  );

  // Resync full canvas state on reconnection
  const resyncCanvasState = useCallback(async () => {
    try {
      const res = await secureFetch(`/api/dashboard/projects/${project.slug}/canvas`);
      if (res.ok) {
        const data = await res.json();
        if (data.nodes) setNodes(data.nodes);
        if (data.edges) setEdges(data.edges);
        notify({ title: "Canvas Synced", message: "Refreshed latest roadmap changes" });
      }
    } catch (e) {
      console.warn("Failed to resync canvas state:", e);
    }
  }, [notify, project.slug, secureFetch]);

  // Add Milestone Box
  const handleAddNode = useCallback(
    async (customPos?: { x: number; y: number }) => {
      const posX = customPos ? customPos.x : (400 - viewport.x) / viewport.zoom;
      const posY = customPos ? customPos.y : (250 - viewport.y) / viewport.zoom;

      const stepNum = nodes.length + 1;
      const defaultTitle = `Milestone Step ${stepNum}`;

      try {
        const res = await secureFetch(`/api/dashboard/projects/${project.slug}/canvas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_node",
            title: defaultTitle,
            position_x: snapGrid ? snapToGrid(posX) : posX,
            position_y: snapGrid ? snapToGrid(posY) : posY,
            checkpoints: [],
          }),
        });

        const data = await res.json();
        if (data.success && data.node) {
          setNodes((prev) => [...prev, data.node]);
          setSelectedNodeId(data.node.id);
          broadcastEvent("node:created", { node: data.node });
          notify({ title: "Milestone Created", message: `Added "${data.node.title}" to canvas` });
        }
      } catch {
        notify({ tone: "error", title: "Error", message: "Failed to create milestone box" });
      }
    },
    [broadcastEvent, nodes.length, notify, project.slug, secureFetch, snapGrid, viewport.x, viewport.y, viewport.zoom]
  );

  // Update Milestone Content
  const handleUpdateNode = useCallback(
    async (nodeId: string, updates: Partial<CanvasNode>) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, ...updates } : n))
      );

      // Instant broadcast to collaborators
      broadcastEvent("node:updated", { nodeId, updates });

      try {
        await secureFetch(`/api/dashboard/projects/${project.slug}/canvas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_node",
            node_id: nodeId,
            updates,
          }),
        });
      } catch (e) {
        console.error("Failed to update node:", e);
      }
    },
    [broadcastEvent, project.slug, secureFetch]
  );

  // Delete Milestone Box
  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      const target = nodes.find((n) => n.id === nodeId);
      if (target && target.claimed_by !== currentUser.id && !isOwner) {
        notify({ tone: "error", title: "Action Denied", message: "You must claim this milestone box to delete it" });
        return;
      }

      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) =>
        prev.filter((e) => e.source_node_id !== nodeId && e.target_node_id !== nodeId)
      );
      setSelectedNodeId((current) => (current === nodeId ? null : current));

      broadcastEvent("node:deleted", { nodeId });

      try {
        await secureFetch(`/api/dashboard/projects/${project.slug}/canvas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete_node", node_id: nodeId }),
        });
        notify({ title: "Milestone Deleted" });
      } catch (e) {
        console.error("Failed to delete node:", e);
      }
    },
    [broadcastEvent, currentUser.id, isOwner, nodes, notify, project.slug, secureFetch]
  );

  // Toggle Checkpoint Checkbox
  const handleToggleCheckpoint = useCallback(
    async (checkpointId: string, nodeId: string, nextCompleted: boolean) => {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== nodeId) return n;
          const updatedCps = n.checkpoints.map((cp) =>
            cp.id === checkpointId ? { ...cp, is_completed: nextCompleted } : cp
          );
          const allDone = updatedCps.every((c) => c.is_completed);
          const anyDone = updatedCps.some((c) => c.is_completed);
          const nextStatus = allDone ? "completed" : anyDone ? "in_progress" : "draft";

          return {
            ...n,
            checkpoints: updatedCps,
            status: nextStatus,
          };
        })
      );

      // Fast broadcast to all peers
      broadcastEvent("checkpoint:toggled", {
        nodeId,
        checkpointId,
        isCompleted: nextCompleted,
      });

      try {
        const res = await secureFetch(
          `/api/dashboard/projects/${project.slug}/canvas/checkpoints`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "toggle",
              node_id: nodeId,
              checkpoint_id: checkpointId,
              is_completed: nextCompleted,
            }),
          }
        );

        if (!res.ok) {
          const err = await res.json();
          notify({ tone: "error", title: "Action Failed", message: err.error });
        }
      } catch (e) {
        console.error("Failed to toggle checkpoint:", e);
      }
    },
    [broadcastEvent, notify, project.slug, secureFetch]
  );

  // Add Checkpoint
  const handleAddCheckpoint = useCallback(
    async (nodeId: string, title: string) => {
      try {
        const res = await secureFetch(
          `/api/dashboard/projects/${project.slug}/canvas/checkpoints`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "add",
              node_id: nodeId,
              title,
            }),
          }
        );
        const data = await res.json();
        if (data.success && data.checkpoint) {
          setNodes((prev) =>
            prev.map((n) =>
              n.id === nodeId
                ? { ...n, checkpoints: [...n.checkpoints, data.checkpoint] }
                : n
            )
          );
          broadcastEvent("checkpoint:added", { nodeId, checkpoint: data.checkpoint });
        }
      } catch (e) {
        console.error("Failed to add checkpoint:", e);
      }
    },
    [broadcastEvent, project.slug, secureFetch]
  );

  // Delete Checkpoint
  const handleDeleteCheckpoint = useCallback(
    async (checkpointId: string, nodeId: string) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, checkpoints: n.checkpoints.filter((c) => c.id !== checkpointId) }
            : n
        )
      );

      broadcastEvent("checkpoint:deleted", { nodeId, checkpointId });

      try {
        await secureFetch(`/api/dashboard/projects/${project.slug}/canvas/checkpoints`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            node_id: nodeId,
            checkpoint_id: checkpointId,
          }),
        });
      } catch (e) {
        console.error("Failed to delete checkpoint:", e);
      }
    },
    [broadcastEvent, project.slug, secureFetch]
  );

  // Claim Methods with instant peer broadcast
  const handleClaimNode = useCallback(
    async (nodeId: string) => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const myHolder = {
        id: currentUser.id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        avatarUrl: currentUser.avatarUrl,
      };

      // Optimistic instant local update
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                claimed_by: currentUser.id,
                claim_holder: myHolder,
                claim_expires_at: expiresAt,
              }
            : n
        )
      );

      // Instant broadcast to peers
      broadcastEvent("claim:changed", {
        nodeId,
        claimedBy: currentUser.id,
        claimHolder: myHolder,
        expiresAt,
        action: "claim",
      });

      try {
        const res = await secureFetch(`/api/dashboard/projects/${project.slug}/canvas/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "claim", node_id: nodeId }),
        });

        const data = await res.json();
        if (data.success) {
          notify({ title: "Claim Acquired", message: "You now have exclusive edit lock" });
        } else {
          // Revert optimistic update on collision/error
          resyncCanvasState();
          notify({ tone: "error", title: "Claim Failed", message: data.error });
        }
      } catch (e) {
        console.error("Failed to claim node:", e);
        resyncCanvasState();
      }
    },
    [broadcastEvent, currentUser.avatarUrl, currentUser.email, currentUser.fullName, currentUser.id, notify, project.slug, resyncCanvasState, secureFetch]
  );

  const handleReleaseNode = useCallback(
    async (nodeId: string) => {
      // Optimistic instant local release
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, claimed_by: null, claim_holder: null, claim_expires_at: null }
            : n
        )
      );

      // Instant broadcast to peers so they see it released in real time
      broadcastEvent("claim:changed", {
        nodeId,
        claimedBy: null,
        claimHolder: null,
        expiresAt: null,
        action: "release",
      });

      try {
        await secureFetch(`/api/dashboard/projects/${project.slug}/canvas/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "release", node_id: nodeId }),
        });
        notify({ title: "Claim Released", message: "Milestone is now free for collaborators" });
      } catch (e) {
        console.error("Failed to release claim:", e);
        resyncCanvasState();
      }
    },
    [broadcastEvent, notify, project.slug, resyncCanvasState, secureFetch]
  );

  const handleRequestClaim = useCallback(
    async (node: CanvasNode) => {
      if (!node.claimed_by) {
        handleClaimNode(node.id);
        return;
      }

      try {
        const res = await secureFetch(`/api/dashboard/projects/${project.slug}/canvas/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "request_claim", node_id: node.id }),
        });

        const data = await res.json();
        if (data.success) {
          broadcastEvent("claim:requested", {
            id: data.request?.id,
            node_id: node.id,
            node_title: node.title,
            requester_id: currentUser.id,
            requester_name: currentUser.fullName,
            current_holder_id: node.claimed_by,
          });

          notify({
            title: "Claim Requested",
            message: `Sent edit handoff request to ${node.claim_holder?.fullName || "the editor"}.`,
          });
        } else {
          notify({ tone: "error", title: "Request Failed", message: data.error });
        }
      } catch (e) {
        console.error("Failed to request claim:", e);
      }
    },
    [broadcastEvent, currentUser.fullName, currentUser.id, handleClaimNode, notify, project.slug, secureFetch]
  );

  const handleResolveClaimRequest = useCallback(
    async (requestId: string, accept: boolean) => {
      try {
        const res = await secureFetch(`/api/dashboard/projects/${project.slug}/canvas/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "resolve_claim",
            request_id: requestId,
            accept,
          }),
        });

        const data = await res.json();
        if (data.success) {
          if (accept && incomingClaimModal) {
            const newHolder = {
              id: incomingClaimModal.requester_id,
              fullName: incomingClaimModal.requester_name || "Collaborator",
              email: "",
              avatarUrl: null,
            };

            broadcastEvent("claim:changed", {
              nodeId: incomingClaimModal.node_id,
              claimedBy: incomingClaimModal.requester_id,
              claimHolder: newHolder,
              expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
              action: "transfer",
            });

            setNodes((prev) =>
              prev.map((n) =>
                n.id === incomingClaimModal.node_id
                  ? {
                      ...n,
                      claimed_by: incomingClaimModal.requester_id,
                      claim_holder: newHolder,
                    }
                  : n
              )
            );
          }

          setIncomingClaimModal(null);
          notify({
            title: accept ? "Claim Granted" : "Claim Request Declined",
            message: accept ? "Transferred edit lock to collaborator" : undefined,
          });
        }
      } catch (e) {
        console.error("Failed to resolve claim:", e);
      }
    },
    [broadcastEvent, incomingClaimModal, notify, project.slug, secureFetch]
  );

  const handleForceUnlock = useCallback(
    async (nodeId: string) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, claimed_by: null, claim_holder: null, claim_expires_at: null }
            : n
        )
      );

      broadcastEvent("claim:changed", {
        nodeId,
        claimedBy: null,
        claimHolder: null,
        expiresAt: null,
        action: "force_unlock",
      });

      try {
        await secureFetch(`/api/dashboard/projects/${project.slug}/canvas/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "force_unlock", node_id: nodeId }),
        });
        notify({ title: "Milestone Unlocked", message: "Owner override applied" });
      } catch (e) {
        console.error("Failed to force unlock:", e);
      }
    },
    [broadcastEvent, notify, project.slug, secureFetch]
  );

  // ---------------------------------------------------------------------------
  // 1. Supabase Realtime Subscription & Network Health Monitoring
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const channelName = `project-canvas:${project.id}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: currentUser.id },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const activeCollaborators: CollaboratorPresence[] = [];

        for (const [key, presences] of Object.entries(state)) {
          const p = (presences as unknown as Array<{
            email?: string;
            fullName?: string;
            avatarUrl?: string | null;
            cursor?: { x: number; y: number } | null;
            selectedNodeId?: string | null;
          }>)[0];
          if (p) {
            activeCollaborators.push({
              userId: key,
              email: p.email || "",
              fullName: p.fullName || p.email?.split("@")[0] || "Collaborator",
              avatarUrl: p.avatarUrl || null,
              color: getUserColor(key),
              cursor: p.cursor || null,
              selectedNodeId: p.selectedNodeId || null,
              lastActive: Date.now(),
            });
          }
        }
        setCollaborators(activeCollaborators);
      })
      .on("broadcast", { event: "cursor" }, ({ payload }) => {
        setCollaborators((prev) =>
          prev.map((c) =>
            c.userId === payload.userId ? { ...c, cursor: payload.cursor } : c
          )
        );
      })
      .on("broadcast", { event: "claim:changed" }, ({ payload }) => {
        // Instant visual update when someone claims or releases a node
        setNodes((prev) =>
          prev.map((n) =>
            n.id === payload.nodeId
              ? {
                  ...n,
                  claimed_by: payload.claimedBy,
                  claim_holder: payload.claimHolder,
                  claim_expires_at: payload.expiresAt,
                }
              : n
          )
        );

        if (payload.action === "release" && payload.claimedBy === null) {
          // If collaborator released, notify quietly if viewing
          setNodes((prev) =>
            prev.map((n) =>
              n.id === payload.nodeId
                ? { ...n, claimed_by: null, claim_holder: null }
                : n
            )
          );
        }
      })
      .on("broadcast", { event: "node:updated" }, ({ payload }) => {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === payload.nodeId ? { ...n, ...payload.updates } : n
          )
        );
      })
      .on("broadcast", { event: "node:drag" }, ({ payload }) => {
        setNodes((prev) =>
          prev.map((n) =>
            n.id === payload.nodeId
              ? { ...n, position_x: payload.x, position_y: payload.y }
              : n
          )
        );
      })
      .on("broadcast", { event: "checkpoint:toggled" }, ({ payload }) => {
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id !== payload.nodeId) return n;
            const updatedCps = n.checkpoints.map((cp) =>
              cp.id === payload.checkpointId
                ? { ...cp, is_completed: payload.isCompleted }
                : cp
            );
            const allDone = updatedCps.every((c) => c.is_completed);
            const anyDone = updatedCps.some((c) => c.is_completed);
            const nextStatus = allDone ? "completed" : anyDone ? "in_progress" : "draft";

            return {
              ...n,
              checkpoints: updatedCps,
              status: nextStatus,
            };
          })
        );
      })
      .on("broadcast", { event: "ping" }, ({ payload }) => {
        if (payload.senderId === currentUser.id) {
          const rtt = Math.round(Date.now() - payload.t);
          setLatencyMs(rtt);
          setNetworkStatus(rtt > 250 ? "slow" : "online");
        }
      })
      .on("broadcast", { event: "claim:requested" }, ({ payload }) => {
        if (payload.current_holder_id === currentUser.id) {
          setIncomingClaimModal(payload);
          notify({
            title: "Edit Claim Requested",
            message: `${payload.requester_name || "A collaborator"} wants to edit "${payload.node_title || "Milestone"}"`,
          });
        }
      })
      .on("broadcast", { event: "edge:created" }, ({ payload }) => {
        if (payload?.edge) {
          const newEdge = payload.edge as CanvasEdge;
          setEdges((prev) => {
            if (prev.some((e) => e.id === newEdge.id)) return prev;
            return [...prev, newEdge];
          });
        }
      })
      .on("broadcast", { event: "edge:deleted" }, ({ payload }) => {
        if (payload?.edgeId) {
          setEdges((prev) => prev.filter((e) => e.id !== payload.edgeId));
        }
      })
      .on("broadcast", { event: "node:created" }, ({ payload }) => {
        if (payload?.node) {
          const newNode = payload.node as CanvasNode;
          setNodes((prev) => {
            if (prev.some((n) => n.id === newNode.id)) return prev;
            return [...prev, { ...newNode, checkpoints: newNode.checkpoints || [] }];
          });
        }
      })
      .on("broadcast", { event: "node:deleted" }, ({ payload }) => {
        if (payload?.nodeId) {
          setNodes((prev) => prev.filter((n) => n.id !== payload.nodeId));
          setEdges((prev) =>
            prev.filter(
              (e) =>
                e.source_node_id !== payload.nodeId &&
                e.target_node_id !== payload.nodeId
            )
          );
        }
      })
      .on("broadcast", { event: "checkpoint:added" }, ({ payload }) => {
        if (payload?.nodeId && payload?.checkpoint) {
          setNodes((prev) =>
            prev.map((n) =>
              n.id === payload.nodeId
                ? {
                    ...n,
                    checkpoints: n.checkpoints.some((c) => c.id === payload.checkpoint.id)
                      ? n.checkpoints
                      : [...n.checkpoints, payload.checkpoint],
                  }
                : n
            )
          );
        }
      })
      .on("broadcast", { event: "checkpoint:deleted" }, ({ payload }) => {
        if (payload?.nodeId && payload?.checkpointId) {
          setNodes((prev) =>
            prev.map((n) =>
              n.id === payload.nodeId
                ? {
                    ...n,
                    checkpoints: n.checkpoints.filter((c) => c.id !== payload.checkpointId),
                  }
                : n
            )
          );
        }
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "canvas_nodes", filter: `project_id=eq.${project.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newNode = payload.new as CanvasNode;
            setNodes((prev) => {
              if (prev.some((n) => n.id === newNode.id)) return prev;
              return [...prev, { ...newNode, checkpoints: [] }];
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as CanvasNode;
            setNodes((prev) =>
              prev.map((n) => {
                if (n.id !== updated.id) return n;
                return {
                  ...n,
                  ...updated,
                  position_x: Number(updated.position_x ?? n.position_x),
                  position_y: Number(updated.position_y ?? n.position_y),
                  // Deep-merge to preserve checkpoints & profile
                  checkpoints: updated.checkpoints || n.checkpoints,
                  claim_holder:
                    updated.claimed_by === null
                      ? null
                      : updated.claimed_by === n.claimed_by
                      ? n.claim_holder
                      : n.claim_holder,
                };
              })
            );
          } else if (payload.eventType === "DELETE") {
            setNodes((prev) => prev.filter((n) => n.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "canvas_edges", filter: `project_id=eq.${project.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newEdge = payload.new as CanvasEdge;
            setEdges((prev) => {
              if (prev.some((e) => e.id === newEdge.id)) return prev;
              return [...prev, newEdge];
            });
          } else if (payload.eventType === "DELETE") {
            setEdges((prev) => prev.filter((e) => e.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "canvas_checkpoints", filter: `project_id=eq.${project.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newCp = payload.new as CanvasCheckpoint;
            setNodes((prev) =>
              prev.map((n) =>
                n.id === newCp.node_id
                  ? {
                      ...n,
                      checkpoints: n.checkpoints.some((c) => c.id === newCp.id)
                        ? n.checkpoints
                        : [...n.checkpoints, newCp],
                    }
                  : n
              )
            );
          } else if (payload.eventType === "UPDATE") {
            const updatedCp = payload.new as CanvasCheckpoint;
            setNodes((prev) =>
              prev.map((n) =>
                n.id === updatedCp.node_id
                  ? {
                      ...n,
                      checkpoints: n.checkpoints.map((c) =>
                        c.id === updatedCp.id ? updatedCp : c
                      ),
                    }
                  : n
              )
            );
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id: string }).id;
            setNodes((prev) =>
              prev.map((n) => ({
                ...n,
                checkpoints: n.checkpoints.filter((c) => c.id !== oldId),
              }))
            );
          }
        }
      )
      .on("broadcast", { event: "member:kicked" }, ({ payload }) => {
        if (payload?.userId === currentUser.id && payload?.projectId === project.id) {
          handleEviction();
        }
      })
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "project_members" },
        (payload) => {
          const oldRecord = payload.old as { user_id?: string; project_id?: string } | null;
          if (
            (oldRecord?.project_id === project.id || !oldRecord?.project_id) &&
            oldRecord?.user_id === currentUser.id
          ) {
            handleEviction();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "project_banned_members" },
        (payload) => {
          const newRecord = payload.new as { user_id?: string; project_id?: string } | null;
          if (
            (newRecord?.project_id === project.id || !newRecord?.project_id) &&
            newRecord?.user_id === currentUser.id
          ) {
            handleEviction();
          }
        }
      );

    canvasChannelRef.current = channel;
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setNetworkStatus("online");
        await channel.track({
          userId: currentUser.id,
          email: currentUser.email,
          fullName: currentUser.fullName,
          avatarUrl: currentUser.avatarUrl,
          cursor: null,
          selectedNodeId: null,
        });

        // Immediate initial ping
        channel.send({
          type: "broadcast",
          event: "ping",
          payload: { senderId: currentUser.id, t: Date.now() },
        });
      } else if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
        setNetworkStatus("reconnecting");
      } else if (status === "CLOSED") {
        setNetworkStatus("offline");
      }
    });

    // Browser Online/Offline Listeners
    const handleOnline = () => {
      setNetworkStatus("online");
      resyncCanvasState();
    };
    const handleOffline = () => setNetworkStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic Latency Ping (Every 4s)
    const pingInterval = setInterval(() => {
      if (navigator.onLine && canvasChannelRef.current) {
        canvasChannelRef.current.send({
          type: "broadcast",
          event: "ping",
          payload: { senderId: currentUser.id, t: Date.now() },
        });
      }
    }, 4000);

    return () => {
      clearInterval(pingInterval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (canvasChannelRef.current === channel) {
        canvasChannelRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [project.id, currentUser.id, currentUser.email, currentUser.fullName, currentUser.avatarUrl, supabase, notify, resyncCanvasState, handleEviction]);

  // ---------------------------------------------------------------------------
  // 1b. Periodic Fast Membership Verification (Evicts immediately if kicked)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isEvicted) return;

    let isChecking = false;
    const verifyAccess = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const res = await fetch(`/api/dashboard/projects/${project.slug}/canvas`, {
          cache: "no-store",
          headers: { pragma: "no-cache", "cache-control": "no-cache" },
        });
        if (res.status === 401 || res.status === 403 || res.status === 404) {
          handleEviction();
          return;
        }
        const json = await res.json();
        if (json.error === "Forbidden" || json.error === "Unauthorized" || json.error === "Project not found") {
          handleEviction();
        }
      } catch {
        // network issue, skip
      } finally {
        isChecking = false;
      }
    };

    // Run immediately on mount, then interval 1500ms
    verifyAccess();
    const interval = setInterval(verifyAccess, 1500);
    window.addEventListener("focus", verifyAccess);
    window.addEventListener("pointerdown", verifyAccess, { passive: true });
    window.addEventListener("keydown", verifyAccess, { passive: true });

    const handleVisibility = () => {
      if (document.visibilityState === "visible") verifyAccess();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", verifyAccess);
      window.removeEventListener("pointerdown", verifyAccess);
      window.removeEventListener("keydown", verifyAccess);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [handleEviction, isEvicted, project.slug]);

  // ---------------------------------------------------------------------------
  // 2. Autonomous Client-Side Claim Expiration Scanner (Runs every 2.5s)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setNodes((prev) => {
        let hasExpired = false;
        const next = prev.map((n) => {
          if (n.claimed_by && n.claim_expires_at) {
            const exp = new Date(n.claim_expires_at).getTime();
            if (exp <= now) {
              hasExpired = true;
              return {
                ...n,
                claimed_by: null,
                claim_holder: null,
                claim_expires_at: null,
              };
            }
          }
          return n;
        });
        return hasExpired ? next : prev;
      });
    }, 2500);

    return () => clearInterval(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // 3. Periodic Claim Lease Renewal Heartbeat (Runs every 60s)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(async () => {
      const heldNodes = nodes.filter((n) => n.claimed_by === currentUser.id);
      for (const node of heldNodes) {
        try {
          await fetch(`/api/dashboard/projects/${project.slug}/canvas/claim`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "heartbeat", node_id: node.id }),
          });
        } catch {}
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [nodes, currentUser.id, project.slug]);

  // ---------------------------------------------------------------------------
  // 4. Adaptive Cursor & Pointer Broadcasting (Throttled at 35Hz + Delta Gating)
  // ---------------------------------------------------------------------------
  const handlePointerMove = useCallback(
    (
      worldPos: { x: number; y: number },
      screenPos: { x: number; y: number }
    ) => {
      const now = performance.now();
      const lastTime = lastOutboundCursorTimeRef.current;
      const lastPos = lastOutboundPosRef.current;

      // Throttle outbound cursor packets to max ~35 FPS (28ms interval) and gate by delta distance
      const elapsed = now - lastTime;
      const distSq = lastPos
        ? (worldPos.x - lastPos.x) ** 2 + (worldPos.y - lastPos.y) ** 2
        : Infinity;

      const activeDrag = draggingNodeRef.current;

      // Always broadcast immediately on drag or if throttle interval passed with sufficient delta
      if (elapsed >= 28 && (distSq >= 2.0 || activeDrag)) {
        lastOutboundCursorTimeRef.current = now;
        lastOutboundPosRef.current = worldPos;

        const dtSec = Math.max(elapsed / 1000, 0.016);
        const vx = lastPos ? (worldPos.x - lastPos.x) / dtSec : 0;
        const vy = lastPos ? (worldPos.y - lastPos.y) / dtSec : 0;

        canvasChannelRef.current?.send({
          type: "broadcast",
          event: "cursor",
          payload: {
            userId: currentUser.id,
            cursor: worldPos,
            t: now,
            vx,
            vy,
          },
        });
      }

      if (activeDrag) {
        const dx =
          (screenPos.x - activeDrag.pointerStartScreen.x) / viewport.zoom;
        const dy =
          (screenPos.y - activeDrag.pointerStartScreen.y) / viewport.zoom;

        let nextX = activeDrag.startPos.x + dx;
        let nextY = activeDrag.startPos.y + dy;

        if (snapGrid) {
          nextX = snapToGrid(nextX, 16);
          nextY = snapToGrid(nextY, 16);
        }

        const lastPosition = { x: nextX, y: nextY };
        draggingNodeRef.current = { ...activeDrag, lastPosition };
        setNodes((prev) =>
          prev.map((n) =>
            n.id === activeDrag.nodeId
              ? { ...n, position_x: nextX, position_y: nextY }
              : n
          )
        );

        canvasChannelRef.current?.send({
          type: "broadcast",
          event: "node:drag",
          payload: {
            nodeId: activeDrag.nodeId,
            x: nextX,
            y: nextY,
          },
        });
      }

      if (draftEdgeRef.current) {
        setDraftEdge((prev) => (prev ? { ...prev, currentPos: worldPos } : null));
      }
    },
    [snapGrid, currentUser.id, viewport.zoom]
  );

  const handleDragEnd = useCallback(async () => {
    const completedDrag = draggingNodeRef.current;
    if (!completedDrag) return;

    draggingNodeRef.current = null;
    setDraggingNode(null);

    try {
      await secureFetch(`/api/dashboard/projects/${project.slug}/canvas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_node",
          node_id: completedDrag.nodeId,
          updates: {
            position_x: completedDrag.lastPosition.x,
            position_y: completedDrag.lastPosition.y,
          },
        }),
      });
    } catch (e) {
      console.error("Failed to commit node drag:", e);
    }
  }, [project.slug, secureFetch]);

  // ---------------------------------------------------------------------------
  // 4. Keyboard Shortcuts
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "Escape") {
        setSelectedNodeId(null);
        draftEdgeRef.current = null;
        setDraftEdge(null);
      } else if (e.key === "v" || e.key === "V") {
        setActiveTool("select");
      } else if (e.key === "h" || e.key === "H") {
        setActiveTool("hand");
      } else if (e.key === "n" || e.key === "N") {
        handleAddNode();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeId) {
          handleDeleteNode(selectedNodeId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAddNode, handleDeleteNode, selectedNodeId]);

  // ---------------------------------------------------------------------------
  // 5. Linking & Layout Methods
  // ---------------------------------------------------------------------------
  const handlePortClick = async (
    node: CanvasNode,
    handle: HandlePosition,
  ) => {
    const activeDraft = draftEdgeRef.current;
    if (!activeDraft) {
      const nextDraft = {
        sourceNode: node,
        sourceHandle: handle,
        currentPos: getNodeHandlePosition(node, handle),
      };
      draftEdgeRef.current = nextDraft;
      setDraftEdge(nextDraft);
      notify({ title: "Connection Started", message: "Choose a port on another milestone" });
      return;
    }

    if (activeDraft.sourceNode.id === node.id) {
      draftEdgeRef.current = null;
      setDraftEdge(null);
      return;
    }

    const sourceNodeId = activeDraft.sourceNode.id;
    const targetNodeId = node.id;
    const sourceHandle = activeDraft.sourceHandle;
    const canConnect = canConnectMilestones(
      activeDraft.sourceNode,
      node,
      currentUser.id,
      isOwner
    );

    draftEdgeRef.current = null;
    setDraftEdge(null);

    if (!canConnect) {
      notify({
        tone: "error",
        title: "Claim Required",
        message: "You must claim at least one of the milestone boxes to create a connection",
      });
      return;
    }

    const exists = edges.some(
      (edge) => edge.source_node_id === sourceNodeId && edge.target_node_id === targetNodeId
    );
    if (exists) {
      notify({ title: "Already Connected", message: "These milestones already have a dependency wire" });
      return;
    }

    try {
      const res = await secureFetch(`/api/dashboard/projects/${project.slug}/canvas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_edge",
          source_node_id: sourceNodeId,
          target_node_id: targetNodeId,
          source_handle: sourceHandle,
          target_handle: handle,
        }),
      });

      const data = await res.json();
      if (data.success && data.edge) {
        setEdges((prev) => [...prev, data.edge]);
        broadcastEvent("edge:created", { edge: data.edge });
        notify({ title: "Connected!", message: "Dependency wire created" });
      } else if (data.error) {
        notify({ tone: "error", title: "Connection Failed", message: data.error });
      }
    } catch (e) {
      console.error("Failed to link nodes:", e);
    }
  };

  const handleStartLink = (
    node: CanvasNode,
    handle: HandlePosition,
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    void handlePortClick(node, handle);
  };

  const handleDeleteEdge = async (edgeId: string) => {
    const edge = edges.find((e) => e.id === edgeId);
    if (edge) {
      const src = nodes.find((n) => n.id === edge.source_node_id);
      const tgt = nodes.find((n) => n.id === edge.target_node_id);
      const canDelete = isOwner || src?.claimed_by === currentUser.id || tgt?.claimed_by === currentUser.id;
      if (!canDelete) {
        notify({ tone: "error", title: "Action Denied", message: "You must claim a linked milestone box to remove this link" });
        return;
      }
    }

    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    broadcastEvent("edge:deleted", { edgeId });
    try {
      await secureFetch(`/api/dashboard/projects/${project.slug}/canvas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_edge", edge_id: edgeId }),
      });
    } catch (e) {
      console.error("Failed to delete edge:", e);
    }
  };

  const handleTidyLayout = () => {
    const tidyNodes = autoLayoutNodes(nodes, edges);
    setNodes(tidyNodes);

    tidyNodes.forEach((n) => {
      handleUpdateNode(n.id, {
        position_x: n.position_x,
        position_y: n.position_y,
      });
    });
    notify({ title: "Auto-Layout Complete", message: "Arranged milestones in roadmap order" });
  };

  const handleFitView = () => {
    if (nodes.length === 0) {
      setViewport({ x: 100, y: 100, zoom: 1.0 });
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach((n) => {
      minX = Math.min(minX, n.position_x);
      minY = Math.min(minY, n.position_y);
      maxX = Math.max(maxX, n.position_x + n.width);
      maxY = Math.max(maxY, n.position_y + n.height);
    });

    const padding = 100;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const screenW = window.innerWidth - (window.innerWidth > 768 ? 260 : 70);
    const screenH = window.innerHeight;

    const zoom = Math.min(Math.max(Math.min(screenW / width, screenH / height), 0.3), 1.2);
    const x = (screenW - width * zoom) / 2 - minX * zoom + padding * zoom;
    const y = (screenH - height * zoom) / 2 - minY * zoom + padding * zoom;

    setViewport({ x, y, zoom });
  };

  const handleJumpToNode = (targetNodeId: string) => {
    const target = nodes.find((n) => n.id === targetNodeId);
    if (!target) return;

    setSelectedNodeId(target.id);
    const screenW = window.innerWidth / 2;
    const screenH = window.innerHeight / 2;

    setViewport({
      x: screenW - (target.position_x + target.width / 2) * viewport.zoom,
      y: screenH - (target.position_y + target.height / 2) * viewport.zoom,
      zoom: viewport.zoom,
    });
  };

  const completedCount = nodes.filter((n) =>
    n.checkpoints.length > 0
      ? n.checkpoints.every((c) => c.is_completed)
      : n.status === "completed"
  ).length;

  if (isEvicted) {
    return (
      <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col items-center justify-center bg-neutral-950 text-white">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-300" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-100">Access Revoked</h2>
          <p className="max-w-sm text-xs text-neutral-400">
            You have been removed from this project by the owner. Redirecting you to your projects workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      {/* Top Floating HUD */}
      <CanvasHud
        projectName={project.name}
        inviteCode={project.invite_code}
        isOwner={isOwner}
        totalNodes={nodes.length}
        completedNodes={completedCount}
        collaborators={collaborators}
        currentUserId={currentUser.id}
        networkStatus={networkStatus}
        latencyMs={latencyMs}
        onCopyInvite={() => {
          if (project.invite_code) {
            navigator.clipboard.writeText(project.invite_code);
            notify({ title: "Invite Code Copied", message: project.invite_code });
          }
        }}
      />

      {/* Infinite Interactive Canvas Viewport */}
      <CanvasViewportContainer
        viewport={viewport}
        onViewportChange={setViewport}
        activeTool={activeTool}
        isDraggingNode={Boolean(draggingNode)}
        onCanvasClick={(worldPos) => {
          if (activeTool === "add_node") {
            handleAddNode(worldPos);
            setActiveTool("select");
          } else if (draftEdgeRef.current) {
            draftEdgeRef.current = null;
            setDraftEdge(null);
          } else {
            setSelectedNodeId(null);
          }
        }}
        onPointerMove={handlePointerMove}
      >
        {/* SVG Edge / Dependency Wire Layer */}
        <CanvasEdgeLayer
          edges={edges}
          nodes={nodes}
          draftEdge={draftEdge}
          onDeleteEdge={handleDeleteEdge}
          currentUserId={currentUser.id}
          isOwner={isOwner}
        />

        {/* Milestone Box Nodes Layer */}
        {nodes.map((node, index) => (
          <CanvasNodeComponent
            key={node.id}
            node={node}
            stepIndex={index}
            isSelected={selectedNodeId === node.id}
            isLinking={Boolean(draftEdge)}
            currentUserId={currentUser.id}
            onSelect={(n) => {
              setSelectedNodeId(n.id);
            }}
            onDragStart={(n, e) => {
              if (activeTool === "hand") return;
              const nextDrag = {
                nodeId: n.id,
                startPos: { x: n.position_x, y: n.position_y },
                pointerStartScreen: { x: e.clientX, y: e.clientY },
                lastPosition: { x: n.position_x, y: n.position_y },
              };
              draggingNodeRef.current = nextDrag;
              setDraggingNode(nextDrag);
            }}
            onDragEnd={handleDragEnd}
            onStartLink={handleStartLink}
            onToggleCheckpoint={handleToggleCheckpoint}
            onRequestClaim={handleRequestClaim}
            onClaimNode={handleClaimNode}
          />
        ))}

        {/* Multiplayer Live Cursors */}
        <CanvasCursors
          collaborators={collaborators}
          currentUserId={currentUser.id}
        />
      </CanvasViewportContainer>

      {/* Slide-Out Right Milestone Detail Screen */}
      {selectedNode && (
        <CanvasDrawer
          node={selectedNode}
          allNodes={nodes}
          edges={edges}
          currentUserId={currentUser.id}
          isProjectOwner={isOwner}
          onClose={() => setSelectedNodeId(null)}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
          onToggleCheckpoint={handleToggleCheckpoint}
          onAddCheckpoint={handleAddCheckpoint}
          onDeleteCheckpoint={handleDeleteCheckpoint}
          onClaimNode={handleClaimNode}
          onReleaseNode={handleReleaseNode}
          onRequestClaim={handleRequestClaim}
          onForceUnlock={handleForceUnlock}
          onJumpToNode={handleJumpToNode}
        />
      )}

      {/* Floating Action Dock */}
      <CanvasDock
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        viewport={viewport}
        onZoomIn={() =>
          setViewport((prev) => ({
            ...prev,
            zoom: Math.min(prev.zoom * 1.2, 2.5),
          }))
        }
        onZoomOut={() =>
          setViewport((prev) => ({
            ...prev,
            zoom: Math.max(prev.zoom * 0.8, 0.15),
          }))
        }
        onResetZoom={() => setViewport((prev) => ({ ...prev, zoom: 1.0 }))}
        onFitView={handleFitView}
        onAddNode={() => handleAddNode()}
        onTidyLayout={handleTidyLayout}
        snapGrid={snapGrid}
        onToggleSnapGrid={() => setSnapGrid((v) => !v)}
      />

      {/* Realtime Claim Handoff Modal Prompt */}
      <CanvasClaimModal
        pendingRequest={incomingClaimModal}
        onResolve={handleResolveClaimRequest}
      />
    </div>
  );
}
