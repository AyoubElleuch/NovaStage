import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CanvasNotebook from "./canvas-notebook";

describe("CanvasNotebook", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const renderNotebook = () => render(
    <CanvasNotebook projectId="project-1" isOpen onToggle={vi.fn()} onClose={vi.fn()} />
  );

  it("creates, saves, selects, and deletes notebook entries", async () => {
    renderNotebook();
    await screen.findByText("No notes yet");

    fireEvent.click(screen.getByRole("button", { name: "New note" }));
    fireEvent.change(screen.getByLabelText("Entry title"), { target: { value: "API decision" } });
    fireEvent.change(screen.getByLabelText("Entry content"), { target: { value: "Ship the API first" } });
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    fireEvent.change(screen.getByLabelText("Entry title"), { target: { value: "Launch plan" } });

    fireEvent.click(screen.getByRole("button", { name: /^API decision/ }));
    expect((screen.getByLabelText("Entry content") as HTMLTextAreaElement).value).toBe("Ship the API first");

    fireEvent.click(screen.getByLabelText("Delete API decision"));
    expect(screen.queryByText("API decision")).toBeNull();

    const saved = JSON.parse(window.localStorage.getItem("novastage:notebook:project-1:entries") || "{}");
    expect(saved.notes).toHaveLength(1);
    expect(saved.notes[0].title).toBe("Launch plan");
  });

  it("migrates text saved by the previous scratchpad", async () => {
    window.localStorage.setItem("novastage:notebook:project-1:notes", "Existing roadmap context");
    renderNotebook();

    await waitFor(() =>
      expect((screen.getByLabelText("Entry content") as HTMLTextAreaElement).value).toBe(
        "Existing roadmap context"
      )
    );
  });

  it("keeps notes and questions separate", async () => {
    renderNotebook();
    await screen.findByText("No notes yet");
    fireEvent.click(screen.getByRole("tab", { name: /Questions/ }));
    expect(screen.getByText("No questions yet")).not.toBeNull();
  });

  /*
    render(
      <CanvasNotebook
        projectId="project-1"
        isOpen
        onToggle={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Roadmap notes"), {
      target: { value: "Ship the API first" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "Questions" }));
    fireEvent.change(screen.getByLabelText("Open questions"), {
      target: { value: "Who owns deployment?" },
    });

    expect(window.localStorage.getItem("novastage:notebook:project-1:notes")).toBe(
      "Ship the API first"
    );
    expect(window.localStorage.getItem("novastage:notebook:project-1:questions")).toBe(
      "Who owns deployment?"
    );

    fireEvent.click(screen.getByRole("tab", { name: "Notes" }));
    expect((screen.getByLabelText("Roadmap notes") as HTMLTextAreaElement).value).toBe(
      "Ship the API first"
    );
  }); */
});