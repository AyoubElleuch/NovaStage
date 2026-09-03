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

describe("LoginForm — Beta v1.0.0 Direct Sign Up & Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders in login mode by default with Beta v1.0.0 badge", () => {
    render(<LoginForm initialMode="login" />);
    expect(screen.getByText("Beta v1.0.0")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Log in" })).toBeDefined();
    expect(screen.getByRole("button", { name: /continue with github/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /^log in$/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeDefined();
  });

  it("renders in sign up mode when initialMode is signup", () => {
    render(<LoginForm initialMode="signup" />);
    expect(screen.getByText("Beta v1.0.0")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Create an account" })).toBeDefined();
    expect(screen.getByLabelText(/full name/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /sign up with github/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /create account/i })).toBeDefined();
  });

  it("validates required fields and password length on sign up", async () => {
    render(<LoginForm initialMode="signup" />);

    // Attempt empty submit
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText("Enter your email address.")).toBeDefined();

    // Fill valid email but short password
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: "input" }), {
      target: { value: "short" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(
      await screen.findByText("Password must be at least 8 characters long.")
    ).toBeDefined();
  });

  it("submits sign up form and calls authActions.signUp", async () => {
    vi.mocked(authActions.signUp).mockResolvedValue({
      success: true,
      message: "Verification email sent.",
    });

    render(<LoginForm initialMode="signup" />);

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Ada Lovelace" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "ada@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i, { selector: "input" }), {
      target: { value: "securePassword123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(authActions.signUp).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Check your email")).toBeDefined();
  });

  it("toggles mode from login to signup when toggle button is clicked", () => {
    render(<LoginForm initialMode="login" />);
    expect(screen.getByRole("heading", { name: "Log in" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(screen.getByRole("heading", { name: "Create an account" })).toBeDefined();
    expect(screen.getByLabelText(/full name/i)).toBeDefined();
  });
});
