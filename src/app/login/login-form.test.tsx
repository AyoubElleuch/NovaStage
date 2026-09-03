import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LoginForm from "./login-form";
import * as authActions from "@/app/auth/actions";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/app/auth/actions", () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  signInWithOAuth: vi.fn(),
  requestPasswordReset: vi.fn(),
}));

describe("LoginForm — Streamlined Sign Up & Instant Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders in login mode by default", () => {
    render(<LoginForm initialMode="login" />);
    expect(screen.getByRole("heading", { name: "Log in" })).toBeDefined();
    expect(screen.getByRole("button", { name: /continue with github/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /^log in$/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeDefined();
  });

  it("renders in sign up mode without full name and with password strength and confirm password", () => {
    render(<LoginForm initialMode="signup" />);
    expect(screen.getByRole("heading", { name: "Create an account" })).toBeDefined();
    // Full name is removed
    expect(screen.queryByLabelText(/full name/i)).toBeNull();
    // Email, Password, Confirm password, and Password strength meter are present
    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/^password$/i)).toBeDefined();
    expect(screen.getByLabelText(/confirm password/i)).toBeDefined();
    expect(screen.getByText("Password strength")).toBeDefined();
    expect(screen.getByRole("button", { name: /create account/i })).toBeDefined();
  });

  it("validates required fields, password length, and password matching on sign up", async () => {
    render(<LoginForm initialMode="signup" />);

    // Attempt empty submit
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText("Enter your email address.")).toBeDefined();

    // Fill valid email but short password
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(
      await screen.findByText("Password must be at least 8 characters long.")
    ).toBeDefined();

    // Fill valid password but mismatched confirm password
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "validPassword123!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "differentPassword123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText("Passwords do not match.")).toBeDefined();
  });

  it("submits sign up form and calls authActions.signUp", async () => {
    vi.mocked(authActions.signUp).mockResolvedValue({
      success: true,
    });

    render(<LoginForm initialMode="signup" />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "securePassword123!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "securePassword123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(authActions.signUp).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Account created!")).toBeDefined();
  });

  it("toggles mode from login to signup when toggle button is clicked", () => {
    render(<LoginForm initialMode="login" />);
    expect(screen.getByRole("heading", { name: "Log in" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(screen.getByRole("heading", { name: "Create an account" })).toBeDefined();
    expect(screen.queryByLabelText(/full name/i)).toBeNull();
    expect(screen.getByLabelText(/confirm password/i)).toBeDefined();
  });
});
