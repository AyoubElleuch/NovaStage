import { describe, it, expect } from "vitest";
import {
  generateInviteCode,
  slugify,
  formatRelativeTime,
  formatJoinedDate,
} from "./projects";

describe("Projects Utilities & Formatters", () => {
  describe("generateInviteCode", () => {
    it("generates invite codes matching the NS-[A-F0-9]{5} format", () => {
      for (let i = 0; i < 20; i++) {
        const code = generateInviteCode();
        expect(code).toMatch(/^NS-[0-9A-F]{5}$/);
      }
    });

    it("generates unique codes", () => {
      const set = new Set<string>();
      for (let i = 0; i < 100; i++) {
        set.add(generateInviteCode());
      }
      expect(set.size).toBe(100);
    });
  });

  describe("slugify", () => {
    it("converts strings into clean lowercase URL slugs", () => {
      expect(slugify("My Cool Project")).toBe("my-cool-project");
      expect(slugify("NovaStage 2.0 Alpha!")).toBe("novastage-20-alpha");
      expect(slugify("  Spaces   and --- Hyphens  ")).toBe("spaces-and-hyphens");
    });

    it("falls back to 'project' when input consists of only special characters", () => {
      expect(slugify("!@#$%^&*()")).toBe("project");
      expect(slugify("")).toBe("project");
    });
  });

  describe("formatRelativeTime", () => {
    it("formats recent updates correctly", () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe("Updated just now");

      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      expect(formatRelativeTime(twoMinutesAgo)).toBe("Updated 2 mins ago");

      const threeHoursAgo = new Date(now.getTime() - 3 * 3600 * 1000);
      expect(formatRelativeTime(threeHoursAgo)).toBe("Updated 3 hours ago");
    });
  });

  describe("formatJoinedDate", () => {
    it("formats join timestamps correctly", () => {
      const now = new Date();
      expect(formatJoinedDate(now)).toBe("Joined just now");

      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      expect(formatJoinedDate(tenMinutesAgo)).toBe("Joined 10m ago");
    });
  });
});
