import { describe, it, expect } from "vitest";
import {
  generateInviteCode,
  slugify,
  joinProjectByInviteCode,
  MAX_PROJECT_MEMBERS,
} from "./projects";

describe("Projects Utilities, Invite Codes & Membership", () => {
  it("generates valid, unique invite codes and enforces maximum member limits", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateInviteCode()).toMatch(/^NS-[0-9A-F]{5}$/);
    }

    const set = new Set<string>();
    for (let i = 0; i < 30; i++) {
      set.add(generateInviteCode());
    }
    expect(set.size).toBeGreaterThanOrEqual(28);

    expect(MAX_PROJECT_MEMBERS).toBe(5);
  });

  it("converts strings into clean lowercase URL slugs with fallbacks", () => {
    expect(slugify("My Cool Project")).toBe("my-cool-project");
    expect(slugify("NovaStage 2.0 Alpha!")).toBe("novastage-20-alpha");
    expect(slugify("  Spaces   and --- Hyphens  ")).toBe("spaces-and-hyphens");
    expect(slugify("!@#$%^&*()")).toBe("project");
    expect(slugify("")).toBe("project");
  });

  it("validates invite codes when joining projects", async () => {
    const emptyResult = await joinProjectByInviteCode({
      inviteCode: "",
      userId: "user-123",
    });
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.error).toContain("Please enter an invite code");

    const invalidResult = await joinProjectByInviteCode({
      inviteCode: "INVALID_CODE",
      userId: "user-123",
    });
    expect(invalidResult.success).toBe(false);
    expect(invalidResult.error).toContain("Invalid invite code format");
  });
});
