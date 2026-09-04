import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import OverviewUsersTable from "./overview-users-table";
import { AdminOverviewUser } from "./actions";

const now = new Date();
const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();

const mockUsers: AdminOverviewUser[] = [
  {
    id: "user-1",
    email: "alice@example.com",
    full_name: "Alice Active",
    username: "alice_act",
    avatar_url: null,
    role: "developer",
    provider: "github",
    created_at: "2026-08-01T00:00:00Z",
    last_sign_in_at: twoHoursAgo,
  },
  {
    id: "user-2",
    email: "bob@example.com",
    full_name: "Bob Admin",
    username: "bob_adm",
    avatar_url: null,
    role: "admin",
    provider: "google",
    created_at: "2026-08-15T00:00:00Z",
    last_sign_in_at: tenDaysAgo,
  },
  {
    id: "user-3",
    email: "carol@example.com",
    full_name: null,
    username: null,
    avatar_url: null,
    role: "developer",
    provider: "email",
    created_at: "2026-08-20T00:00:00Z",
    last_sign_in_at: null,
  },
];

describe("OverviewUsersTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the table headers and user list", () => {
    render(<OverviewUsersTable initialData={mockUsers} />);

    expect(screen.getByText("All registered users")).not.toBeNull();
    expect(screen.getByText("3 signed up")).not.toBeNull();

    expect(screen.getByText("alice@example.com")).not.toBeNull();
    expect(screen.getByText("Alice Active")).not.toBeNull();
    expect(screen.getByText("bob@example.com")).not.toBeNull();
    expect(screen.getByText("carol@example.com")).not.toBeNull();

    // Provider labels
    expect(screen.getByText("github")).not.toBeNull();
    expect(screen.getByText("google")).not.toBeNull();
    expect(screen.getByText("email")).not.toBeNull();
  });

  it("displays relative last signed in time and 'Never signed in' correctly", () => {
    render(<OverviewUsersTable initialData={mockUsers} />);

    // User 1 was 2 hours ago
    expect(screen.getByText("2h ago")).not.toBeNull();

    // User 3 never signed in
    expect(screen.getByText("Never signed in")).not.toBeNull();
  });

  it("filters users using the search box", () => {
    render(<OverviewUsersTable initialData={mockUsers} />);

    const searchInput = screen.getByPlaceholderText("Search users…");
    fireEvent.change(searchInput, { target: { value: "bob" } });

    expect(screen.getByText("bob@example.com")).not.toBeNull();
    expect(screen.queryByText("alice@example.com")).toBeNull();
    expect(screen.queryByText("carol@example.com")).toBeNull();
  });

  it("filters users using quick filter tabs", () => {
    render(<OverviewUsersTable initialData={mockUsers} />);

    // Click Active (7d) tab
    const activeTab = screen.getByRole("button", { name: /Active \(7d\)/i });
    fireEvent.click(activeTab);

    // Alice is active (2h ago)
    expect(screen.getByText("alice@example.com")).not.toBeNull();
    // Bob (10d ago) and Carol (never) should not show
    expect(screen.queryByText("bob@example.com")).toBeNull();
    expect(screen.queryByText("carol@example.com")).toBeNull();

    // Click Never signed in tab
    const neverTab = screen.getByRole("button", { name: /Never signed in/i });
    fireEvent.click(neverTab);

    expect(screen.getByText("carol@example.com")).not.toBeNull();
    expect(screen.queryByText("alice@example.com")).toBeNull();
    expect(screen.queryByText("bob@example.com")).toBeNull();
  });

  it("displays empty state message when search matches no users", () => {
    render(<OverviewUsersTable initialData={mockUsers} />);

    const searchInput = screen.getByPlaceholderText("Search users…");
    fireEvent.change(searchInput, { target: { value: "nonexistentuser" } });

    expect(screen.getByText("No users match your criteria")).not.toBeNull();

    // Reset filters button
    const resetButton = screen.getByRole("button", { name: /Reset filters/i });
    fireEvent.click(resetButton);

    expect(screen.getByText("alice@example.com")).not.toBeNull();
  });
});
