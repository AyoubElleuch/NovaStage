import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CanvasDrawer from "./canvas-drawer";
import type { CanvasNode } from "@/lib/canvas/types";

const node: CanvasNode = {
  id: "n1", project_id: "p1", title: "Database setup", description: "Initial notes",
  status: "in_progress", position_x: 0, position_y: 0, width: 280, height: 170,
  color: "default", sort_order: 0, claimed_by: "me", version: 1,
  checkpoints: [{ id: "c1", node_id: "n1", project_id: "p1", title: "Create tables", is_completed: false, sort_order: 0 }],
};
const props = () => ({
  node, allNodes: [node], edges: [], currentUserId: "me", isProjectOwner: true,
  onClose: vi.fn(), onUpdateNode: vi.fn(), onDeleteNode: vi.fn(),
  onToggleCheckpoint: vi.fn(), onAddCheckpoint: vi.fn(), onDeleteCheckpoint: vi.fn(),
  onClaimNode: vi.fn(), onReleaseNode: vi.fn(), onRequestClaim: vi.fn(), onJumpToNode: vi.fn(),
});

describe("CanvasDrawer", () => {
  it("preserves description and checkpoint drafts when a saved title updates", () => {
    const base = props();
    const { rerender } = render(<CanvasDrawer {...base} />);
    fireEvent.change(screen.getByLabelText("Description & notes"), { target: { value: "Unsaved detail" } });
    fireEvent.change(screen.getByLabelText("New checkpoint"), { target: { value: "Add indexes" } });
    rerender(<CanvasDrawer {...base} node={{ ...node, title: "Renamed database" }} />);
    expect((screen.getByLabelText("Description & notes") as HTMLTextAreaElement).value).toBe("Unsaved detail");
    expect((screen.getByLabelText("New checkpoint") as HTMLInputElement).value).toBe("Add indexes");
    expect((screen.getByLabelText("Milestone title") as HTMLInputElement).value).toBe("Renamed database");
  });

  it("leaves AWS regions unspecified and saves edits once on blur", () => {
    const base = props();
    render(<CanvasDrawer {...base} node={{ ...node, node_type: "aws_service", aws_metadata: { serviceId: "ec2", category: "compute" }, checkpoints: [] }} />);
    const region = screen.getByLabelText("AWS Region");
    expect((region as HTMLInputElement).value).toBe("");
    fireEvent.change(region, { target: { value: "eu-west-1" } });
    expect(base.onUpdateNode).not.toHaveBeenCalled();
    fireEvent.blur(region);
    expect(base.onUpdateNode).toHaveBeenCalledTimes(1);
    expect(base.onUpdateNode).toHaveBeenCalledWith("n1", { aws_metadata: { serviceId: "ec2", category: "compute", region: "eu-west-1", config: {} } });
  });

  it("adds configuration properties and prevents duplicate keys", () => {
    const base = props();
    render(<CanvasDrawer {...base} node={{ ...node, node_type: "aws_service", aws_metadata: { serviceId: "ec2", category: "compute", config: { instanceType: "t3.micro" } }, checkpoints: [] }} />);
    fireEvent.change(screen.getByLabelText("Configuration key"), { target: { value: "instanceType" } });
    fireEvent.click(screen.getByRole("button", { name: "Add property" }));
    expect(screen.getByRole("alert").textContent).toContain("already exists");
    expect(base.onUpdateNode).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Configuration key"), { target: { value: "environment" } });
    fireEvent.change(screen.getByLabelText("Configuration value"), { target: { value: "staging" } });
    fireEvent.click(screen.getByRole("button", { name: "Add property" }));
    expect(base.onUpdateNode).toHaveBeenCalledWith("n1", { aws_metadata: { serviceId: "ec2", category: "compute", region: undefined, config: { instanceType: "t3.micro", environment: "staging" } } });
  });

  it("synchronizes a group's label when its title saves", () => {
    const base = props();
    render(<CanvasDrawer {...base} node={{ ...node, node_type: "group", group_metadata: { label: node.title, style: "vpc", childNodeIds: ["child"] } }} />);
    fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "Production VPC" } });
    fireEvent.blur(screen.getByLabelText("Group name"));
    expect(base.onUpdateNode).toHaveBeenCalledWith("n1", { title: "Production VPC", group_metadata: { label: "Production VPC", style: "vpc", childNodeIds: ["child"] } });
  });

  it("waits for pending saves before releasing edit access", async () => {
    const base = props();
    let resolve!: () => void;
    const pending = new Promise<void>((done) => { resolve = done; });
    base.onUpdateNode.mockReturnValue(pending);
    render(<CanvasDrawer {...base} />);
    fireEvent.change(screen.getByLabelText("Description & notes"), { target: { value: "Save before release" } });
    fireEvent.blur(screen.getByLabelText("Description & notes"));
    fireEvent.click(screen.getByRole("button", { name: "Release" }));
    expect(base.onReleaseNode).not.toHaveBeenCalled();
    await act(async () => { resolve(); await pending; });
    await waitFor(() => expect(base.onReleaseNode).toHaveBeenCalledWith("n1"));
  });

  it("keeps edit access if a pending save fails", async () => {
    const base = props();
    let reject!: (error: Error) => void;
    const pending = new Promise<void>((_, fail) => { reject = fail; });
    base.onUpdateNode.mockReturnValue(pending);
    render(<CanvasDrawer {...base} />);
    fireEvent.change(screen.getByLabelText("Description & notes"), { target: { value: "Save before release" } });
    fireEvent.blur(screen.getByLabelText("Description & notes"));
    fireEvent.click(screen.getByRole("button", { name: "Release" }));
    await act(async () => { reject(new Error("Offline")); await pending.catch(() => undefined); });
    expect(base.onReleaseNode).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("before releasing");
  });

  it("does not offer completion until all checkpoints are done", () => {
    render(<CanvasDrawer {...props()} />);
    expect((screen.getByRole("option", { name: "Complete" }) as HTMLOptionElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: 'Mark "Create tables" as complete' }));
  });

  it("supports keyboard dependency navigation and prevents canvas shortcuts", () => {
    const base = props();
    const dependent = { ...node, id: "n2", title: "Deploy app", claimed_by: null };
    render(<CanvasDrawer {...base} allNodes={[node, dependent]} edges={[{ id: "e1", project_id: "p1", source_node_id: "n1", target_node_id: "n2", source_handle: "right", target_handle: "left" }]} />);
    fireEvent.click(screen.getByRole("button", { name: /Deploy app/ }));
    expect(base.onJumpToNode).toHaveBeenCalledWith("n2");
    fireEvent.keyDown(screen.getByLabelText("New checkpoint"), { key: "Escape" });
    expect(base.onClose).toHaveBeenCalledTimes(1);
  });

  it("saves a focused description before closing with Escape", () => {
    const base = props();
    render(<CanvasDrawer {...base} />);
    const notes = screen.getByLabelText("Description & notes");
    notes.focus();
    fireEvent.change(notes, { target: { value: "Keep this draft" } });
    fireEvent.keyDown(notes, { key: "Escape" });
    expect(base.onUpdateNode).toHaveBeenCalledWith("n1", { description: "Keep this draft" });
    expect(base.onClose).toHaveBeenCalledTimes(1);
  });
});
