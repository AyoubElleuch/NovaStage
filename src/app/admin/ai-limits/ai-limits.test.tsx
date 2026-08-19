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

  it("renders the table with users, emails, names, usernames, and quota counts", () => {
    render(<AiLimitsTable initialData={mockUsers} />);

    expect(screen.getByText("alice@example.com")).not.toBeNull();
    expect(screen.getByText("Alice Developer")).not.toBeNull();
    expect(screen.getByText("@alice_dev")).not.toBeNull();
    expect(screen.getByText("7 / 10 left")).not.toBeNull();

    expect(screen.getByText("bob@example.com")).not.toBeNull();
    expect(screen.getByText("Bob Admin")).not.toBeNull();
    expect(screen.getByText("@bob_admin")).not.toBeNull();
    expect(screen.getByText("0 / 10 left")).not.toBeNull();

    expect(screen.getByText("charlie@example.com")).not.toBeNull();
    expect(screen.getByText("10 / 10 left")).not.toBeNull();
  });

  it("filters users via search input by email, name, or username", () => {
    render(<AiLimitsTable initialData={mockUsers} />);

    const searchInput = screen.getByPlaceholderText(/search by name/i);

    // Search by username
    fireEvent.change(searchInput, { target: { value: "alice_dev" } });
    expect(screen.getByText("alice@example.com")).not.toBeNull();
    expect(screen.queryByText("bob@example.com")).toBeNull();

    // Search by full name
    fireEvent.change(searchInput, { target: { value: "Bob" } });
    expect(screen.queryByText("alice@example.com")).toBeNull();
    expect(screen.getByText("bob@example.com")).not.toBeNull();

    // Search by email
    fireEvent.change(searchInput, { target: { value: "charlie@" } });
    expect(screen.getByText("charlie@example.com")).not.toBeNull();
    expect(screen.queryByText("alice@example.com")).toBeNull();
  });

  it("filters users using status tabs", () => {
    render(<AiLimitsTable initialData={mockUsers} />);

    // Click "Depleted (0)" tab
    const depletedTab = screen.getByRole("tab", { name: /Depleted/i });
    fireEvent.click(depletedTab);

    expect(screen.getByText("bob@example.com")).not.toBeNull();
    expect(screen.queryByText("alice@example.com")).toBeNull();
    expect(screen.queryByText("charlie@example.com")).toBeNull();

    // Click "Full (10/10)" tab
    const fullTab = screen.getByRole("tab", { name: /Full/i });
    fireEvent.click(fullTab);

    expect(screen.getByText("charlie@example.com")).not.toBeNull();
    expect(screen.queryByText("bob@example.com")).toBeNull();
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

    // Check Bob's quota updated in UI to 10 / 10 left
    expect(screen.queryByText("0 / 10 left")).toBeNull();
  });

  it("handles Reset All confirmation modal text matching and execution", async () => {
    vi.mocked(resetAllUsersAiQuota).mockResolvedValueOnce({
      success: true,
      message: "All users reset",
    });

    render(<AiLimitsTable initialData={mockUsers} />);

    // Open Reset All modal
    const resetAllTrigger = screen.getByRole("button", { name: /Reset for all/i });
    fireEvent.click(resetAllTrigger);

    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toBeNull();

    const submitButton = screen.getByRole("button", { name: /Reset AI for all/i }) as HTMLButtonElement;
    // Button should be disabled initially
    expect(submitButton.disabled).toBe(true);

    // Type incorrect confirmation text
    const input = screen.getByPlaceholderText(/Type "reset AI for all"/i);
    fireEvent.change(input, { target: { value: "wrong phrase" } });
    expect(submitButton.disabled).toBe(true);

    // Type exact matching text "reset AI for all"
    fireEvent.change(input, { target: { value: "reset AI for all" } });
    expect(submitButton.disabled).toBe(false);

    // Click submit
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(resetAllUsersAiQuota).toHaveBeenCalledTimes(1);
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "All AI Quotas Reset",
        })
      );
    });

    // Modal should close
    expect(screen.queryByRole("dialog")).toBeNull();

    // All users should now be at 10 / 10 left
    const fullIndicators = screen.getAllByText("10 / 10 left");
    expect(fullIndicators.length).toBe(3);
  });

  it("also accepts 'reset AI tokens' in the confirmation modal", () => {
    render(<AiLimitsTable initialData={mockUsers} />);

    fireEvent.click(screen.getByRole("button", { name: /Reset for all/i }));
    const submitButton = screen.getByRole("button", { name: /Reset AI for all/i }) as HTMLButtonElement;
    const input = screen.getByPlaceholderText(/Type "reset AI for all"/i);

    fireEvent.change(input, { target: { value: "reset AI tokens" } });
    expect(submitButton.disabled).toBe(false);
  });

  it("closes the Reset All modal when Cancel or Escape is pressed", () => {
    render(<AiLimitsTable initialData={mockUsers} />);

    fireEvent.click(screen.getByRole("button", { name: /Reset for all/i }));
    expect(screen.getByRole("dialog")).not.toBeNull();

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);
    expect(screen.queryByRole("dialog")).toBeNull();

    // Open again and test Escape key
    fireEvent.click(screen.getByRole("button", { name: /Reset for all/i }));
    expect(screen.getByRole("dialog")).not.toBeNull();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
