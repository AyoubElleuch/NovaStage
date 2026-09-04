import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TermsOfServiceModal, TermsOfServiceTrigger } from "./terms-of-service-modal";

describe("TermsOfServiceModal", () => {
  it("renders modal dialog with full terms content and accessibility attributes when open, null when closed", () => {
    const { unmount } = render(<TermsOfServiceModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    unmount();

    render(<TermsOfServiceModal isOpen={true} onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByRole("heading", { name: "Terms of Use" })).not.toBeNull();
    expect(screen.getByText("NovaStage Platform Terms & User Agreement")).not.toBeNull();

    // Check key sections
    expect(screen.getByRole("heading", { name: "1. Acceptance of Terms" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "4. Canvas AI Assistant & Fair Use" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "7. Account Deletion & Data Purge" })).not.toBeNull();
  });

  it("handles all dismissal mechanisms: close icon, bottom button, Escape key, and backdrop click", () => {
    const handleClose = vi.fn();
    render(<TermsOfServiceModal isOpen={true} onClose={handleClose} />);

    // 1. Close icon
    fireEvent.click(screen.getByRole("button", { name: "Close terms of service dialog" }));
    expect(handleClose).toHaveBeenCalledTimes(1);

    // 2. Bottom Close button
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(handleClose).toHaveBeenCalledTimes(2);

    // 3. Escape key
    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(3);

    // 4. Backdrop click
    const backdrop = screen.getByRole("presentation");
    fireEvent.mouseDown(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(4);
  });
});

describe("TermsOfServiceTrigger", () => {
  it("supports inline and sidebar variants, opening modal on click", () => {
    const { unmount } = render(<TermsOfServiceTrigger>Terms of Use</TermsOfServiceTrigger>);
    const trigger = screen.getByRole("button", { name: "Terms of Use" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).not.toBeNull();
    unmount();

    // Sidebar variant
    render(<TermsOfServiceTrigger variant="sidebar-button" collapsed={true} />);
    const sidebarTrigger = screen.getByRole("button");
    expect(sidebarTrigger.getAttribute("title")).toBe("Terms of Use");
    fireEvent.click(sidebarTrigger);
    expect(screen.getByRole("dialog")).not.toBeNull();
  });
});
