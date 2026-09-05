import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SubscriptionsTable from "./subscriptions-table";
import { AdminSubscriptionUser } from "../actions";
import * as adminActions from "../actions";

vi.mock("../actions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../actions")>();
  return {
    ...actual,
    updateUserSubscriptionPlan: vi.fn(),
  };
});

const mockUsers: AdminSubscriptionUser[] = [
  {
    id: "user-1",
    email: "alice@example.com",
    full_name: "Alice Free",
    username: "alice",
    avatar_url: null,
    role: "developer",
    plan: "free",
    ai_requests_count: 3,
    created_at: "2026-08-01T00:00:00Z",
  },
  {
    id: "user-2",
    email: "bob@example.com",
    full_name: "Bob Plus",
    username: "bob",
    avatar_url: null,
    role: "developer",
    plan: "plus",
    ai_requests_count: 12,
    created_at: "2026-08-15T00:00:00Z",
  },
  {
    id: "user-3",
    email: "charlie@example.com",
    full_name: "Charlie Pro",
    username: "charlie",
    avatar_url: null,
    role: "super_admin",
    plan: "pro",
    ai_requests_count: 25,
    created_at: "2026-08-20T00:00:00Z",
  },
];

describe("SubscriptionsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders metric cards and user table correctly", () => {
    render(<SubscriptionsTable initialData={mockUsers} />);

    expect(screen.getByText("Total Users")).not.toBeNull();
    expect(screen.getByText("Free Tier")).not.toBeNull();
    expect(screen.getAllByText(/Plus \(\$1.99\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pro \(\$4.99\)/i).length).toBeGreaterThan(0);

    expect(screen.getByText("alice@example.com")).not.toBeNull();
    expect(screen.getByText("bob@example.com")).not.toBeNull();
    expect(screen.getByText("charlie@example.com")).not.toBeNull();
  });

  it("filters users using the tier tabs", () => {
    render(<SubscriptionsTable initialData={mockUsers} />);

    const plusTab = screen.getByRole("button", { name: /^plus$/i });
    fireEvent.click(plusTab);

    expect(screen.queryByText("alice@example.com")).toBeNull();
    expect(screen.getByText("bob@example.com")).not.toBeNull();
    expect(screen.queryByText("charlie@example.com")).toBeNull();
  });

  it("handles Super Admin plan update via dropdown", async () => {
    vi.mocked(adminActions.updateUserSubscriptionPlan).mockResolvedValue({
      success: true,
      message: "Updated plan for alice@example.com to PLUS.",
    });

    render(<SubscriptionsTable initialData={mockUsers} />);

    const select = screen.getByLabelText("Change plan for alice@example.com");
    fireEvent.change(select, { target: { value: "plus" } });

    await waitFor(() => {
      expect(adminActions.updateUserSubscriptionPlan).toHaveBeenCalledWith("user-1", "plus");
      expect(screen.getByText(/Updated plan for alice@example.com to PLUS/i)).not.toBeNull();
    });
  });
});
