import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CanvasAIAssistant from "./canvas-ai-assistant";

describe("CanvasAIAssistant Component", () => {
  it("renders trigger button and opens floating chat popup with quota indicator and inputs", () => {
    const { unmount } = render(
      <CanvasAIAssistant isOpen={false} onToggle={() => {}} onClose={() => {}} />
    );

    const button = screen.getByRole("button", { name: /Toggle AI Assistant/i });
    expect(button).not.toBeNull();
    expect(screen.getByText("AI Assistant")).not.toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    unmount();

    render(
      <CanvasAIAssistant
        isOpen={true}
        onToggle={() => {}}
        onClose={() => {}}
        requestsRemaining={7}
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toBeNull();
    expect(screen.getByRole("heading", { name: /Generate or Update Workflow with AI/i })).not.toBeNull();
    expect(screen.getByText("7 of 10 requests left")).not.toBeNull();
    expect(screen.getByPlaceholderText(/Describe your project or ask to modify the pipeline/i)).not.toBeNull();
    expect(screen.getByRole("button", { name: /Voice/i })).not.toBeNull();
  });

  it("handles prompt typing, clearing input, successful generation submission, and dialog close", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <CanvasAIAssistant
        isOpen={true}
        onToggle={() => {}}
        onClose={handleClose}
        onSubmitPrompt={handleSubmit}
      />
    );

    const textarea = screen.getByPlaceholderText(
      /Describe your project or ask to modify the pipeline/i
    ) as HTMLTextAreaElement;

    // Test typing and clear
    fireEvent.change(textarea, { target: { value: "Temporary draft" } });
    expect(textarea.value).toBe("Temporary draft");
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(textarea.value).toBe("");

    // Test submission
    fireEvent.change(textarea, { target: { value: "Create an event pipeline" } });
    fireEvent.click(screen.getByRole("button", { name: /Generate/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith("Create an event pipeline", "workflow");
    });

    // Test close button
    fireEvent.click(screen.getByLabelText("Close AI Assistant"));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("handles collaborator collision error and quota depletion states", async () => {
    const handleSubmit = vi.fn().mockRejectedValue(
      new Error("alex is currently generating a workflow with AI for this project. Please wait to prevent collisions.")
    );

    const { unmount } = render(
      <CanvasAIAssistant
        isOpen={true}
        onToggle={() => {}}
        onClose={() => {}}
        onSubmitPrompt={handleSubmit}
      />
    );

    const textarea = screen.getByPlaceholderText(
      /Describe your project or ask to modify the pipeline/i
    );
    fireEvent.change(textarea, { target: { value: "Concurrent test prompt" } });
    fireEvent.click(screen.getByRole("button", { name: /Generate/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/is currently generating a workflow with AI for this project/i)
      ).not.toBeNull();
    });
    unmount();

    // Test quota depletion state
    render(
      <CanvasAIAssistant
        isOpen={true}
        onToggle={() => {}}
        onClose={() => {}}
        requestsRemaining={0}
      />
    );

    expect(screen.getByText("0 / 10 remaining")).not.toBeNull();
    expect(screen.getByText("Limit Reached")).not.toBeNull();
    const disabledTextarea = screen.getByPlaceholderText(/You have reached your 10 AI workflow limit/i);
    expect(disabledTextarea.hasAttribute("disabled")).toBe(true);
  });
});
