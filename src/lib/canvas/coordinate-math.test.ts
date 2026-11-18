import { describe, it, expect } from "vitest";
import {
  canConnectMilestones,
  detectCycle,
  getCanvasBoundingBox,
  exportToMermaid,
} from "./coordinate-math";
import type { CanvasNode } from "./types";

describe("Canvas Coordinate Math & DAG Engine", () => {
  it("enforces milestone connection permissions and claim lock rules", () => {
    const futureDate = new Date(Date.now() + 60000).toISOString();
    const pastDate = new Date(Date.now() - 60000).toISOString();

    const claimedNode = { claimed_by: "user-1", claim_expires_at: futureDate };
    const unclaimedNode = { claimed_by: null, claim_expires_at: null };
    const otherUserClaim = { claimed_by: "user-2", claim_expires_at: futureDate };
    const expiredClaim = { claimed_by: "user-1", claim_expires_at: pastDate };

    expect(canConnectMilestones(claimedNode, unclaimedNode, "user-1")).toBe(true);
    expect(canConnectMilestones(unclaimedNode, claimedNode, "user-1")).toBe(true);
    expect(canConnectMilestones(otherUserClaim, unclaimedNode, "user-1")).toBe(false);
    expect(canConnectMilestones(expiredClaim, unclaimedNode, "user-1")).toBe(false);
    expect(canConnectMilestones(otherUserClaim, unclaimedNode, "user-1", true)).toBe(true);
  });

  it("detects self-loops and circular dependencies via DFS while allowing valid DAG branches", () => {
    const edges = [
      {
        id: "e1",
        project_id: "p1",
        source_node_id: "n1",
        target_node_id: "n2",
        source_handle: "right" as const,
        target_handle: "left" as const,
      },
      {
        id: "e2",
        project_id: "p1",
        source_node_id: "n2",
        target_node_id: "n3",
        source_handle: "right" as const,
        target_handle: "left" as const,
      },
    ];

    expect(detectCycle(edges, { sourceNodeId: "n1", targetNodeId: "n1" })).toBe(true);
    expect(detectCycle(edges, { sourceNodeId: "n3", targetNodeId: "n1" })).toBe(true);
    expect(detectCycle(edges, { sourceNodeId: "n3", targetNodeId: "n4" })).toBe(false);
  });

  it("calculates accurate bounding boxes and exports valid Mermaid DAG syntax", () => {
    const mockNodes: CanvasNode[] = [
      {
        id: "n1",
        project_id: "p1",
        title: "Auth",
        description: "",
        status: "completed",
        position_x: 100,
        position_y: 100,
        width: 200,
        height: 100,
        color: "default",
        sort_order: 0,
        claimed_by: null,
        version: 1,
        created_at: "",
        updated_at: "",
        checkpoints: [],
      },
      {
        id: "n2",
        project_id: "p1",
        title: "API",
        description: "",
        status: "draft",
        position_x: 400,
        position_y: 300,
        width: 200,
        height: 100,
        color: "default",
        sort_order: 1,
        claimed_by: null,
        version: 1,
        created_at: "",
        updated_at: "",
        checkpoints: [],
      },
    ];

    const box = getCanvasBoundingBox(mockNodes, 50);
    expect(box).toMatchObject({
      minX: 50,
      maxX: 650,
      minY: 50,
      maxY: 512,
      width: 600,
      height: 462,
    });

    const edges = [
      {
        id: "e1",
        project_id: "p1",
        source_node_id: "n1",
        target_node_id: "n2",
        source_handle: "right" as const,
        target_handle: "left" as const,
      },
    ];
    const mermaid = exportToMermaid(mockNodes, edges);
    expect(mermaid).toContain("graph LR");
    expect(mermaid).toContain("n1 --> n2");
    const grouped = exportToMermaid(
      [
        { ...mockNodes[0], node_type: "group", title: 'Group | "quoted"' },
        { ...mockNodes[1], parent_group_id: "n1" },
      ],
      [{ ...edges[0], edge_type: "event", label: "A | B" }],
    );
    expect(grouped).toContain("subgraph n1");
    expect(grouped).toContain("#124;");
    expect(grouped).toContain("#34;");
    expect(grouped).toContain("-.->");
  });
});
