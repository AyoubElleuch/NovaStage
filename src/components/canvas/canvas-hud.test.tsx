import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CanvasHud from "./canvas-hud";

describe("CanvasHud Component", () => {
  const baseProps = {
    projectName: "Test Pipeline Project",
    inviteCode: "NOV-1234",
    isOwner: true,
    totalNodes: 4,
    completedNodes: 2,
    collaborators: [],
    currentUserId: "user-1",
    onCopyInvite: vi.fn(),
  };

  it("renders project name, ownership badge, and roadmap progress", () => {
    render(<CanvasHud {...baseProps} />);

    expect(screen.getByText("Test Pipeline Project")).not.toBeNull();
    expect(screen.getByText("Owner")).not.toBeNull();
    expect(screen.getByText("2/4 milestones (50%)")).not.toBeNull();
  });

  it("renders measured latency when latencyMs is provided", () => {
    render(<CanvasHud {...baseProps} networkStatus="online" latencyMs={84} />);

    expect(screen.getByText("84ms")).not.toBeNull();
  });

  it("renders placeholder dash when latencyMs is null or loading instead of hardcoded 0ms", () => {
    render(<CanvasHud {...baseProps} networkStatus="online" latencyMs={null} />);

    expect(screen.getByText("—")).not.toBeNull();
    expect(screen.queryByText("0ms")).toBeNull();
  });

  it("renders slow connection indicator when network status is slow", () => {
    render(<CanvasHud {...baseProps} networkStatus="slow" latencyMs={340} />);

    expect(screen.getByText("340ms")).not.toBeNull();
  });

  it("renders reconnecting indicator when network status is reconnecting", () => {
    render(<CanvasHud {...baseProps} networkStatus="reconnecting" />);

    expect(screen.getByText("Reconnecting…")).not.toBeNull();
  });

  it("renders offline indicator when network status is offline", () => {
    render(<CanvasHud {...baseProps} networkStatus="offline" />);

    expect(screen.getByText("Offline")).not.toBeNull();
  });
});
