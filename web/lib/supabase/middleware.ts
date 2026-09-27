import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerEnv } from "@/lib/env/supabase-server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { url, anonKey } = getSupabaseServerEnv();
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([name, value]) =>
            supabaseResponse.headers.set(name, value),
          );
        },
      },
    },
  );

  try {
    await supabase.auth.getUser();
  } catch {
    // A transient identity-provider/network failure must not make the proxy
    // replace the protected route's structured recovery experience with a 500.
    // The downstream route or Server Action still performs the authoritative
    // student check, and database RLS remains enforced.
  }

  const pathname = request.nextUrl.pathname;
  const authSensitivePath =
    pathname === "/login" ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/primary") ||
    pathname.startsWith("/secondary") ||
    pathname.startsWith("/parent") ||
    pathname.startsWith("/api/auth");
  const hasAuthCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
  if (authSensitivePath || hasAuthCookie) {
    supabaseResponse.headers.set(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate, max-age=0",
    );
    supabaseResponse.headers.set("Pragma", "no-cache");
    supabaseResponse.headers.set("Expires", "0");
  }

  return supabaseResponse;
}
