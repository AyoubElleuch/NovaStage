import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlatformAnnouncementBanner from "./platform-announcement-banner";
import type { PlatformAnnouncement } from "@/lib/announcements/types";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: createClientMock,
}));

function createSupabaseMock() {
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);

  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);

  return {
    from: vi.fn().mockReturnValue(query),
    channel: vi.fn().mockReturnValue(channel),
    removeChannel: vi.fn().mockResolvedValue(undefined),
  };
}

const activeAnnouncement: PlatformAnnouncement = {
  id: "platform",
  message: "Scheduled maintenance starts at 22:00 UTC.",
  severity: "high",
  is_active: true,
  updated_at: "2026-09-04T12:00:00Z",
  updated_by: "admin-1",
};

describe("PlatformAnnouncementBanner", () => {
  beforeEach(() => {
    createClientMock.mockReturnValue(createSupabaseMock());
  });

  it("renders the active announcement at the top-level banner", async () => {
    render(<PlatformAnnouncementBanner initialAnnouncement={activeAnnouncement} />);

    const banner = screen.getByRole("status");
    expect(banner.textContent).toContain(activeAnnouncement.message);
    expect(banner.className).toContain("bg-red-50");

    await waitFor(() => {
      expect(createClientMock).toHaveBeenCalledTimes(1);
    });
  });

  it("removes the banner when a live refresh finds no active announcement", async () => {
    const supabase = createSupabaseMock();
    const channel = supabase.channel();
    channel.on.mockImplementation((_type: string, _config: unknown, callback: () => void) => {
      if (_type === "broadcast") callback();
      return channel;
    });
    createClientMock.mockReturnValue(supabase);

    render(<PlatformAnnouncementBanner initialAnnouncement={activeAnnouncement} />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).toBeNull();
    });
  });
});