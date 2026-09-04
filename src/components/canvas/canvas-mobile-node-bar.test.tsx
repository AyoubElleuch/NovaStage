import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CanvasMobileNodeBar from "./canvas-mobile-node-bar";
import type { CanvasNode } from "@/lib/canvas/types";

describe("CanvasMobileNodeBar", () => {
  const mockNode: CanvasNode = {
    id: "node-1",
    project_id: "p1",
    title: "Setup Auth Service",
    description: "Config OAuth and JWT",
    status: "in_progress",
    position_x: 100,
    position_y: 100,
    width: 280,
    height: 170,
    color: "default",
    sort_order: 0,
    claimed_by: "user-1",
    version: 1,
    created_at: "",
    updated_at: "",
    checkpoints: [
      {
        id: "cp-1",
        node_id: "node-1",
        project_id: "p1",
        title: "Setup Supabase Auth",
        is_completed: false,
        sort_order: 0,
        completed_at: null,
        completed_by: null,
        created_at: "",
        updated_at: "",
      },
    ],
  };

  const defaultProps = {
    node: mockNode,
    stepIndex: 0,
    currentUserId: "user-1",
    onOpenDrawer: vi.fn(),
    onDeselect: vi.fn(),
    onClaimNode: vi.fn(),
    onReleaseNode: vi.fn(),
    onRequestClaim: vi.fn(),
    onToggleCheckpoint: vi.fn(),
  };

  it("renders milestone title, step badge, percentage, and next unfinished checkpoint", () => {
    render(<CanvasMobileNodeBar {...defaultProps} />);

    expect(screen.getByText("STEP 01")).not.toBeNull();
    expect(screen.getByText("Setup Auth Service")).not.toBeNull();
    expect(screen.getByText("Setup Supabase Auth")).not.toBeNull();
    expect(screen.getByText("0%")).not.toBeNull();
  });

  it("handles mobile bar interactions: details drawer, deselect, claim/release, and checkpoint toggle", () => {
    const handleOpenDrawer = vi.fn();
    const handleDeselect = vi.fn();
    const handleRelease = vi.fn();
    const handleToggle = vi.fn();

    render(
      <CanvasMobileNodeBar
        {...defaultProps}
        onOpenDrawer={handleOpenDrawer}
        onDeselect={handleDeselect}
        onReleaseNode={handleRelease}
        onToggleCheckpoint={handleToggle}
      />
    );

    // 1. Open drawer
    fireEvent.click(screen.getByRole("button", { name: /details/i }));
    expect(handleOpenDrawer).toHaveBeenCalledTimes(1);

    // 2. Deselect
    fireEvent.click(screen.getByRole("button", { name: /deselect milestone/i }));
    expect(handleDeselect).toHaveBeenCalledTimes(1);

    // 3. Release edit lock
    fireEvent.click(screen.getByRole("button", { name: /release edit lock/i }));
    expect(handleRelease).toHaveBeenCalledWith("node-1");

    // 4. Toggle checkpoint
    fireEvent.click(screen.getByTitle("Mark next step complete"));
    expect(handleToggle).toHaveBeenCalledWith("cp-1", "node-1", true);
  });
});
