import { describe, it, expect } from "vitest";
import { isAdminRole } from "./session";

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
});
