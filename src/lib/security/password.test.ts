import { describe, it, expect } from "vitest";
import { generateSecurePassword } from "./password";

describe("generateSecurePassword", () => {
  it("generates a password of default length 16", () => {
    const password = generateSecurePassword();
    expect(password.length).toBe(16);
  });

  it("respects custom lengths with minimum 12", () => {
    expect(generateSecurePassword(20).length).toBe(20);
    expect(generateSecurePassword(8).length).toBe(12); // Enforces minimum 12
  });

  it("contains uppercase, lowercase, number, and special characters", () => {
    for (let i = 0; i < 50; i++) {
      const password = generateSecurePassword();
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
      expect(/[!@#$%^&*-_+=]/.test(password)).toBe(true);
    }
  });

  it("generates unique passwords on multiple calls", () => {
    const passwords = new Set<string>();
    for (let i = 0; i < 100; i++) {
      passwords.add(generateSecurePassword());
    }
    expect(passwords.size).toBe(100);
  });
});
