import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  let supabaseResponse: NextResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const isPlaceholder =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder-project");

  if (isPlaceholder || request.nextUrl.pathname === "/api/ping") {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect pages (exclude API endpoints and public assets)
  const isProtectedPage =
    (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) &&
    !pathname.startsWith("/api/");
  const isOnboardingPage = pathname === "/onboarding";

  if (!user && (isProtectedPage || isOnboardingPage)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  if (user && (isProtectedPage || isOnboardingPage)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, username, role")
      .eq("id", user.id)
      .single();

    const fullName = typeof profile?.full_name === "string" ? profile.full_name.trim() : "";
    const username = typeof profile?.username === "string" ? profile.username.trim() : "";
    const isComplete = Boolean(fullName && username);

    // Incomplete profile: redirect to /onboarding, block changing URL to /dashboard or /admin
    if (!isComplete && isProtectedPage) {
      const redirectResponse = NextResponse.redirect(new URL("/onboarding", request.url));
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }

    // Completed profile: redirect away from /onboarding
    if (isComplete && isOnboardingPage) {
      const destination =
        profile?.role === "admin" || profile?.role === "super_admin"
          ? "/admin"
          : "/dashboard";
      const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }
  }

  return supabaseResponse;
}
