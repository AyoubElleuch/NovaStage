import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TermsOfServiceModal, TermsOfServiceTrigger } from "./terms-of-service-modal";

describe("TermsOfServiceModal", () => {
  it("does not render when isOpen is false", () => {
    render(<TermsOfServiceModal isOpen={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders modal dialog with full terms content when isOpen is true", () => {
    render(<TermsOfServiceModal isOpen={true} onClose={() => {}} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(
      screen.getByRole("heading", { name: "Terms of Use" })
    ).not.toBeNull();
    expect(
      screen.getByText("NovaStage Platform Terms & User Agreement")
    ).not.toBeNull();

    // Check key sections
    expect(
      screen.getByRole("heading", { name: "1. Acceptance of Terms" })
    ).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: "4. Canvas AI Assistant & Fair Use" })
    ).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: "7. Account Deletion & Data Purge" })
    ).not.toBeNull();

    // Check close buttons
    expect(
      screen.getByRole("button", { name: "Close terms of service dialog" })
    ).not.toBeNull();
    expect(screen.getByRole("button", { name: "Close" })).not.toBeNull();
  });

  it("calls onClose when the close icon button is clicked", () => {
    const handleClose = vi.fn();
    render(<TermsOfServiceModal isOpen={true} onClose={handleClose} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Close terms of service dialog" })
    );
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the bottom Close button is clicked", () => {
    const handleClose = vi.fn();
    render(<TermsOfServiceModal isOpen={true} onClose={handleClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    const handleClose = vi.fn();
    render(<TermsOfServiceModal isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking the backdrop", () => {
    const handleClose = vi.fn();
    render(<TermsOfServiceModal isOpen={true} onClose={handleClose} />);

    const backdrop = screen.getByRole("presentation");
    fireEvent.mouseDown(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe("TermsOfServiceTrigger", () => {
  it("renders inline link trigger and opens modal on click", () => {
    render(<TermsOfServiceTrigger>Terms of Use</TermsOfServiceTrigger>);

    const trigger = screen.getByRole("button", { name: "Terms of Use" });
    expect(trigger).not.toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Terms of Use" })).not.toBeNull();
  });

  it("renders sidebar button variant with full text when expanded", () => {
    render(<TermsOfServiceTrigger variant="sidebar-button" collapsed={false} />);

    const trigger = screen.getByRole("button");
    expect(trigger.textContent).toContain("Terms of Use");

    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).not.toBeNull();
  });

  it("renders sidebar button variant without text when collapsed", () => {
    render(<TermsOfServiceTrigger variant="sidebar-button" collapsed={true} />);

    const trigger = screen.getByRole("button");
    expect(trigger.getAttribute("title")).toBe("Terms of Use");
    expect(trigger.textContent).not.toContain("Terms of Use");
  });
});
