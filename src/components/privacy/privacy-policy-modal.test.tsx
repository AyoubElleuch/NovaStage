import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PrivacyPolicyModal, PrivacyPolicyTrigger } from "./privacy-policy-modal";

describe("PrivacyPolicyModal", () => {
  it("does not render when isOpen is false", () => {
    render(<PrivacyPolicyModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders modal dialog with full policy content when isOpen is true", () => {
    render(<PrivacyPolicyModal isOpen={true} onClose={() => {}} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Privacy Policy" })).not.toBeNull();

    // Verify key privacy principles from codebase
    expect(screen.getByText(/We do not sell your personal or project data/i)).not.toBeNull();
    expect(screen.getByText(/Information We Collect/i)).not.toBeNull();
    expect(screen.getByText(/AI Usage Quotas/i)).not.toBeNull();
    expect(screen.getByText(/Artificial Intelligence & Workflow Generation/i)).not.toBeNull();
    expect(screen.getByText(/Platform-Managed AI & API Keys/i)).not.toBeNull();
    expect(screen.getByText(/Zero Prompt Logging or Storage/i)).not.toBeNull();
    expect(screen.getByText(/Canvas Artifact Storage/i)).not.toBeNull();
    expect(screen.getByText(/No AI Model Training/i)).not.toBeNull();
    expect(screen.getByText(/Ephemeral Real-Time Collaboration/i)).not.toBeNull();
    expect(screen.getByText(/Zero Selling & Zero Behavioral Tracking/i)).not.toBeNull();
    expect(screen.getByText(/Account Deletion & Total Data Purge/i)).not.toBeNull();
    expect(screen.getByText(/Data Security & Isolation/i)).not.toBeNull();
  });

  it("calls onClose when the close 'X' button is clicked", () => {
    const handleClose = vi.fn();
    render(<PrivacyPolicyModal isOpen={true} onClose={handleClose} />);

    const closeIconButton = screen.getByLabelText("Close privacy policy dialog");
    fireEvent.click(closeIconButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the bottom 'Close' button is clicked", () => {
    const handleClose = vi.fn();
    render(<PrivacyPolicyModal isOpen={true} onClose={handleClose} />);

    const closeButton = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    const handleClose = vi.fn();
    render(<PrivacyPolicyModal isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    const handleClose = vi.fn();
    render(<PrivacyPolicyModal isOpen={true} onClose={handleClose} />);

    const backdrop = screen.getByRole("presentation");
    fireEvent.mouseDown(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe("PrivacyPolicyTrigger", () => {
  it("renders as an inline link by default and opens modal on click", () => {
    render(<PrivacyPolicyTrigger>Privacy Policy</PrivacyPolicyTrigger>);

    const trigger = screen.getByRole("button", { name: "Privacy Policy" });
    expect(trigger).not.toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).not.toBeNull();
  });

  it("renders as a sidebar button and toggles modal", () => {
    render(<PrivacyPolicyTrigger variant="sidebar-button" collapsed={false} />);

    const sidebarButton = screen.getByRole("button", { name: /Privacy Policy/i });
    expect(sidebarButton).not.toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(sidebarButton);
    expect(screen.getByRole("dialog")).not.toBeNull();
  });

  it("renders collapsed sidebar button with title attribute", () => {
    render(<PrivacyPolicyTrigger variant="sidebar-button" collapsed={true} />);

    const collapsedButton = screen.getByTitle("Privacy Policy");
    expect(collapsedButton).not.toBeNull();

    fireEvent.click(collapsedButton);
    expect(screen.getByRole("dialog")).not.toBeNull();
  });
});
