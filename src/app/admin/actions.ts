"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedProfile, isAdminRole } from "@/lib/auth/session";
import { hasPermission, Permission } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";
import { sendWaitlistApprovedEmail } from "@/lib/email/resend";
import { generateSecurePassword } from "@/lib/security/password";
import { broadcastPlatformAnnouncementChange } from "@/lib/announcements/server";
import {
  AnnouncementSeverity,
  isAnnouncementSeverity,
  parsePlatformAnnouncement,
  PlatformAnnouncement,
} from "@/lib/announcements/types";

export interface WaitlistRecord {
  email: string;
  provider: string;
  status: "pending" | "approved" | "disapproved";
  auth_user_id: string | null;
  has_active_user: boolean;
  created_at: string;
  approved_at: string | null;
  disapproved_at: string | null;
}

export interface AdminActionResult {
  success?: boolean;
  error?: string;
  message?: string;
  temporaryPassword?: string;
}

/**
 * Ensures the caller holds the required permission (or super_admin privileges).
 */
async function assertPermission(requiredPermission: Permission) {
  const session = await getAuthenticatedProfile();
  if (!session || !session.user) {
    throw new Error("Unauthorized. User must be authenticated.");
  }

  const isGranted =
    hasPermission(session.permissions, requiredPermission) ||
    isAdminRole(session.roles) ||
    isAdminRole(session.profile?.role);

  if (!isGranted) {
    throw new Error(`Forbidden. Missing required permission: ${requiredPermission}`);
  }

  return session;
}

async function assertSuperAdmin() {
  const session = await getAuthenticatedProfile();
  if (!session || !session.user) {
    throw new Error("Unauthorized. User must be authenticated.");
  }

  const isSuperAdmin =
    session.roles.includes("super_admin") || session.profile?.role === "super_admin";
  if (!isSuperAdmin) {
    throw new Error("Forbidden. Super admin access is required.");
  }

  return session;
}

export async function getPlatformAnnouncement(): Promise<{
  data?: PlatformAnnouncement | null;
  error?: string;
}> {
  try {
    await assertSuperAdmin();
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("platform_announcements")
      .select("id, message, severity, is_active, updated_at, updated_by")
      .eq("id", "platform")
      .maybeSingle();

    if (error) return { error: error.message };
    return { data: parsePlatformAnnouncement(data) };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to load the platform announcement." };
  }
}

export async function savePlatformAnnouncement(
  message: string,
  severity: AnnouncementSeverity,
  isActive: boolean
): Promise<AdminActionResult> {
  try {
    const session = await assertSuperAdmin();
    const normalizedMessage = message.trim();

    if (normalizedMessage.length > 280) {
      return { error: "Announcement messages must be 280 characters or fewer." };
    }
    if (isActive && !normalizedMessage) {
      return { error: "Enter a message before activating the announcement." };
    }
    if (typeof isActive !== "boolean") {
      return { error: "Choose whether the announcement should be active." };
    }
    if (!isAnnouncementSeverity(severity)) {
      return { error: "Choose a valid announcement severity." };
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("platform_announcements")
      .upsert(
        {
          id: "platform",
          message: normalizedMessage,
          severity,
          is_active: isActive,
          updated_by: session.user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("id, message, severity, is_active, updated_at, updated_by")
      .single();

    if (error || !data) {
      return { error: error?.message || "Could not save the platform announcement." };
    }

    try {
      await broadcastPlatformAnnouncementChange();
    } catch {
      // The database change is durable; the next client refresh will still converge.
    }

    revalidatePath("/admin/broadcast");
    revalidatePath("/", "layout");
    return {
      success: true,
      message: isActive ? "Announcement activated for all users." : "Announcement disabled.",
    };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to save the platform announcement." };
  }
}

/**
 * Fetches all waitlist registrations enriched with real-time auth.users state.
 */
export async function getWaitlistEntries(): Promise<{ data?: WaitlistRecord[]; error?: string }> {
  try {
    await assertPermission("waitlist:read");
    const adminClient = createAdminClient();

    // 1. Fetch waitlist table records
    const { data: waitlistRows, error: waitlistError } = await adminClient
      .from("waitlist")
      .select("*")
      .order("created_at", { ascending: false });

    if (waitlistError) {
      return { error: waitlistError.message };
    }

    // 2. Fetch all auth users to compute active account state
    const { data: authUsersData, error: authError } = await adminClient.auth.admin.listUsers();
    
    if (authError) {
      return { error: authError.message };
    }

    const authUserMap = new Map<string, string>();
    for (const u of authUsersData.users) {
      if (u.email) {
        authUserMap.set(u.email.toLowerCase(), u.id);
      }
    }

    const enriched: WaitlistRecord[] = (waitlistRows || []).map((row) => {
      const emailLower = row.email.toLowerCase();
      const existingAuthUserId = authUserMap.get(emailLower) || row.auth_user_id || null;
      const hasActiveUser = Boolean(authUserMap.has(emailLower));

      return {
        email: row.email,
        provider: row.provider || "email",
        status: (row.status as "pending" | "approved" | "disapproved") || "pending",
        auth_user_id: existingAuthUserId,
        has_active_user: hasActiveUser,
        created_at: row.created_at,
        approved_at: row.approved_at,
        disapproved_at: row.disapproved_at,
      };
    });

    return { data: enriched };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to load waitlist entries." };
  }
}

/**
 * Approves a waitlist applicant:
 * - Provisions an active account in auth.users (if not already existing)
 * - Updates waitlist record to 'approved' and links the auth_user_id
 */
export async function approveWaitlistEntry(
  email: string,
  initialPassword?: string
): Promise<AdminActionResult> {
  try {
    await assertPermission("waitlist:approve");
    const normalizedEmail = email.trim().toLowerCase();
    const adminClient = createAdminClient();

    // 1. Check if auth user already exists
    const { data: authUsersData } = await adminClient.auth.admin.listUsers();
    let authUser = authUsersData?.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
    const passwordToSet = initialPassword?.trim() || generateSecurePassword(16);

    if (!authUser) {
      // Create user with confirmed email
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password: passwordToSet,
        email_confirm: true,
        user_metadata: {
          role: "developer",
          full_name: normalizedEmail.split("@")[0],
        },
      });

      if (createError || !created.user) {
        return { error: createError?.message || "Failed to create user account." };
      }
      authUser = created.user;
    }

    // 2. Update waitlist table
    const { error: updateError } = await adminClient
      .from("waitlist")
      .update({
        status: "approved",
        auth_user_id: authUser.id,
        approved_at: new Date().toISOString(),
        disapproved_at: null,
      })
      .eq("email", normalizedEmail);

    if (updateError) {
      return { error: `User created, but waitlist status update failed: ${updateError.message}` };
    }

    // Send email with credentials to the approved user
    await sendWaitlistApprovedEmail({
      email: normalizedEmail,
      temporaryPassword: passwordToSet,
    });

    revalidatePath("/admin/waitlist");
    return {
      success: true,
      message: `User ${normalizedEmail} approved successfully. Temporary password: ${passwordToSet}`,
      temporaryPassword: passwordToSet,
    };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Approval failed." };
  }
}

/**
 * Disapproves a waitlist entry.
 * Leaves the record in waitlist with status = 'disapproved'.
 */
export async function disapproveWaitlistEntry(email: string): Promise<AdminActionResult> {
  try {
    await assertPermission("waitlist:disapprove");
    const normalizedEmail = email.trim().toLowerCase();
    const adminClient = createAdminClient();

    const { error: updateError } = await adminClient
      .from("waitlist")
      .update({
        status: "disapproved",
        disapproved_at: new Date().toISOString(),
      })
      .eq("email", normalizedEmail);

    if (updateError) {
      return { error: updateError.message };
    }

    revalidatePath("/admin/waitlist");
    return { success: true, message: `Waitlist entry for ${normalizedEmail} marked as disapproved.` };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Disapproval failed." };
  }
}

export interface AdminOverviewUser {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string;
  provider: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface AdminOverviewStats {
  totalUsers: number;
  activeRecently: number;
  newThisMonth: number;
  neverSignedIn: number;
}

/**
 * Fetches all registered users for the admin overview dashboard,
 * combining profile details with authentication records and last sign-in timestamps.
 */
export async function getAdminOverviewUsers(): Promise<{
  data?: AdminOverviewUser[];
  stats?: AdminOverviewStats;
  error?: string;
}> {
  try {
    await assertPermission("users:read");
    const adminClient = createAdminClient();

    // 1. Fetch auth users from Supabase Auth admin API (contains last_sign_in_at)
    const { data: authUsersData, error: authError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });

    if (authError) {
      return { error: authError.message };
    }

    // 2. Fetch profiles to get usernames, roles, and avatar URLs
    const { data: profiles, error: profileError } = await adminClient
      .from("profiles")
      .select("id, email, full_name, username, avatar_url, role, created_at");

    if (profileError) {
      return { error: profileError.message };
    }

    const profileMap = new Map<
      string,
      {
        id: string;
        email: string;
        full_name: string | null;
        username: string | null;
        avatar_url: string | null;
        role: string;
        created_at: string;
      }
    >();

    for (const p of profiles || []) {
      profileMap.set(p.id, p);
      if (p.email) {
        profileMap.set(p.email.toLowerCase(), p);
      }
    }

    // 3. Map auth users to AdminOverviewUser
    const users: AdminOverviewUser[] = (authUsersData.users || []).map((u) => {
      const profile = profileMap.get(u.id) || (u.email ? profileMap.get(u.email.toLowerCase()) : undefined);
      const email = u.email || profile?.email || "Unknown";
      const provider =
        (u.app_metadata?.provider as string) ||
        (Array.isArray(u.app_metadata?.providers) && u.app_metadata.providers[0]) ||
        "email";

      return {
        id: u.id,
        email,
        full_name: profile?.full_name || (u.user_metadata?.full_name as string) || null,
        username: profile?.username || null,
        avatar_url: profile?.avatar_url || (u.user_metadata?.avatar_url as string) || null,
        role: profile?.role || (u.user_metadata?.role as string) || "developer",
        provider,
        created_at: u.created_at || profile?.created_at || new Date().toISOString(),
        last_sign_in_at: u.last_sign_in_at || null,
      };
    });

    // Sort by created_at descending (newest signups first)
    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const totalUsers = users.length;
    const activeRecently = users.filter((u) => {
      if (!u.last_sign_in_at) return false;
      const diff = now - new Date(u.last_sign_in_at).getTime();
      return diff >= 0 && diff <= sevenDaysMs;
    }).length;

    const newThisMonth = users.filter((u) => {
      if (!u.created_at) return false;
      const diff = now - new Date(u.created_at).getTime();
      return diff >= 0 && diff <= thirtyDaysMs;
    }).length;

    const neverSignedIn = users.filter((u) => !u.last_sign_in_at).length;

    return {
      data: users,
      stats: {
        totalUsers,
        activeRecently,
        newThisMonth,
        neverSignedIn,
      },
    };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to load registered users." };
  }
}

export interface UserAiLimitRecord {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string;
  ai_requests_count: number;
  ai_requests_remaining: number;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches all user profiles with their AI quota usage.
 */
export async function getUserAiLimits(): Promise<{ data?: UserAiLimitRecord[]; error?: string }> {
  try {
    await assertPermission("users:read");
    const adminClient = createAdminClient();

    const { data: profiles, error } = await adminClient
      .from("profiles")
      .select("id, email, full_name, username, avatar_url, role, ai_requests_count, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      return { error: error.message };
    }

    const records: UserAiLimitRecord[] = (profiles || []).map((row) => {
      const used = typeof row.ai_requests_count === "number" ? row.ai_requests_count : 0;
      const remaining = Math.max(0, 10 - used);
      return {
        id: row.id,
        email: row.email,
        full_name: row.full_name || null,
        username: row.username || null,
        avatar_url: row.avatar_url || null,
        role: row.role || "developer",
        ai_requests_count: used,
        ai_requests_remaining: remaining,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    return { data: records };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to load user AI limits." };
  }
}

/**
 * Resets AI request quota for a single user back to 10 out of 10 (ai_requests_count = 0).
 */
export async function resetUserAiQuota(userId: string): Promise<AdminActionResult> {
  try {
    await assertPermission("users:manage");
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("profiles")
      .update({
        ai_requests_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin/ai-limits");
    revalidatePath("/admin");
    return { success: true, message: "User AI quota reset to 10/10 successfully." };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to reset user AI quota." };
  }
}

/**
 * Resets AI request quota for all users across the platform back to 10 out of 10 (ai_requests_count = 0).
 */
export async function resetAllUsersAiQuota(): Promise<AdminActionResult> {
  try {
    await assertPermission("users:manage");
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("profiles")
      .update({
        ai_requests_count: 0,
        updated_at: new Date().toISOString(),
      })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin/ai-limits");
    revalidatePath("/admin");
    return { success: true, message: "All users' AI quotas have been reset to 10/10." };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : "Failed to reset all users' AI quotas." };
  }
}


