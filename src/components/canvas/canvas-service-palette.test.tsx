import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CanvasServicePalette from "./canvas-service-palette";
import { AWS_SERVICE_REGISTRY } from "./aws-icons";

afterEach(cleanup);

describe("AWS service palette", () => {
  it("focuses search, finds multi-word category/service queries, and adds the first result with Enter", () => {
    const onAddService = vi.fn();
    render(<CanvasServicePalette isOpen onClose={vi.fn()} onAddService={onAddService} />);
    const search = screen.getByRole("searchbox", { name: "Search AWS services" });
    expect(document.activeElement).toBe(search);
    expect(screen.getByText(String(Object.keys(AWS_SERVICE_REGISTRY).length))).not.toBeNull();
    fireEvent.change(search, { target: { value: "compute lambda" } });
    expect(screen.getByRole("button", { name: "Add AWS Lambda to canvas" })).not.toBeNull();
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onAddService).toHaveBeenCalledWith("lambda");
    expect(screen.getByText("Lambda added to canvas")).not.toBeNull();
    fireEvent.change(search, { target: { value: "serverless function" } });
    expect(screen.getByRole("button", { name: "Add AWS Lambda to canvas" })).not.toBeNull();
  });

  it("combines search with category filtering and lets users recover from an empty result", () => {
    render(<CanvasServicePalette isOpen onClose={vi.fn()} onAddService={vi.fn()} />);
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "lambda" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "storage" } });
    expect(screen.getByText("No matching services")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect((search as HTMLInputElement).value).toBe("");
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("");
    expect(screen.getByText("Popular services")).not.toBeNull();
  });

  it("moves keyboard focus to results and closes with Escape without triggering canvas shortcuts", () => {
    const onClose = vi.fn();
    const parentKeyDown = vi.fn();
    render(<div onKeyDown={parentKeyDown}><CanvasServicePalette isOpen onClose={onClose} onAddService={vi.fn()} /></div>);
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "lambda" } });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add AWS Lambda to canvas" }));
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    expect(parentKeyDown).not.toHaveBeenCalled();
  });
});
