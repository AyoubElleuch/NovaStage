"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/session";

export interface OnboardingActionResult {
  success?: boolean;
  error?: string;
  message?: string;
}

export async function completeOnboarding(
  fullNameInput: string,
  usernameInput: string,
  passwordInput: string,
  confirmationInput: string
): Promise<OnboardingActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: "Your session has expired. Please sign in again." };
  }

  const fullName = (fullNameInput || "").trim();
  const username = (usernameInput || "").trim();
  const password = String(passwordInput || "");
  const confirmation = String(confirmationInput || "");

  if (!fullName) {
    return { error: "Please enter your full name." };
  }
  if (!username) {
    return { error: "Please enter your username." };
  }
  if (!password) {
    return { error: "Please enter a password." };
  }
  if (password.length < 8) {
    return { error: "Your password must be at least 8 characters." };
  }
  if (password !== confirmation) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();

  // 1. Update Auth user password and metadata in Supabase Auth
  const { error: authError } = await supabase.auth.updateUser({
    password,
    data: {
      full_name: fullName,
      username: username,
    },
  });

  if (authError) {
    return {
      error: authError.message || "We could not update your password. Please try again.",
    };
  }

  // 2. Upsert user profile record
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email || "",
        full_name: fullName,
        username: username,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (profileError) {
    return { error: "We could not save your profile. Please try again." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/onboarding");

  return { success: true };
}
