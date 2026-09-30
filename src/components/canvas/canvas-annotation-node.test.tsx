import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CanvasAnnotationNode from "./canvas-annotation-node";
import type { CanvasNode } from "@/lib/canvas/types";

const node: CanvasNode = { id: "note1", project_id: "p1", node_type: "annotation", title: "Deployment note", description: "", status: "draft", position_x: 0, position_y: 0, width: 200, height: 150, color: "default", sort_order: 0, claimed_by: "me", version: 1, checkpoints: [], annotation_metadata: { content: "Hello world", color: "yellow" } };
const props = { node, isSelected: true, currentUserId: "me", onSelect: vi.fn(), onDragStart: vi.fn(), onDragEnd: vi.fn() };
afterEach(cleanup);

describe("Canvas notes", () => {
  it("preserves the cursor while typing in the middle of an existing note", () => {
    const selectionSpy = vi.spyOn(HTMLTextAreaElement.prototype, "setSelectionRange");
    render(<CanvasAnnotationNode {...props} onUpdateAnnotation={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit note" }));
    const input = screen.getByRole("textbox", { name: "Note content" }) as HTMLTextAreaElement;
    expect(selectionSpy).toHaveBeenCalledTimes(1);
    input.setSelectionRange(5, 5);
    fireEvent.change(input, { target: { value: "Hello wonderful world" } });
    expect(selectionSpy).toHaveBeenCalledTimes(2);
    selectionSpy.mockRestore();
  });

  it("cancels edits with Escape and loads the latest content when reopened", () => {
    const onUpdateAnnotation = vi.fn();
    const { rerender } = render(<CanvasAnnotationNode {...props} onUpdateAnnotation={onUpdateAnnotation} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit note" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Discard me" } });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(onUpdateAnnotation).not.toHaveBeenCalled();
    rerender(<CanvasAnnotationNode {...props} node={{ ...node, annotation_metadata: { content: "Remote change" } }} onUpdateAnnotation={onUpdateAnnotation} />);
    fireEvent.keyDown(screen.getByRole("group"), { key: "F2" });
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Remote change");
  });

  it("saves a multiline note once with Control+Enter and keeps card geometry fixed", () => {
    const onUpdateAnnotation = vi.fn();
    render(<CanvasAnnotationNode {...props} onUpdateAnnotation={onUpdateAnnotation} />);
    expect((screen.getByRole("group") as HTMLElement).style.height).toBe("150px");
    fireEvent.click(screen.getByRole("button", { name: "Edit note" }));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "First line\nSecond line" } });
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });
    fireEvent.blur(input);
    expect(onUpdateAnnotation).toHaveBeenCalledExactlyOnceWith("note1", "First line\nSecond line");
  });

  it("requests access instead of editing another user's locked note", () => {
    const onRequestClaim = vi.fn();
    render(<CanvasAnnotationNode {...props} node={{ ...node, claimed_by: "other" }} onRequestClaim={onRequestClaim} onUpdateAnnotation={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Request edit access to note" }));
    expect(onRequestClaim).toHaveBeenCalledOnce();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("lets keyboard users reach the Cancel button without prematurely saving", () => {
    const onUpdateAnnotation = vi.fn();
    render(<CanvasAnnotationNode {...props} onUpdateAnnotation={onUpdateAnnotation} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit note" }));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Discard this" } });
    const cancel = screen.getByRole("button", { name: "Cancel note editing" });
    fireEvent.blur(input, { relatedTarget: cancel });
    expect(onUpdateAnnotation).not.toHaveBeenCalled();
    fireEvent.click(cancel);
    expect(onUpdateAnnotation).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
