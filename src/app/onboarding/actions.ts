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
  usernameInput: string
): Promise<OnboardingActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: "Your session has expired. Please sign in again." };
  }

  const fullName = (fullNameInput || "").trim();
  const username = (usernameInput || "").trim();

  if (!fullName) {
    return { error: "Please enter your full name." };
  }
  if (!username) {
    return { error: "Please enter your username." };
  }

  const supabase = await createClient();

  // 1. Update Auth user metadata in Supabase Auth
  const { error: authError } = await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      username: username,
      onboarding_completed: true,
    },
  });

  if (authError) {
    return {
      error: authError.message || "We could not update your profile. Please try again.",
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
  revalidatePath("/admin", "layout");
  revalidatePath("/onboarding");

  return { success: true };
}
