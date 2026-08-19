import { describe, it, expect } from "vitest";
import { isProfileComplete } from "@/lib/auth/session";

describe("Onboarding & Profile Completion Verification", () => {
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
      expect(passed).toBe(1); // Only small letter
    });
  });
});
