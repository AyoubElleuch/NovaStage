import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { isProfileComplete } from "@/lib/auth/session";
import OnboardingFlow from "./onboarding-flow";

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock completeOnboarding action
vi.mock("./actions", () => ({
  completeOnboarding: vi.fn().mockResolvedValue({ success: true }),
}));

describe("Onboarding & Profile Completion Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isProfileComplete guard", () => {
    it("returns false for undefined or null profile", () => {
      expect(isProfileComplete(undefined)).toBe(false);
      expect(isProfileComplete(null)).toBe(false);
    });

    it("returns false if full_name is missing, null, or empty string", () => {
      expect(isProfileComplete({ full_name: null, username: "username" })).toBe(false);
      expect(isProfileComplete({ full_name: "", username: "username" })).toBe(false);
      expect(isProfileComplete({ full_name: "   ", username: "username" })).toBe(false);
    });

    it("returns false if username is missing, null, or empty string", () => {
      expect(isProfileComplete({ full_name: "John Doe", username: null })).toBe(false);
      expect(isProfileComplete({ full_name: "John Doe", username: "" })).toBe(false);
      expect(isProfileComplete({ full_name: "John Doe", username: "   " })).toBe(false);
    });

    it("returns true when both full_name and username have non-whitespace content", () => {
      expect(isProfileComplete({ full_name: "Jane Doe", username: "janedoe" })).toBe(true);
      expect(isProfileComplete({ full_name: "Alex", username: "alex123" })).toBe(true);
    });
  });

  describe("Password requirements checks", () => {
    const passwordRequirements = [
      { label: "8+ characters", test: (password: string) => password.length >= 8 },
      { label: "Capital letter", test: (password: string) => /[A-Z]/.test(password) },
      { label: "Small letter", test: (password: string) => /[a-z]/.test(password) },
      { label: "Number", test: (password: string) => /\d/.test(password) },
      { label: "Special character", test: (password: string) => /[^A-Za-z0-9]/.test(password) },
    ];

    it("evaluates strong passwords satisfying all requirements", () => {
      const password = "Password123!";
      const passed = passwordRequirements.filter(({ test }) => test(password)).length;
      expect(passed).toBe(5);
    });

    it("evaluates weak passwords failing multiple criteria", () => {
      const password = "pass";
      const passed = passwordRequirements.filter(({ test }) => test(password)).length;
      expect(passed).toBe(1);
    });
  });

  describe("OnboardingFlow 4-Step UI & Terms of Service Integration", () => {
    it("renders Step 1 initially and advances through all 4 steps", () => {
      render(<OnboardingFlow />);

      // Step 1: Full name
      expect(screen.getByText("Welcome to NovaStage")).toBeDefined();
      expect(screen.getByText("Step 1 of 4")).toBeDefined();
      expect(screen.getByText("0%")).toBeDefined();

      const fullNameInput = screen.getByLabelText("Full name");
      fireEvent.change(fullNameInput, { target: { value: "Alex Morgan" } });
      fireEvent.click(screen.getByRole("button", { name: /Next/i }));

      // Step 2: Username
      expect(screen.getByText("Choose your username")).toBeDefined();
      expect(screen.getByText("Step 2 of 4")).toBeDefined();
      expect(screen.getByText("25%")).toBeDefined();

      const usernameInput = screen.getByLabelText("Username");
      fireEvent.change(usernameInput, { target: { value: "alexmorgan" } });
      fireEvent.click(screen.getByRole("button", { name: /Next/i }));

      // Step 3: Password
      expect(screen.getByText("Update password")).toBeDefined();
      expect(screen.getByText("Step 3 of 4")).toBeDefined();
      expect(screen.getByText("50%")).toBeDefined();

      const passwordInput = screen.getByLabelText("New password");
      const confirmInput = screen.getByLabelText("Confirm password");
      fireEvent.change(passwordInput, { target: { value: "NovaStage2026!" } });
      fireEvent.change(confirmInput, { target: { value: "NovaStage2026!" } });
      fireEvent.click(screen.getByRole("button", { name: /Next/i }));

      // Step 4: Terms of Service
      expect(screen.getByRole("heading", { name: "Terms of Service" })).toBeDefined();
      expect(screen.getByText("Step 4 of 4")).toBeDefined();
      expect(screen.getByText("75%")).toBeDefined();

      // Checkbox is an HTML input element with type="checkbox"
      const checkbox = screen.getByRole("checkbox", {
        name: /I have read and agree to the Terms of Service and Privacy Policy/i,
      }) as HTMLInputElement;
      expect(checkbox).toBeDefined();
      expect(checkbox.type).toBe("checkbox");
      // Initially disabled before scrolling
      expect(checkbox.disabled).toBe(true);

      const finishButton = screen.getByRole("button", { name: /Finish/i }) as HTMLButtonElement;
      expect(finishButton.disabled).toBe(true);

      // Simulate scrolling to the bottom of the terms container
      const scrollContainer = screen.getByLabelText("Terms of Service Agreement");
      Object.defineProperty(scrollContainer, "scrollHeight", { value: 600, configurable: true });
      Object.defineProperty(scrollContainer, "scrollTop", { value: 400, configurable: true });
      Object.defineProperty(scrollContainer, "clientHeight", { value: 200, configurable: true });
      fireEvent.scroll(scrollContainer);

      // Checkbox is now enabled
      expect(checkbox.disabled).toBe(false);
      expect(screen.getByText("You have reviewed the terms.")).toBeDefined();

      // Click checkbox
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);

      // Finish button is enabled
      expect(finishButton.disabled).toBe(false);
    });

    it("allows navigating Back from Step 4 to Step 3, Step 2, and Step 1", () => {
      render(
        <OnboardingFlow
          initialFullName="Alex Morgan"
          initialUsername="alexmorgan"
        />
      );

      // Advance Step 1 -> Step 2
      fireEvent.click(screen.getByRole("button", { name: /Next/i }));

      // Advance Step 2 -> Step 3
      fireEvent.click(screen.getByRole("button", { name: /Next/i }));

      // Enter matching passwords to advance to Step 4
      const passwordInput = screen.getByLabelText("New password");
      const confirmInput = screen.getByLabelText("Confirm password");
      fireEvent.change(passwordInput, { target: { value: "NovaStage2026!" } });
      fireEvent.change(confirmInput, { target: { value: "NovaStage2026!" } });
      fireEvent.click(screen.getByRole("button", { name: /Next/i }));

      // Verify at Step 4
      expect(screen.getByRole("heading", { name: "Terms of Service" })).toBeDefined();

      // Click Back -> Step 3
      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      expect(screen.getByText("Update password")).toBeDefined();

      // Click Back -> Step 2
      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      expect(screen.getByText("Choose your username")).toBeDefined();

      // Click Back -> Step 1
      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      expect(screen.getByText("Welcome to NovaStage")).toBeDefined();
    });
  });
});
