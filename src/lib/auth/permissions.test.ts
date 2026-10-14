import { describe, it, expect } from "vitest";
import {
  hasPermission,
  hasAnyPermission,
  hasRole,
  type Permission,
  type Role,
} from "./permissions";
import { isAdminRole, isProfileComplete } from "./session";

describe("Permissions and Enterprise RBAC/PBAC", () => {
  it("evaluates exact, wildcard, and multiple required permissions (RBAC/PBAC)", () => {
    // Super-admin wildcard
    expect(hasPermission(["*"], "admin:access")).toBe(true);
    expect(hasPermission(["all"], "waitlist:read")).toBe(true);
    expect(hasAnyPermission(["*"], ["admin:access", "users:manage"])).toBe(true);

    // Exact permissions
    const perms = ["waitlist:read", "waitlist:approve"];
    expect(hasPermission(perms, "waitlist:read")).toBe(true);
    expect(hasPermission(perms, "admin:access")).toBe(false);
    expect(hasAnyPermission(perms, ["admin:access", "waitlist:read"])).toBe(true);

    // Multiple required (AND)
    expect(hasPermission(perms, ["waitlist:read", "waitlist:approve"] as Permission[])).toBe(true);
    expect(hasPermission(perms, ["waitlist:read", "users:manage"] as Permission[])).toBe(false);

    // Empty/invalid
    expect(hasPermission([], "admin:access")).toBe(false);
  });

  it("evaluates role hierarchies and super_admin overrides", () => {
    expect(hasRole(["developer"], "developer")).toBe(true);
    expect(hasRole(["viewer"], "admin")).toBe(false);
    expect(hasRole(["super_admin"], "developer")).toBe(true);
    expect(hasRole(["admin"], ["admin", "super_admin"] as Role[])).toBe(true);
    expect(hasRole([], "admin")).toBe(false);
  });

  it("evaluates admin roles for single and multi-role inputs", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("super_admin")).toBe(true);
    expect(isAdminRole("developer")).toBe(false);
    expect(isAdminRole(["developer", "admin"])).toBe(true);
    expect(isAdminRole(["developer", "viewer"])).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });

  it("validates profile completeness for onboarding guards", () => {
    expect(isProfileComplete({ full_name: "Alex Morgan", username: "alexm" })).toBe(true);
    expect(isProfileComplete(null)).toBe(false);
    expect(isProfileComplete({ full_name: null, username: "alexm" })).toBe(false);
    expect(isProfileComplete({ full_name: "Alex", username: "" })).toBe(false);
  });
});
