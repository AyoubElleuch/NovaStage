import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationProvider, useNotifications } from "./notification-provider";

// Mock next/navigation
const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

function TriggerComponent({
  title,
  message,
  position,
}: {
  title: string;
  message?: string;
  position?: "bottom-left" | "bottom-right";
}) {
  const { notify } = useNotifications();
  return (
    <button
      onClick={() => notify({ title, message, position })}
      type="button"
    >
      Trigger
    </button>
  );
}

describe("NotificationProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/dashboard");
  });

  it("renders notifications on the right side by default on regular dashboard pages", () => {
    render(
      <NotificationProvider>
        <TriggerComponent title="Settings Updated" message="Profile saved" />
      </NotificationProvider>
    );

    const btn = screen.getByText("Trigger");
    act(() => {
      fireEvent.click(btn);
    });

    expect(screen.getByText("Settings Updated")).not.toBeNull();
    expect(screen.getByText("Profile saved")).not.toBeNull();

    const container = screen.getByLabelText("Notifications");
    expect(container.className).toContain("site-notifications");
    expect(container.className).not.toContain("site-notifications--left");
  });

  it("automatically renders notifications on the left side on canvas project routes", () => {
    mockUsePathname.mockReturnValue("/dashboard/projects/nova-canvas");

    render(
      <NotificationProvider>
        <TriggerComponent title="Milestone Created" message="Added to canvas" />
      </NotificationProvider>
    );

    const btn = screen.getByText("Trigger");
    act(() => {
      fireEvent.click(btn);
    });

    expect(screen.getByText("Milestone Created")).not.toBeNull();
    const container = screen.getByLabelText("Notifications");
    expect(container.className).toContain("site-notifications--left");
  });

  it("allows setting explicit position: bottom-left", () => {
    mockUsePathname.mockReturnValue("/dashboard");

    render(
      <NotificationProvider>
        <TriggerComponent
          title="Important Action"
          position="bottom-left"
        />
      </NotificationProvider>
    );

    const btn = screen.getByText("Trigger");
    act(() => {
      fireEvent.click(btn);
    });

    expect(screen.getByText("Important Action")).not.toBeNull();
    const container = screen.getByLabelText("Notifications");
    expect(container.className).toContain("site-notifications--left");
  });
});
