import { describe, it, expect } from "vitest";
import { isAdminRole, isProfileComplete } from "./session";

describe("Session & Role Evaluation Helpers", () => {
  describe("isAdminRole", () => {
    it("returns true for string 'admin'", () => {
      expect(isAdminRole("admin")).toBe(true);
    });

    it("returns true for string 'super_admin'", () => {
      expect(isAdminRole("super_admin")).toBe(true);
    });

    it("returns false for non-admin roles", () => {
      expect(isAdminRole("developer")).toBe(false);
      expect(isAdminRole("viewer")).toBe(false);
      expect(isAdminRole("")).toBe(false);
      expect(isAdminRole(null)).toBe(false);
      expect(isAdminRole(undefined)).toBe(false);
    });

    it("evaluates string arrays correctly", () => {
      expect(isAdminRole(["developer", "admin"])).toBe(true);
      expect(isAdminRole(["super_admin"])).toBe(true);
      expect(isAdminRole(["developer", "viewer"])).toBe(false);
      expect(isAdminRole([])).toBe(false);
    });
  });

  describe("isProfileComplete", () => {
    it("returns true when both full_name and username are present and non-empty", () => {
      expect(isProfileComplete({ full_name: "Alex Morgan", username: "alexm" })).toBe(true);
      expect(isProfileComplete({ full_name: "  John Doe  ", username: "  johndoe  " })).toBe(true);
    });

    it("returns false when profile is missing or null", () => {
      expect(isProfileComplete(null)).toBe(false);
      expect(isProfileComplete(undefined)).toBe(false);
    });

    it("returns false when full_name is missing or empty", () => {
      expect(isProfileComplete({ full_name: null, username: "alexm" })).toBe(false);
      expect(isProfileComplete({ full_name: "", username: "alexm" })).toBe(false);
      expect(isProfileComplete({ full_name: "   ", username: "alexm" })).toBe(false);
    });

    it("returns false when username is missing or empty", () => {
      expect(isProfileComplete({ full_name: "Alex Morgan", username: null })).toBe(false);
      expect(isProfileComplete({ full_name: "Alex Morgan", username: "" })).toBe(false);
      expect(isProfileComplete({ full_name: "Alex Morgan", username: "   " })).toBe(false);
    });
  });
});
