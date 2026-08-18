export type Permission =
  | "admin:access"
  | "waitlist:read"
  | "waitlist:approve"
  | "waitlist:disapprove"
  | "users:read"
  | "users:manage"
  | "roles:manage";

export type Role = "super_admin" | "admin" | "developer" | "viewer";

export interface PermissionDefinition {
  id: Permission;
  name: string;
  description: string;
  category: "admin" | "waitlist" | "users" | "system";
}

export interface RoleDefinition {
  id: Role;
  name: string;
  description: string;
  isSystem: boolean;
}

/**
 * Checks if a user holding the given permissions array satisfies the required permission(s).
 * If user holds 'super_admin' or all required permissions, returns true.
 */
export function hasPermission(
  userPermissions: string[] = [],
  required: Permission | Permission[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  
  // Wildcard / super_admin full grant
  if (userPermissions.includes("*") || userPermissions.includes("all")) {
    return true;
  }

  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.every((perm) => userPermissions.includes(perm));
}

/**
 * Checks if a user has any of the required permissions (OR condition).
 */
export function hasAnyPermission(
  userPermissions: string[] = [],
  required: Permission[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  if (userPermissions.includes("*") || userPermissions.includes("all")) {
    return true;
  }
  return required.some((perm) => userPermissions.includes(perm));
}

/**
 * Checks if user holds any of the target roles.
 */
export function hasRole(userRoles: string[] = [], targetRoles: Role | Role[]): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  if (userRoles.includes("super_admin")) return true;

  const targetList = Array.isArray(targetRoles) ? targetRoles : [targetRoles];
  return targetList.some((role) => userRoles.includes(role));
}
