import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CanvasAIAssistant from "./canvas-ai-assistant";

describe("CanvasAIAssistant Component", () => {
  it("renders trigger button correctly", () => {
    render(
      <CanvasAIAssistant isOpen={false} onToggle={() => {}} onClose={() => {}} />
    );

    const button = screen.getByRole("button", { name: /Toggle AI Assistant/i });
    expect(button).not.toBeNull();
    expect(screen.getByText("AI Assistant")).not.toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders floating chat popup when isOpen is true", () => {
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
    expect(
      screen.getByRole("heading", { name: /Generate or Update Workflow with AI/i })
    ).not.toBeNull();
    expect(screen.getByText("7 of 10 requests left")).not.toBeNull();
    expect(
      screen.getByPlaceholderText(/Describe your project or ask to modify the pipeline/i)
    ).not.toBeNull();
  });

  it("allows typing prompt and clearing input", () => {
    render(
      <CanvasAIAssistant isOpen={true} onToggle={() => {}} onClose={() => {}} />
    );

    const textarea = screen.getByPlaceholderText(
      /Describe your project or ask to modify the pipeline/i
    ) as HTMLTextAreaElement;

    fireEvent.change(textarea, {
      target: { value: "Build a payment processing workflow" },
    });
    expect(textarea.value).toBe("Build a payment processing workflow");

    const clearBtn = screen.getByRole("button", { name: "Clear" });
    fireEvent.click(clearBtn);
    expect(textarea.value).toBe("");
  });

  it("calls onSubmitPrompt when clicking Generate", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    render(
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
    fireEvent.change(textarea, {
      target: { value: "Create a modern event pipeline" },
    });

    const generateBtn = screen.getByRole("button", { name: /Generate/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith("Create a modern event pipeline");
    });
  });

  it("displays collision error alert if another collaborator is using AI", async () => {
    const handleSubmit = vi.fn().mockRejectedValue(
      new Error("alex is currently generating a workflow with AI for this project. Please wait to prevent collisions.")
    );

    render(
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
    fireEvent.change(textarea, {
      target: { value: "Concurrent test prompt" },
    });

    const generateBtn = screen.getByRole("button", { name: /Generate/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/is currently generating a workflow with AI for this project/i)
      ).not.toBeNull();
    });
  });

  it("disables input and button when requests quota is depleted", () => {
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

    const textarea = screen.getByPlaceholderText(
      /You have reached your 10 AI workflow limit/i
    );
    expect(textarea.hasAttribute("disabled")).toBe(true);
  });

  it("calls onClose when the close 'X' button is clicked", () => {
    const handleClose = vi.fn();
    render(
      <CanvasAIAssistant isOpen={true} onToggle={() => {}} onClose={handleClose} />
    );

    const closeBtn = screen.getByLabelText("Close AI Assistant");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    const handleClose = vi.fn();
    render(
      <CanvasAIAssistant isOpen={true} onToggle={() => {}} onClose={handleClose} />
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("renders voice input button", () => {
    render(
      <CanvasAIAssistant isOpen={true} onToggle={() => {}} onClose={() => {}} />
    );

    const voiceBtn = screen.getByRole("button", { name: /Voice/i });
    expect(voiceBtn).not.toBeNull();
  });
});
