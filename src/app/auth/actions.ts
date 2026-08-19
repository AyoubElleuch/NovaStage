"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, resetRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { sendWaitlistJoinedEmail } from "@/lib/email/resend";

export interface AuthActionResult {
  success?: boolean;
  error?: string;
  message?: string;
  retryAfterSeconds?: number;
}

export async function joinWaitlist(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();

  if (!email) return { error: "Enter your email address." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const clientIp = await getClientIp();
  const ipRateLimitKey = `waitlist:ip:${clientIp}`;
  const emailRateLimitKey = `waitlist:email:${email}`;
  const rateCheck = checkRateLimit(ipRateLimitKey, {
    maxAttempts: 5,
    windowSeconds: 60,
    lockoutSeconds: 30,
  });

  if (!rateCheck.allowed) {
    return {
      error: "Too many requests. Please try again shortly.",
      retryAfterSeconds: rateCheck.retryAfterSeconds,
    };
  }

  const emailRateCheck = checkRateLimit(emailRateLimitKey, {
    maxAttempts: 3,
    windowSeconds: 60,
    lockoutSeconds: 30,
  });

  if (!emailRateCheck.allowed) {
    return {
      error: "This email has reached the request limit. Please try again later.",
      retryAfterSeconds: emailRateCheck.retryAfterSeconds,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist").insert({ email });

  if (error?.code === "23505") {
    return { error: "This email is already on the waitlist." };
  }

  if (error) {
    return { error: "We could not add you right now. Please try again." };
  }

  resetRateLimit(ipRateLimitKey);
  resetRateLimit(emailRateLimitKey);

  // Send waitlist confirmation email
  await sendWaitlistJoinedEmail({ email });

  return { success: true, message: "You are on the list. We will be in touch soon." };
}

export async function signIn(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const requestedRedirect = formData.get("redirectTo");

  if (!email) return { error: "Enter your email address." };
  if (!password) return { error: "Enter your password." };

  // Abuse Prevention / Rate Limiting by IP
  const clientIp = await getClientIp();
  const ipRateLimitKey = `login:ip:${clientIp}`;
  const emailRateLimitKey = `login:email:${email}`;
  const rateCheck = checkRateLimit(ipRateLimitKey, {
    maxAttempts: 5,
    windowSeconds: 60,
    lockoutSeconds: 30, // 30 seconds lockout after 5 consecutive failures
  });

  if (!rateCheck.allowed) {
    return {
      error: `Too many sign-in attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
      retryAfterSeconds: rateCheck.retryAfterSeconds,
    };
  }

  const emailRateCheck = checkRateLimit(emailRateLimitKey, {
    maxAttempts: 5,
    windowSeconds: 60,
    lockoutSeconds: 30,
  });

  if (!emailRateCheck.allowed) {
    return {
      error: "Too many sign-in attempts for this account. Please try again later.",
      retryAfterSeconds: emailRateCheck.retryAfterSeconds,
    };
  }

  const supabase = await createClient();

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "The email or password you entered is incorrect." };
  }

  // Reset rate limit key on successful login
  resetRateLimit(ipRateLimitKey);
  resetRateLimit(emailRateLimitKey);

  let destination = "/dashboard";
  if (authData.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, username")
      .eq("id", authData.user.id)
      .single();

    const fullName = typeof profile?.full_name === "string" ? profile.full_name.trim() : "";
    const username = typeof profile?.username === "string" ? profile.username.trim() : "";
    const isProfileComplete = Boolean(fullName && username);

    if (!isProfileComplete) {
      destination = "/onboarding";
    } else if (
      typeof requestedRedirect === "string" &&
      requestedRedirect.startsWith("/") &&
      !requestedRedirect.startsWith("//") &&
      requestedRedirect !== "/dashboard"
    ) {
      destination = requestedRedirect;
    } else {
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role_id")
        .eq("user_id", authData.user.id);

      const isUserAdmin =
        profile?.role === "admin" ||
        profile?.role === "super_admin" ||
        userRoles?.some((r) => r.role_id === "admin" || r.role_id === "super_admin");

      if (isUserAdmin) {
        destination = "/admin";
      }
    }
  }

  redirect(destination);
}

function getRequestOrigin(headerList: Headers): string {
  const forwardedHost = headerList.get("x-forwarded-host");
  const forwardedProto = headerList.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  const origin = headerList.get("origin");
  if (origin) {
    return origin;
  }
  const host = headerList.get("host");
  if (host) {
    const proto = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function signUp(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const headerList = await headers();
  const origin = getRequestOrigin(headerList);

  if (!email || !password || !fullName) {
    return { error: "All fields are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  // Check rate limit for sign up (3 signups per 10 minutes per IP)
  const clientIp = await getClientIp();
  const rateLimitKey = `signup:${clientIp}`;
  const rateCheck = checkRateLimit(rateLimitKey, {
    maxAttempts: 4,
    windowSeconds: 60,
    lockoutSeconds: 30,
  });

  if (!rateCheck.allowed) {
    return {
      error: `Too many registration attempts from this IP. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
      retryAfterSeconds: rateCheck.retryAfterSeconds,
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: "We could not create your account. Please try again." };
  }

  // If email confirmation is required by Supabase project settings
  if (data?.user && !data.session) {
    return {
      success: true,
      message: "Verification email sent! Please check your inbox to confirm your account.",
    };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function signInWithOAuth(
  provider: "github" | "google",
  mode: "waitlist" | "login" = "waitlist",
  redirectTo = "/dashboard"
) {
  const clientIp = await getClientIp();
  const rateLimitKey = `oauth:${mode}:ip:${clientIp}`;
  const rateCheck = checkRateLimit(rateLimitKey, {
    maxAttempts: 5,
    windowSeconds: 60,
    lockoutSeconds: 30,
  });

  if (!rateCheck.allowed) {
    return {
      error: "Too many requests. Please try again shortly.",
      retryAfterSeconds: rateCheck.retryAfterSeconds,
    };
  }

  const headerList = await headers();
  const origin = getRequestOrigin(headerList);

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?mode=${mode}&next=${encodeURIComponent(redirectTo)}`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}
