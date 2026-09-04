import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PrivacyPolicyModal, PrivacyPolicyTrigger } from "./privacy-policy-modal";

describe("PrivacyPolicyModal", () => {
  it("renders modal dialog with full policy content and key principles when open, and null when closed", () => {
    const { unmount } = render(<PrivacyPolicyModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    unmount();

    render(<PrivacyPolicyModal isOpen={true} onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Privacy Policy" })).not.toBeNull();

    // Verify key privacy principles from codebase
    expect(screen.getByText(/We do not sell your personal or project data/i)).not.toBeNull();
    expect(screen.getByText(/Information We Collect/i)).not.toBeNull();
    expect(screen.getByText(/AI Usage Quotas/i)).not.toBeNull();
    expect(screen.getByText(/Artificial Intelligence & Workflow Generation/i)).not.toBeNull();
    expect(screen.getByText(/Zero Selling & Zero Behavioral Tracking/i)).not.toBeNull();
    expect(screen.getByText(/Data Security & Isolation/i)).not.toBeNull();
  });

  it("handles all dismissal mechanisms: close 'X', bottom button, Escape key, and backdrop click", () => {
    const handleClose = vi.fn();
    render(<PrivacyPolicyModal isOpen={true} onClose={handleClose} />);

    // 1. Close icon 'X'
    fireEvent.click(screen.getByLabelText("Close privacy policy dialog"));
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

describe("PrivacyPolicyTrigger", () => {
  it("supports inline and sidebar variants, opening modal on click", () => {
    const { unmount } = render(<PrivacyPolicyTrigger>Privacy Policy</PrivacyPolicyTrigger>);
    const inlineTrigger = screen.getByRole("button", { name: "Privacy Policy" });
    fireEvent.click(inlineTrigger);
    expect(screen.getByRole("dialog")).not.toBeNull();
    unmount();

    // Sidebar variant
    render(<PrivacyPolicyTrigger variant="sidebar-button" collapsed={true} />);
    const sidebarTrigger = screen.getByTitle("Privacy Policy");
    fireEvent.click(sidebarTrigger);
    expect(screen.getByRole("dialog")).not.toBeNull();
  });
});
