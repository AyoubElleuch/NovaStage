import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

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
 * Fetches the cryptographically verified user and their associated database profile.
 */
export async function getAuthenticatedProfile(): Promise<AuthSessionContext | null> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    user,
    profile: profile as UserProfile | null,
  };
}
