import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CanvasServiceNode from "./canvas-service-node";
import type { CanvasNode } from "@/lib/canvas/types";

const node: CanvasNode = {
  id: "aws1", project_id: "p1", node_type: "aws_service", title: "Worker", description: "", status: "draft",
  position_x: 0, position_y: 0, width: 200, height: 220, color: "default", sort_order: 0,
  claimed_by: "me", version: 1, checkpoints: [],
  aws_metadata: { serviceId: "lambda", category: "compute", region: "eu-west-1", config: { runtime: "nodejs22.x", memory: "256", timeout: "30" } },
};
const props = { node, isSelected: false, isLinking: false, currentUserId: "me", onSelect: vi.fn(), onDragStart: vi.fn(), onDragEnd: vi.fn(), onStartLink: vi.fn(), onRequestClaim: vi.fn() };
afterEach(cleanup);

describe("AWS service cards", () => {
  it("describes architecture status and shows labeled configuration values", () => {
    render(<CanvasServiceNode {...props} />);
    expect(screen.getByRole("group", { name: /Worker, AWS Lambda, Planned, eu-west-1/ })).not.toBeNull();
    expect(screen.getByText("runtime")).not.toBeNull();
    expect(screen.getByText("nodejs22.x")).not.toBeNull();
    expect(screen.getByText("+1 more in details")).not.toBeNull();
  });

  it("renders legacy ALB IDs with their canonical icon and networking category without modifying metadata", () => {
    const legacyNode = { ...node, aws_metadata: { serviceId: "alb", category: "compute" as const } };
    render(<CanvasServiceNode {...props} node={legacyNode} />);
    const icon = screen.getByRole("img", { name: "Elastic Load Balancing" });
    expect(icon.getAttribute("src")).toBe("/aws-icons/Elastic-Load-Balancing.svg");
    expect(screen.getByText("Networking & Content Delivery")).not.toBeNull();
    expect(legacyNode.aws_metadata.serviceId).toBe("alb");
  });

  it("starts an edit with the current remote title and cancels with Escape without saving", () => {
    const onUpdateTitle = vi.fn();
    const { rerender } = render(<CanvasServiceNode {...props} onUpdateTitle={onUpdateTitle} />);
    rerender(<CanvasServiceNode {...props} node={{ ...node, title: "Renamed remotely" }} onUpdateTitle={onUpdateTitle} />);
    fireEvent.keyDown(screen.getByRole("group"), { key: "F2" });
    const input = screen.getByRole("textbox", { name: "Resource label" });
    expect((input as HTMLInputElement).value).toBe("Renamed remotely");
    fireEvent.change(input, { target: { value: "Discard this" } });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);
    expect(onUpdateTitle).not.toHaveBeenCalled();
    expect(screen.getByText("Renamed remotely")).not.toBeNull();
  });

  it("commits a renamed resource once with Enter and routes locked edits to an access request", () => {
    const onUpdateTitle = vi.fn();
    const onRequestClaim = vi.fn();
    const { rerender } = render(<CanvasServiceNode {...props} onRequestClaim={onRequestClaim} onUpdateTitle={onUpdateTitle} />);
    fireEvent.doubleClick(screen.getByText("Worker"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "  Queue worker  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);
    expect(onUpdateTitle).toHaveBeenCalledExactlyOnceWith("aws1", "Queue worker");
    rerender(<CanvasServiceNode {...props} node={{ ...node, claimed_by: "other" }} onRequestClaim={onRequestClaim} onUpdateTitle={onUpdateTitle} />);
    fireEvent.doubleClick(screen.getByText("Worker"));
    expect(onRequestClaim).toHaveBeenCalledWith(expect.objectContaining({ claimed_by: "other" }));
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
