import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CanvasReleasePulse from "./canvas-release-pulse";
import type { CanvasEdge, CanvasNode } from "@/lib/canvas/types";

const nodes: CanvasNode[] = [
  {
    id: "foundation",
    project_id: "project-1",
    title: "Foundation",
    description: "",
    status: "in_progress",
    position_x: 0,
    position_y: 0,
    width: 280,
    height: 170,
    color: "default",
    sort_order: 0,
    claimed_by: null,
    version: 1,
    checkpoints: [
      { id: "task-1", node_id: "foundation", project_id: "project-1", title: "Schema", is_completed: false, sort_order: 0 },
    ],
  },
  {
    id: "launch",
    project_id: "project-1",
    title: "Launch",
    description: "",
    status: "draft",
    position_x: 320,
    position_y: 0,
    width: 280,
    height: 170,
    color: "default",
    sort_order: 1,
    claimed_by: null,
    version: 1,
    checkpoints: [
      { id: "task-2", node_id: "launch", project_id: "project-1", title: "Deploy", is_completed: false, sort_order: 0 },
    ],
  },
];

const edges: CanvasEdge[] = [
  {
    id: "edge-1",
    project_id: "project-1",
    source_node_id: "foundation",
    target_node_id: "launch",
    source_handle: "right",
    target_handle: "left",
  },
];

describe("CanvasReleasePulse", () => {
  it("shows live readiness insights and jumps to milestones", () => {
    const onJumpToNode = vi.fn();
    render(
      <CanvasReleasePulse
        nodes={nodes}
        edges={edges}
        onClose={vi.fn()}
        onJumpToNode={onJumpToNode}
      />
    );

    expect(screen.getByText("Early stage")).not.toBeNull();
    expect(screen.getByText("2 unfinished")).not.toBeNull();
    expect(screen.getByText("1 actionable")).not.toBeNull();
    expect(screen.getByText("holds 1 downstream")).not.toBeNull();

    fireEvent.click(screen.getByTitle("Open Foundation"));
    expect(onJumpToNode).toHaveBeenCalledWith("foundation");
  });
});