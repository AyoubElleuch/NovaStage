import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ConnectionEditor from "./connection-editor";
import type { CanvasEdge } from "@/lib/canvas/types";

afterEach(cleanup);
const edge: CanvasEdge = { id: "edge", project_id: "project", source_node_id: "s3", target_node_id: "lambda", source_handle: "right", target_handle: "left", edge_type: "data_flow" };

describe("architecture connection editor", () => {
  it("saves a trimmed label and event semantics, then closes", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined), onClose = vi.fn();
    render(<ConnectionEditor edge={edge} onSave={onSave} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Connection label"), { target: { value: "  ObjectCreated  " } });
    fireEvent.change(screen.getByLabelText("Connection type"), { target: { value: "event" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledWith("edge", { label: "ObjectCreated", edge_type: "event" });
  });
  it("retains edits and displays a save failure without closing", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Claim a connected resource")), onClose = vi.fn();
    render(<ConnectionEditor edge={edge} onSave={onSave} onClose={onClose} />);
    fireEvent.click(screen.getByText("Save"));
    expect((await screen.findByRole("alert")).textContent).toContain("Claim a connected resource");
    expect(onClose).not.toHaveBeenCalled();
  });
  it("cancels without persisting", () => {
    const onSave = vi.fn(), onClose = vi.fn();
    render(<ConnectionEditor edge={edge} onSave={onSave} onClose={onClose} />);
    fireEvent.keyDown(screen.getByLabelText("Connection label"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });
});
