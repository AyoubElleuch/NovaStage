import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { sendWaitlistJoinedEmail } from "@/lib/email/resend";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const code = searchParams.get("code");
  const mode = searchParams.get("mode") === "login" ? "login" : "waitlist";
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

      if (mode === "waitlist") {
        // 1. Save email to waitlist table only
        await adminClient.from("waitlist").upsert(
          {
            email: normalizedEmail,
            provider: "github",
            status: "pending",
          },
          { onConflict: "email", ignoreDuplicates: true }
        );

        // 2. Send waitlist confirmation email
        await sendWaitlistJoinedEmail({
          email: normalizedEmail,
          name: user.user_metadata?.full_name || user.user_metadata?.name,
        });

        // 3. Immediately purge the auto-created auth.users record so they are not an active user
        await adminClient.auth.admin.deleteUser(user.id);
        await supabase.auth.signOut();

        const response = NextResponse.redirect(`${origin}/login`);
        response.cookies.set("waitlist_success", "1", {
          httpOnly: true,
          maxAge: 60,
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
        return response;
      }

      // Mode === "login": Check if user is approved or an admin before granting access
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

      const { data: waitlistEntry } = await adminClient
        .from("waitlist")
        .select("status")
        .eq("email", normalizedEmail)
        .single();

      const isApproved = isAdmin || waitlistEntry?.status === "approved";

      if (!isApproved) {
        // Prevent bypassing waitlist via direct OAuth login: delete user and sign out
        await adminClient.auth.admin.deleteUser(user.id);
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=not_approved`);
      }

      const fullName = typeof profile?.full_name === "string" ? profile.full_name.trim() : "";
      const username = typeof profile?.username === "string" ? profile.username.trim() : "";
      const isProfileComplete = Boolean(fullName && username);

      const destination =
        next === "/reset-password"
          ? "/reset-password"
          : !isProfileComplete
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
