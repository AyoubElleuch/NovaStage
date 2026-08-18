import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const mode = searchParams.get("mode") === "login" ? "login" : "waitlist";
  const requestedNext = searchParams.get("next");
  const next =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/dashboard";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (mode === "login") {
        return NextResponse.redirect(`${origin}${next}`);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        await supabase.from("waitlist").insert({
          email: user.email.toLowerCase(),
          provider: "github",
        });
      }

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
  }

  // Return to login with error parameter
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
