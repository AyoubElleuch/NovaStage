import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Permission, hasPermission } from "./permissions";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface AuthSessionContext {
  user: User;
  profile: UserProfile | null;
  roles: string[];
  permissions: string[];
}

/**
 * Validates the JWT cryptographically via Supabase Auth Server.
 * Unlike getSession(), getUser() cannot be spoofed because it contacts
 * Supabase to verify the JWT signature and freshness.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  const isPlaceholder =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder-project");

  if (isPlaceholder) {
    return null;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

/**
 * Server utility to enforce authentication.
 * If user is not authenticated, redirects to /login.
 */
export async function requireAuth(redirectTo?: string): Promise<User> {
  const user = await getAuthenticatedUser();

  if (!user) {
    const loginUrl = redirectTo
      ? `/login?redirectTo=${encodeURIComponent(redirectTo)}`
      : "/login";
    redirect(loginUrl);
  }

  return user;
}

/**
 * Fetches the cryptographically verified user, their profile, assigned roles, and granular permissions.
 */
export async function getAuthenticatedProfile(): Promise<AuthSessionContext | null> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();

  // 1. Fetch Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // 2. Fetch User Roles from user_roles junction table
  const { data: userRolesData } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", user.id);

  const assignedRoles: string[] = [];
  if (userRolesData && userRolesData.length > 0) {
    for (const r of userRolesData) {
      if (r.role_id) assignedRoles.push(r.role_id);
    }
  }
  if (profile?.role && !assignedRoles.includes(profile.role)) {
    assignedRoles.push(profile.role);
  }
  if (assignedRoles.length === 0) {
    assignedRoles.push("developer");
  }

  // 3. Resolve Granular Permissions
  let permissions: string[] = [];

  if (assignedRoles.includes("super_admin")) {
    permissions = ["*"];
  } else if (assignedRoles.length > 0) {
    const { data: rolePermData } = await supabase
      .from("role_permissions")
      .select("permission_id")
      .in("role_id", assignedRoles);

    if (rolePermData) {
      permissions = Array.from(new Set(rolePermData.map((p) => p.permission_id)));
    }
  }

  return {
    user,
    profile: profile as UserProfile | null,
    roles: assignedRoles,
    permissions,
  };
}

/**
 * Checks if a given role string or roles array has administrative privileges.
 */
export function isAdminRole(role?: string | null | string[]): boolean {
  if (!role) return false;
  if (Array.isArray(role)) {
    return role.includes("admin") || role.includes("super_admin");
  }
  return role === "admin" || role === "super_admin";
}

/**
 * Enforces that the authenticated user possesses a specific permission.
 */
export async function requirePermission(
  required: Permission | Permission[],
  redirectTo = "/login"
): Promise<AuthSessionContext> {
  const session = await getAuthenticatedProfile();

  if (!session || !session.user) {
    const loginUrl = `${redirectTo}?redirectTo=${encodeURIComponent(redirectTo)}`;
    redirect(loginUrl);
  }

  if (!hasPermission(session.permissions, required)) {
    redirect("/dashboard");
  }

  return session;
}

/**
 * Server utility to enforce administrative authorization (access to /admin).
 */
export async function requireAdmin(redirectTo = "/admin"): Promise<AuthSessionContext> {
  const session = await getAuthenticatedProfile();

  if (!session || !session.user) {
    const loginUrl = `/login?redirectTo=${encodeURIComponent(redirectTo)}`;
    redirect(loginUrl);
  }

  const isAuthorized =
    hasPermission(session.permissions, "admin:access") ||
    isAdminRole(session.roles) ||
    isAdminRole(session.profile?.role);

  if (!isAuthorized) {
    redirect("/dashboard");
  }

  return session;
}
