import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CanvasNodeComponent from "./canvas-node";
import type { CanvasNode } from "@/lib/canvas/types";

describe("CanvasNodeComponent", () => {
  const mockNode: CanvasNode = {
    id: "n1",
    project_id: "p1",
    title: "Database Schema",
    description: "PostgreSQL setup",
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
        node_id: "n1",
        project_id: "p1",
        title: "Create tables",
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
    isSelected: false,
    isLinking: false,
    currentUserId: "user-1",
    onSelect: vi.fn(),
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    onStartLink: vi.fn(),
    onToggleCheckpoint: vi.fn(),
    onRequestClaim: vi.fn(),
  };

  it("renders step label, title, and checkpoint item", () => {
    render(<CanvasNodeComponent {...defaultProps} />);

    expect(screen.getByText("STEP 01")).not.toBeNull();
    expect(screen.getByText("Database Schema")).not.toBeNull();
    expect(screen.getByText("Create tables")).not.toBeNull();
    expect(screen.getByText("You")).not.toBeNull();
  });

  it("allows double-clicking title to inline edit and commit with Enter", () => {
    const handleUpdateTitle = vi.fn();
    render(
      <CanvasNodeComponent
        {...defaultProps}
        onUpdateTitle={handleUpdateTitle}
      />
    );

    const titleEl = screen.getByText("Database Schema");
    fireEvent.doubleClick(titleEl);

    const input = screen.getByDisplayValue("Database Schema");
    fireEvent.change(input, { target: { value: "PostgreSQL Schema Setup" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(handleUpdateTitle).toHaveBeenCalledWith("n1", "PostgreSQL Schema Setup");
  });

  it("toggles checkpoint completion when checkbox is clicked", () => {
    const handleToggle = vi.fn();
    render(
      <CanvasNodeComponent
        {...defaultProps}
        onToggleCheckpoint={handleToggle}
      />
    );

    const checkbox = screen.getByRole("button", { name: /mark "create tables" as complete/i });
    fireEvent.click(checkbox);

    expect(handleToggle).toHaveBeenCalledWith("cp-1", "n1", true);
  });

  it("applies selected styling when isSelected or isMultiSelected is true", () => {
    const { container, rerender } = render(
      <CanvasNodeComponent {...defaultProps} isSelected={true} />
    );

    expect((container.firstChild as HTMLElement).className).toContain("border-neutral-900");

    rerender(
      <CanvasNodeComponent {...defaultProps} isSelected={false} isMultiSelected={true} />
    );
    expect((container.firstChild as HTMLElement).className).toContain("border-neutral-900");
  });

  it("supports keyboard selection and cancels renaming with Escape", () => {
    const onSelect = vi.fn();
    const onUpdateTitle = vi.fn();
    render(<CanvasNodeComponent {...defaultProps} onSelect={onSelect} onUpdateTitle={onUpdateTitle} />);
    const card = screen.getByRole("group");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(mockNode, false);
    fireEvent.keyDown(card, { key: "F2" });
    fireEvent.change(screen.getByLabelText("Milestone title"), { target: { value: "Discard this" } });
    fireEvent.keyDown(screen.getByLabelText("Milestone title"), { key: "Escape" });
    expect(screen.queryByLabelText("Milestone title")).toBeNull();
    expect(onUpdateTitle).not.toHaveBeenCalled();
  });

  it("commits a rename only once when Enter also blurs the input", () => {
    const onUpdateTitle = vi.fn();
    render(<CanvasNodeComponent {...defaultProps} onUpdateTitle={onUpdateTitle} />);
    fireEvent.click(screen.getByRole("button", { name: "Rename Database Schema" }));
    fireEvent.change(screen.getByLabelText("Milestone title"), { target: { value: "New title" } });
    fireEvent.keyDown(screen.getByLabelText("Milestone title"), { key: "Enter" });
    expect(onUpdateTitle).toHaveBeenCalledTimes(1);
  });

  it("exposes keyboard connection ports and uses stored node geometry", () => {
    const onStartLink = vi.fn((node, handle, event) => event.preventDefault());
    render(<CanvasNodeComponent {...defaultProps} onStartLink={onStartLink} />);
    fireEvent.click(screen.getByRole("button", { name: "Link from right port of Database Schema" }), { detail: 0 });
    expect(onStartLink).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("group").style.height).toBe("170px");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
  });

  it("requests edit access instead of toggling someone else's checkpoint", () => {
    const onRequestClaim = vi.fn();
    const onToggleCheckpoint = vi.fn();
    render(<CanvasNodeComponent {...defaultProps} node={{ ...mockNode, claimed_by: "other" }} onRequestClaim={onRequestClaim} onToggleCheckpoint={onToggleCheckpoint} />);
    fireEvent.click(screen.getByRole("button", { name: 'Request access to edit "Create tables"' }));
    expect(onRequestClaim).toHaveBeenCalled();
    expect(onToggleCheckpoint).not.toHaveBeenCalled();
  });
});
