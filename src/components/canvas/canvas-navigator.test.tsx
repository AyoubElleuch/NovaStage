import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CanvasNavigator from "./canvas-navigator";
import type { CanvasNode } from "@/lib/canvas/types";

afterEach(cleanup);

const node = (id: string, changes: Partial<CanvasNode> = {}): CanvasNode => ({
  id, project_id: "p", title: id, description: "", status: "draft", position_x: 0, position_y: 0,
  width: 280, height: 170, color: "default", sort_order: 0, claimed_by: null, version: 1,
  checkpoints: [], ...changes,
});
const nodes = [
  node("release", { title: "Release", checkpoints: [
    { id: "cp", node_id: "release", project_id: "p", title: "QA handover", is_completed: false, sort_order: 0 },
  ] }),
  node("aws", { title: "Web tier", node_type: "aws_service", aws_metadata: {
    serviceId: "ec2", category: "compute", region: "eu-west-1", config: { instanceType: "t3.nano" },
  } }),
  node("note", { title: "Runbook", node_type: "annotation", annotation_metadata: { content: "Rollback procedure" } }),
  node("group", { title: "VPC", node_type: "group", group_metadata: { label: "Production", style: "vpc", childNodeIds: [] } }),
];

function setup() {
  const onJump = vi.fn();
  const onClose = vi.fn();
  const parentKeyDown = vi.fn();
  render(<div onKeyDown={parentKeyDown}><CanvasNavigator nodes={nodes} isOpen onToggle={vi.fn()}
    onClose={onClose} onJumpToNode={onJump} /></div>);
  return { onJump, onClose, parentKeyDown, search: screen.getByRole("combobox", { name: "Search canvas" }) };
}

describe("canvas navigator", () => {
  it("finds tasks, AWS configuration, group labels and note content", () => {
    const { search } = setup();
    for (const [query, title] of [
      ["qa handover", "Release"], ["t3.nano eu-west-1", "Web tier"],
      ["rollback", "Runbook"], ["production", "VPC"],
    ]) {
      fireEvent.change(search, { target: { value: query } });
      expect(screen.getAllByRole("option")).toHaveLength(1);
      expect(screen.getByRole("option").textContent).toContain(title);
    }
  });

  it("jumps to keyboard-selected results and restores focus to the trigger", () => {
    const { search, onJump, onClose, parentKeyDown } = setup();
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1].getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onJump).toHaveBeenCalledWith("aws");
    expect(onClose).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Find on canvas" }));
    expect(parentKeyDown).not.toHaveBeenCalled();
  });

  it("filters resource types and handles empty searches without activating a result", () => {
    const { search, onJump } = setup();
    fireEvent.click(screen.getByRole("button", { name: "AWS" }));
    expect(screen.getAllByRole("option")).toHaveLength(1);
    fireEvent.change(search, { target: { value: "missing resource" } });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onJump).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("0 items");
  });

  it("closes on Escape and outside pointer actions", () => {
    const { search, onClose, parentKeyDown } = setup();
    fireEvent.keyDown(search, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    expect(parentKeyDown).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
