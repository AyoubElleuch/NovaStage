import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnnouncementEditor from "./announcement-editor";
import { savePlatformAnnouncement } from "../actions";
import type { PlatformAnnouncement } from "@/lib/announcements/types";

const { notifyMock } = vi.hoisted(() => ({
  notifyMock: vi.fn(),
}));

vi.mock("@/components/notifications/notification-provider", () => ({
  useNotifications: () => ({ notify: notifyMock }),
}));

vi.mock("../actions", () => ({
  savePlatformAnnouncement: vi.fn(),
}));

const initialAnnouncement: PlatformAnnouncement = {
  id: "platform",
  message: "Current platform message",
  severity: "medium",
  is_active: false,
  updated_at: "2026-09-04T12:00:00Z",
  updated_by: null,
};

describe("AnnouncementEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(savePlatformAnnouncement).mockResolvedValue({
      success: true,
      message: "Announcement updated.",
    });
  });

  it("activates and disables the current announcement", async () => {
    render(<AnnouncementEditor initialAnnouncement={initialAnnouncement} />);

    const messageInput = screen.getByLabelText("Message");
    fireEvent.change(messageInput, { target: { value: "New outage notice" } });
    fireEvent.click(screen.getByDisplayValue("high"));
    fireEvent.click(screen.getByRole("button", { name: /Activate for everyone/i }));

    await waitFor(() => {
      expect(savePlatformAnnouncement).toHaveBeenCalledWith("New outage notice", "high", true);
    });
    expect(screen.getByText("Active")).not.toBeNull();

    const disableButton = screen.getByRole("button", { name: /Disable announcement/i }) as HTMLButtonElement;
    await waitFor(() => {
      expect(disableButton.disabled).toBe(false);
    });
    fireEvent.click(disableButton);

    await waitFor(() => {
      expect(savePlatformAnnouncement).toHaveBeenLastCalledWith("New outage notice", "high", false);
    });
    expect(screen.getByText("Disabled")).not.toBeNull();
  });
});