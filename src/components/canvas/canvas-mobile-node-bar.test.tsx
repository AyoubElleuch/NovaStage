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

  it("renders milestone title, step badge, and next unfinished checkpoint", () => {
    render(<CanvasMobileNodeBar {...defaultProps} />);

    expect(screen.getByText("STEP 01")).not.toBeNull();
    expect(screen.getByText("Setup Auth Service")).not.toBeNull();
    expect(screen.getByText("Setup Supabase Auth")).not.toBeNull();
    expect(screen.getByText("0%")).not.toBeNull();
  });

  it("opens the full drawer when Details button is clicked", () => {
    const handleOpenDrawer = vi.fn();
    render(<CanvasMobileNodeBar {...defaultProps} onOpenDrawer={handleOpenDrawer} />);

    const detailsBtn = screen.getByRole("button", { name: /details/i });
    fireEvent.click(detailsBtn);

    expect(handleOpenDrawer).toHaveBeenCalledTimes(1);
  });

  it("calls onDeselect when close button is clicked", () => {
    const handleDeselect = vi.fn();
    render(<CanvasMobileNodeBar {...defaultProps} onDeselect={handleDeselect} />);

    const closeBtn = screen.getByRole("button", { name: /deselect milestone/i });
    fireEvent.click(closeBtn);

    expect(handleDeselect).toHaveBeenCalledTimes(1);
  });

  it("allows releasing edit lock when claimed by current user", () => {
    const handleRelease = vi.fn();
    render(<CanvasMobileNodeBar {...defaultProps} onReleaseNode={handleRelease} />);

    const releaseBtn = screen.getByRole("button", { name: /release edit lock/i });
    fireEvent.click(releaseBtn);

    expect(handleRelease).toHaveBeenCalledWith("node-1");
  });

  it("allows claiming milestone when not claimed", () => {
    const handleClaim = vi.fn();
    const unclaimedNode: CanvasNode = { ...mockNode, claimed_by: null };
    render(
      <CanvasMobileNodeBar
        {...defaultProps}
        node={unclaimedNode}
        onClaimNode={handleClaim}
      />
    );

    const claimBtn = screen.getByRole("button", { name: /claim to edit/i });
    fireEvent.click(claimBtn);

    expect(handleClaim).toHaveBeenCalledWith("node-1");
  });

  it("toggles checkpoint completion when check circle is clicked", () => {
    const handleToggle = vi.fn();
    render(
      <CanvasMobileNodeBar
        {...defaultProps}
        onToggleCheckpoint={handleToggle}
      />
    );

    const checkpointBtn = screen.getByTitle("Mark next step complete");
    fireEvent.click(checkpointBtn);

    expect(handleToggle).toHaveBeenCalledWith("cp-1", "node-1", true);
  });
});
