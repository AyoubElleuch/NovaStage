import { describe, it, expect } from "vitest";
import { renderWaitlistJoinedEmail } from "./templates/waitlist-joined";
import { renderWaitlistApprovedEmail } from "./templates/waitlist-approved";
import { renderPasswordResetEmail } from "./templates/password-reset";
import {
  sendWaitlistJoinedEmail,
  sendWaitlistApprovedEmail,
  sendPasswordResetEmail,
} from "./resend";

describe("Email Templates & Resend Service", () => {
  describe("Waitlist Joined Template", () => {
    it("renders email with required user email and app link", () => {
      const { subject, html, text } = renderWaitlistJoinedEmail({
        email: "alice@example.com",
        name: "Alice",
        appUrl: "https://novastage.dev",
      });

      expect(subject).toBe("You're on the NovaStage waitlist");
      expect(html).toContain("alice@example.com");
      expect(html).toContain("Hi Alice,");
      expect(html).toContain("https://novastage.dev");
      expect(html).toContain("You're on the list");
      expect(text).toContain("alice@example.com");
      expect(text).toContain("Hi Alice,");
    });

    it("falls back to generic greeting when name is omitted", () => {
      const { html, text } = renderWaitlistJoinedEmail({
        email: "bob@example.com",
      });

      expect(html).toContain("Hello,");
      expect(text).toContain("Hello,");
      expect(html).toContain("bob@example.com");
    });
  });

  describe("Waitlist Approved Template", () => {
    it("renders credentials card with email, password, and login button", () => {
      const { subject, html, text } = renderWaitlistApprovedEmail({
        email: "charlie@example.com",
        temporaryPassword: "TempPassword123!",
        name: "Charlie",
        appUrl: "https://novastage.dev",
      });

      expect(subject).toBe("Welcome to NovaStage — Your account is ready");
      expect(html).toContain("charlie@example.com");
      expect(html).toContain("TempPassword123!");
      expect(html).toContain("https://novastage.dev/login");
      expect(html).toContain("Hi Charlie,");
      expect(html).toContain("Your Login Credentials");
      expect(text).toContain("charlie@example.com");
      expect(text).toContain("TempPassword123!");
      expect(text).toContain("https://novastage.dev/login");
    });
  });

  describe("Password Reset Template", () => {
    it("renders recovery link and security notice", () => {
      const { subject, html, text } = renderPasswordResetEmail({
        email: "dan@example.com",
        resetUrl: "https://novastage.dev/auth/callback?next=/reset-password&code=test-code",
        name: "Dan",
        appUrl: "https://novastage.dev",
      });

      expect(subject).toBe("Reset your NovaStage password");
      expect(html).toContain("dan@example.com");
      expect(html).toContain("Hi Dan,");
      expect(html).toContain("https://novastage.dev/auth/callback?next=/reset-password&code=test-code");
      expect(html).toContain("Reset password");
      expect(text).toContain("dan@example.com");
      expect(text).toContain("This link is valid for 1 hour.");
    });
  });

  describe("Resend Safe Fallback Mode", () => {
    it("safely handles sending without throwing when RESEND_API_KEY is not configured", async () => {
      const resultJoined = await sendWaitlistJoinedEmail({
        email: "dev@example.com",
      });
      expect(resultJoined.success).toBe(true);
      expect(resultJoined.id).toBeDefined();

      const resultApproved = await sendWaitlistApprovedEmail({
        email: "dev@example.com",
        temporaryPassword: "NovaStage2026!",
      });
      expect(resultApproved.success).toBe(true);
      expect(resultApproved.id).toBeDefined();

      const resultReset = await sendPasswordResetEmail({
        email: "dev@example.com",
        resetUrl: "https://novastage.dev/auth/callback?next=/reset-password",
      });
      expect(resultReset.success).toBe(true);
      expect(resultReset.id).toBeDefined();
    });
  });
});
