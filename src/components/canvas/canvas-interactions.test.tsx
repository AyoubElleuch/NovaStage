// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CanvasNodeComponent from "./canvas-node";
import CanvasEdgeLayer from "./canvas-edge-layer";
import { getNodeDimensions, getNodeHandlePosition } from "@/lib/canvas/coordinate-math";
import type { CanvasNode } from "@/lib/canvas/types";

afterEach(cleanup);
const node: CanvasNode = { id: "a", project_id: "p", title: "Milestone", description: "", status: "draft", position_x: 0, position_y: 0, width: 280, height: 170, color: "default", sort_order: 0, claimed_by: "u", version: 1, checkpoints: [] };
const props = { node, stepIndex: 0, isSelected: true, isLinking: false, currentUserId: "u", onSelect: vi.fn(), onDragStart: vi.fn(), onDragEnd: vi.fn(), onStartLink: vi.fn(), onToggleCheckpoint: vi.fn(), onRequestClaim: vi.fn() };

it("shows five checkpoints and keeps the bottom handle aligned with the expanded card", () => {
  const milestone = { ...node, checkpoints: Array.from({ length: 6 }, (_, i) => ({ id: `cp${i}`, node_id: "a", project_id: "p", title: `Checkpoint ${i + 1}`, is_completed: false, sort_order: i })) };
  render(<CanvasNodeComponent {...props} node={milestone} />);
  expect(screen.getByText("Checkpoint 5")).toBeTruthy();
  expect(screen.queryByText("Checkpoint 6")).toBeNull();
  expect(screen.getByText("+1 remaining")).toBeTruthy();
  const height = getNodeDimensions(milestone).height;
  expect(height).toBeGreaterThan(170);
  expect(getNodeHandlePosition(milestone, "bottom").y).toBe(height);
});

it("opens the connection editor from the wire hit target and saves an expanded type", async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  render(<CanvasEdgeLayer nodes={[node, { ...node, id: "b", title: "Target", position_x: 500 }]} edges={[{ id: "e", project_id: "p", source_node_id: "a", target_node_id: "b", source_handle: "right", target_handle: "left" }]} draftEdge={null} onDeleteEdge={vi.fn()} onUpdateEdge={save} isOwner />);
  fireEvent.click(screen.getByRole("button", { name: "Connection from Milestone to Target" }).querySelector("path")!);
  fireEvent.click(screen.getByRole("combobox", { name: "Connection type" }));
  fireEvent.click(screen.getByRole("option", { name: "Security / IAM" }));
  fireEvent.change(screen.getByPlaceholderText(/HTTPS/), { target: { value: "Role access" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(save).toHaveBeenCalledWith("e", { label: "Role access", edge_type: "security_iam" });
  await screen.findByRole("button", { name: "Connection from Milestone to Target" });
});

it("only starts group dragging from the header", () => {
  const drag = vi.fn();
  render(<CanvasNodeComponent {...props} node={{ ...node, node_type: "group", group_metadata: { label: "VPC", style: "vpc", childNodeIds: [] } }} onDragStart={drag} />);
  fireEvent.pointerDown(screen.getByRole("group"), { button: 0 });
  expect(drag).not.toHaveBeenCalled();
});
