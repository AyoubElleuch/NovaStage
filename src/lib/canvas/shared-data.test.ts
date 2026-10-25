import { describe, expect, it } from "vitest";
import { isCanvasShareToken, publicCanvasData } from "./shared-data";
import type { CanvasEdge, CanvasNode } from "./types";

describe("public canvas boundary", () => {
  it("requires an opaque, full-length token", () => {
    expect(isCanvasShareToken("a".repeat(64))).toBe(true);
    for (const token of ["", "project-slug", "a".repeat(63), "g".repeat(64), "a".repeat(65)]) expect(isCanvasShareToken(token)).toBe(false);
  });
  it("keeps canvas content while excluding project and collaborator identities at every level", () => {
    const node = {
      id: "node", project_id: "private-project", title: "API", description: "Canvas content", status: "draft",
      position_x: 10, position_y: 20, width: 200, height: 140, color: "default", sort_order: 0,
      claimed_by: "private-user", claim_holder: { email: "private@example.com", fullName: "Private Member" },
      claimed_at: "private-timestamp", version: 12, created_by: "private-author",
      checkpoints: [{ id: "cp", node_id: "node", project_id: "private-project", title: "Ship", is_completed: true, sort_order: 0, completed_by: "private-user" }],
      aws_metadata: { serviceId: "lambda", category: "compute", config: { runtime: "nodejs" }, private_field: "private-secret" },
    } as unknown as CanvasNode;
    const edge = { id: "edge", project_id: "private-project", source_node_id: "node", target_node_id: "other", source_handle: "right", target_handle: "left", label: "HTTPS", created_by: "private-user" } as CanvasEdge;
    const result = publicCanvasData([node], [edge]);
    expect(JSON.stringify(result)).not.toMatch(/private-|private@|Private Member|completed_by|created_by|claimed_at|claim_holder/);
    expect(result.nodes[0].title).toBe("API");
    expect(result.nodes[0].checkpoints[0]).toMatchObject({ title: "Ship", is_completed: true });
    expect(result.nodes[0].aws_metadata?.config).toEqual({ runtime: "nodejs" });
    expect(result.edges[0].label).toBe("HTTPS");
  });
});
