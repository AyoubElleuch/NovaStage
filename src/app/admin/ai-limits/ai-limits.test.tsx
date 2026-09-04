import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AiLimitsTable from "./ai-limits-table";
import { UserAiLimitRecord, resetUserAiQuota, resetAllUsersAiQuota } from "../actions";

const mockNotify = vi.fn();
vi.mock("@/components/notifications/notification-provider", () => ({
  useNotifications: () => ({
    notify: mockNotify,
  }),
}));

vi.mock("../actions", () => ({
  resetUserAiQuota: vi.fn(),
  resetAllUsersAiQuota: vi.fn(),
}));

const mockUsers: UserAiLimitRecord[] = [
  {
    id: "user-1",
    email: "alice@example.com",
    full_name: "Alice Developer",
    username: "alice_dev",
    avatar_url: null,
    role: "developer",
    ai_requests_count: 3,
    ai_requests_remaining: 7,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  },
  {
    id: "user-2",
    email: "bob@example.com",
    full_name: "Bob Admin",
    username: "bob_admin",
    avatar_url: null,
    role: "admin",
    ai_requests_count: 10,
    ai_requests_remaining: 0,
    created_at: "2026-01-03T00:00:00Z",
    updated_at: "2026-01-04T00:00:00Z",
  },
  {
    id: "user-3",
    email: "charlie@example.com",
    full_name: null,
    username: null,
    avatar_url: null,
    role: "developer",
    ai_requests_count: 0,
    ai_requests_remaining: 10,
    created_at: "2026-01-05T00:00:00Z",
    updated_at: "2026-01-06T00:00:00Z",
  },
];

describe("AiLimitsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the table and filters users by search and status tabs", () => {
    render(<AiLimitsTable initialData={mockUsers} />);

    // Renders table data
    expect(screen.getByText("alice@example.com")).not.toBeNull();
    expect(screen.getByText("Alice Developer")).not.toBeNull();
    expect(screen.getByText("@alice_dev")).not.toBeNull();
    expect(screen.getByText("7 / 10 left")).not.toBeNull();

    expect(screen.getByText("bob@example.com")).not.toBeNull();
    expect(screen.getByText("0 / 10 left")).not.toBeNull();

    // Filters via search input
    const searchInput = screen.getByPlaceholderText(/search by name/i);
    fireEvent.change(searchInput, { target: { value: "alice_dev" } });
    expect(screen.getByText("alice@example.com")).not.toBeNull();
    expect(screen.queryByText("bob@example.com")).toBeNull();

    fireEvent.change(searchInput, { target: { value: "" } });

    // Filters via status tab
    const depletedTab = screen.getByRole("tab", { name: /Depleted/i });
    fireEvent.click(depletedTab);
    expect(screen.getByText("bob@example.com")).not.toBeNull();
    expect(screen.queryByText("alice@example.com")).toBeNull();
  });

  it("resets individual user quota when reset button is clicked", async () => {
    vi.mocked(resetUserAiQuota).mockResolvedValueOnce({
      success: true,
      message: "AI quota reset to 10/10",
    });

    render(<AiLimitsTable initialData={mockUsers} />);

    const resetButtons = screen.getAllByRole("button", { name: /Reset to 10\/10/i });
    expect(resetButtons.length).toBe(3);

    // Reset Bob (who was at 0/10)
    fireEvent.click(resetButtons[1]);

    await waitFor(() => {
      expect(resetUserAiQuota).toHaveBeenCalledWith("user-2");
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "AI Quota Reset",
        })
      );
    });

    expect(screen.queryByText("0 / 10 left")).toBeNull();
  });

  it("handles the full Reset All confirmation modal workflow: open, cancel, validation, and execution", async () => {
    vi.mocked(resetAllUsersAiQuota).mockResolvedValueOnce({
      success: true,
      message: "All users reset",
    });

    render(<AiLimitsTable initialData={mockUsers} />);

    // 1. Open and test Cancel
    fireEvent.click(screen.getByRole("button", { name: /Reset for all/i }));
    expect(screen.getByRole("dialog")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    // 2. Open again and test validation + execution
    fireEvent.click(screen.getByRole("button", { name: /Reset for all/i }));
    const submitButton = screen.getByRole("button", { name: /Reset AI for all/i }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);

    const input = screen.getByPlaceholderText(/Type "reset AI for all"/i);
    fireEvent.change(input, { target: { value: "invalid text" } });
    expect(submitButton.disabled).toBe(true);

    fireEvent.change(input, { target: { value: "reset AI for all" } });
    expect(submitButton.disabled).toBe(false);

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(resetAllUsersAiQuota).toHaveBeenCalledTimes(1);
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "All AI Quotas Reset",
        })
      );
    });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getAllByText("10 / 10 left").length).toBe(3);
  });
});
