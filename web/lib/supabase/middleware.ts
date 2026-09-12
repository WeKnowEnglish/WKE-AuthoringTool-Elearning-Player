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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
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

  return supabaseResponse;
}
