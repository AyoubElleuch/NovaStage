import { describe, it, expect } from "vitest";
import {
  hasPermission,
  hasAnyPermission,
  hasRole,
  type Permission,
  type Role,
} from "./permissions";

describe("Permissions and RBAC/PBAC Logic", () => {
  describe("hasPermission", () => {
    it("returns true for super_admin wildcard (*)", () => {
      expect(hasPermission(["*"], "admin:access")).toBe(true);
      expect(hasPermission(["*"], "waitlist:approve")).toBe(true);
      expect(hasPermission(["*"], "users:manage")).toBe(true);
    });

    it("returns true for 'all' wildcard keyword", () => {
      expect(hasPermission(["all"], "waitlist:read")).toBe(true);
    });

    it("returns true when exact permission is held", () => {
      const perms: string[] = ["waitlist:read", "waitlist:approve"];
      expect(hasPermission(perms, "waitlist:read")).toBe(true);
      expect(hasPermission(perms, "waitlist:approve")).toBe(true);
    });

    it("returns false when permission is missing", () => {
      const perms: string[] = ["waitlist:read"];
      expect(hasPermission(perms, "waitlist:approve")).toBe(false);
      expect(hasPermission(perms, "admin:access")).toBe(false);
    });

    it("returns false for empty or undefined permissions array", () => {
      expect(hasPermission([], "admin:access")).toBe(false);
      expect(hasPermission(undefined as unknown as string[], "admin:access")).toBe(false);
    });

    it("evaluates multiple required permissions (AND condition)", () => {
      const perms: string[] = ["waitlist:read", "waitlist:approve"];
      const required: Permission[] = ["waitlist:read", "waitlist:approve"];
      expect(hasPermission(perms, required)).toBe(true);

      const requiredWithMissing: Permission[] = ["waitlist:read", "waitlist:delete" as Permission];
      expect(hasPermission(perms, requiredWithMissing)).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("returns true if at least one permission matches", () => {
      const perms: string[] = ["waitlist:read"];
      expect(hasAnyPermission(perms, ["waitlist:read", "waitlist:approve"])).toBe(true);
    });

    it("returns false if none match", () => {
      const perms: string[] = ["users:read"];
      expect(hasAnyPermission(perms, ["waitlist:read", "waitlist:approve"])).toBe(false);
    });

    it("returns true for super_admin wildcard", () => {
      expect(hasAnyPermission(["*"], ["admin:access", "users:manage"])).toBe(true);
    });
  });

  describe("hasRole", () => {
    it("returns true when target role is present", () => {
      expect(hasRole(["developer"], "developer")).toBe(true);
      expect(hasRole(["admin", "developer"], "admin")).toBe(true);
    });

    it("returns true if user has super_admin regardless of target role", () => {
      expect(hasRole(["super_admin"], "developer")).toBe(true);
      expect(hasRole(["super_admin"], "viewer")).toBe(true);
    });

    it("returns false when user does not have required role", () => {
      expect(hasRole(["viewer"], "admin")).toBe(false);
      expect(hasRole(["developer"], "admin")).toBe(false);
    });

    it("evaluates multiple target roles (OR condition)", () => {
      const targetRoles: Role[] = ["admin", "super_admin"];
      expect(hasRole(["admin"], targetRoles)).toBe(true);
      expect(hasRole(["viewer"], targetRoles)).toBe(false);
    });

    it("handles empty or invalid inputs safely", () => {
      expect(hasRole([], "admin")).toBe(false);
      expect(hasRole(undefined as unknown as string[], "admin")).toBe(false);
    });
  });
});
