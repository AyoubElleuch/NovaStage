"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export interface SettingsActionResult {
  success?: boolean;
  error?: string;
  message?: string;
}

export async function updateProfile(
  _previousState: SettingsActionResult,
  formData: FormData
): Promise<SettingsActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const fullName = String(formData.get("fullName") || "").trim();
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const avatarUrl = String(formData.get("avatarUrl") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!fullName) return { error: "Enter your name." };
  if (username && !/^[a-z0-9_-]{3,24}$/.test(username)) return { error: "Username must be 3-24 characters using letters, numbers, underscores, or hyphens." };
  if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) return { error: "Avatar URL must start with http:// or https://." };

  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email || email,
        full_name: fullName,
        username: username || null,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (profileError) {
    if (profileError.code === "23505") return { error: "That username is already taken." };
    return { error: "We could not update your profile. Please try again." };
  }

  const currentEmail = user.email?.toLowerCase() || "";
  if (email && email !== currentEmail) {
    const { error: emailError } = await supabase.auth.updateUser({ email });
    if (emailError) return { error: emailError.message };
    revalidatePath("/dashboard/settings");
    return { success: true, message: "Profile saved. Check your new email to confirm the change." };
  }

  revalidatePath("/dashboard/settings");
  return { success: true, message: "Profile saved." };
}

export async function updatePassword(_previousState: SettingsActionResult, formData: FormData): Promise<SettingsActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };
  const password = String(formData.get("password") || "");
  const confirmation = String(formData.get("confirmation") || "");
  if (password.length < 8) return { error: "Your password must be at least 8 characters." };
  if (password !== confirmation) return { error: "Passwords do not match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "We could not update your password. Please try again." };
  revalidatePath("/dashboard/settings");
  return { success: true, message: "Password updated." };
}

export async function deleteAccount(_previousState: SettingsActionResult, formData: FormData): Promise<SettingsActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) return { error: "Your session has expired. Please sign in again." };

  const confirmation = String(formData.get("confirmation") || "");
  const nameConfirmation = String(formData.get("nameConfirmation") || "").trim();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const fullName = profile?.full_name?.trim() || "";

  if (confirmation !== "delete") return { error: 'Type "delete" to confirm account removal.' };
  if (!fullName) return { error: "Add your full name in Profile before deleting your account." };
  if (nameConfirmation.toLocaleLowerCase() !== fullName.toLocaleLowerCase()) {
    return { error: "Enter your full name exactly as it appears in your profile." };
  }

  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) return { error: "We could not delete your account. Please try again." };

  await supabase.auth.signOut();
  redirect("/login?deleted=1");
}