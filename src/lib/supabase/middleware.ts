import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  let supabaseResponse: NextResponse;

  const waitlistSuccess = request.cookies.get("waitlist_success")?.value === "1";
  if (waitlistSuccess && request.nextUrl.pathname === "/login") {
    requestHeaders.set("x-waitlist-success", "1");
  }

  supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (waitlistSuccess && request.nextUrl.pathname === "/login") {
    supabaseResponse.cookies.delete("waitlist_success");
  }

  const isPlaceholder =
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder-project");

  if (isPlaceholder) {
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
  await supabase.auth.getUser();

  if (waitlistSuccess && request.nextUrl.pathname === "/login") {
    supabaseResponse.cookies.delete("waitlist_success");
  }

  return supabaseResponse;
}
