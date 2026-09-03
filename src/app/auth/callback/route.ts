import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email/resend";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const code = searchParams.get("code");
  const rawMode = searchParams.get("mode");
  const isSignup = rawMode === "signup" || rawMode === "waitlist";
  const requestedNext = searchParams.get("next");
  const next =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/dashboard";

  // Extract public origin (supports reverse proxies like Vercel/Cloudflare/Nginx)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : (process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
      }

      const normalizedEmail = user.email.toLowerCase();
      const adminClient = createAdminClient();

      const { data: profile } = await adminClient
        .from("profiles")
        .select("role, full_name, username")
        .eq("id", user.id)
        .single();

      const { data: userRoles } = await adminClient
        .from("user_roles")
        .select("role_id")
        .eq("user_id", user.id);

      const isAdmin =
        profile?.role === "admin" ||
        profile?.role === "super_admin" ||
        userRoles?.some((r) => r.role_id === "admin" || r.role_id === "super_admin");

      // Check if user is newly registered and hasn't received welcome email yet
      const welcomeAlreadySent = Boolean(user.user_metadata?.welcome_sent);

      const isNewUser =
        !welcomeAlreadySent &&
        (isSignup ||
          !profile ||
          !profile.username ||
          (user.created_at &&
            Math.abs(Date.now() - new Date(user.created_at).getTime()) < 120000));

      if (isNewUser) {
        // Send welcoming email for new registration
        try {
          await sendWelcomeEmail({
            email: normalizedEmail,
            name:
              profile?.full_name ||
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.user_metadata?.user_name,
          });

          await adminClient.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...user.user_metadata,
              welcome_sent: true,
            },
          });
        } catch (emailErr) {
          console.error("[Auth Callback] Failed to dispatch welcome email:", emailErr);
        }
      }

      const fullName = typeof profile?.full_name === "string" ? profile.full_name.trim() : "";
      const username = typeof profile?.username === "string" ? profile.username.trim() : "";
      const isProfileComplete = Boolean(fullName && username);

      const destination =
        next === "/reset-password"
          ? "/reset-password"
          : isSignup || !isProfileComplete
            ? "/onboarding"
            : next !== "/dashboard"
              ? next
              : isAdmin
                ? "/admin"
                : "/dashboard";

      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  // Return to login with error parameter
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
