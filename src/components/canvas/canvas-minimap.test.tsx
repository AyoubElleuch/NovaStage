import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CanvasMinimap from "./canvas-minimap";
import type { CanvasNode, CanvasViewport } from "@/lib/canvas/types";

describe("CanvasMinimap Component", () => {
  const mockNodes: CanvasNode[] = [
    {
      id: "n1",
      project_id: "p1",
      title: "Step 1: Setup",
      description: "",
      status: "completed",
      position_x: 100,
      position_y: 100,
      width: 280,
      height: 170,
      color: "default",
      sort_order: 0,
      claimed_by: null,
      version: 1,
      created_at: "",
      updated_at: "",
      checkpoints: [
        { id: "c1", node_id: "n1", project_id: "p1", title: "DB", is_completed: true, sort_order: 0, completed_at: null, completed_by: null, created_at: "", updated_at: "" },
      ],
    },
    {
      id: "n2",
      project_id: "p1",
      title: "Step 2: API",
      description: "",
      status: "draft",
      position_x: 500,
      position_y: 100,
      width: 280,
      height: 170,
      color: "default",
      sort_order: 1,
      claimed_by: "user-1",
      version: 1,
      created_at: "",
      updated_at: "",
      checkpoints: [],
    },
  ];

  const mockViewport: CanvasViewport = { x: 0, y: 0, zoom: 1.0 };

  it("renders radar container when isOpen is true", () => {
    render(
      <CanvasMinimap
        nodes={mockNodes}
        viewport={mockViewport}
        onViewportChange={vi.fn()}
        isOpen={true}
      />
    );

    expect(screen.getByRole("complementary", { name: /radar/i })).not.toBeNull();
    expect(screen.getByTitle("Step 1: Setup")).not.toBeNull();
    expect(screen.getByTitle("Step 2: API")).not.toBeNull();
  });

  it("handles clicking to pan viewport", () => {
    const handleViewportChange = vi.fn();
    render(
      <CanvasMinimap
        nodes={mockNodes}
        viewport={mockViewport}
        onViewportChange={handleViewportChange}
        isOpen={true}
      />
    );

    const radar = screen.getByTitle("Step 1: Setup").parentElement;
    if (radar) {
      fireEvent.pointerDown(radar, { clientX: 50, clientY: 50, pointerId: 1 });
      expect(handleViewportChange).toHaveBeenCalled();
    }
  });

  it("toggles collapse/expand when radar button is clicked", () => {
    const handleToggle = vi.fn();
    render(
      <CanvasMinimap
        nodes={mockNodes}
        viewport={mockViewport}
        onViewportChange={vi.fn()}
        isOpen={true}
        onToggleOpen={handleToggle}
      />
    );

    const toggleBtn = screen.getByTitle(/collapse minimap/i);
    fireEvent.click(toggleBtn);
    expect(handleToggle).toHaveBeenCalled();
  });
});
