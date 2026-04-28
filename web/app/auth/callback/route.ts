import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseServerEnv } from "@/lib/env/supabase-server";

/**
 * Handles Supabase email links (password recovery, magic link, signup confirm)
 * that redirect with ?code=... (PKCE). Without this route, the code is never
 * exchanged for a session and the user sees no reset UI.
 */
function safeInternalPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/teacher/reset-password";
  }
  return next;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  const errDesc = url.searchParams.get("error_description");
  const nextRaw = url.searchParams.get("next");
  const nextPath = safeInternalPath(nextRaw);

  const loginErr = new URL("/teacher/login", url.origin);
  if (err) {
    loginErr.searchParams.set(
      "error",
      errDesc?.replace(/\+/g, " ") ?? err ?? "auth_error",
    );
    return NextResponse.redirect(loginErr);
  }

  const { url: supabaseUrl, anonKey } = getSupabaseServerEnv();
  if (!supabaseUrl || !anonKey) {
    loginErr.searchParams.set("error", "missing_supabase_env");
    return NextResponse.redirect(loginErr);
  }

  if (!code) {
    loginErr.searchParams.set(
      "error",
      "invalid_or_expired_link_missing_code",
    );
    return NextResponse.redirect(loginErr);
  }

  const response = NextResponse.redirect(new URL(nextPath, url.origin));

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    loginErr.searchParams.set("error", error.message);
    return NextResponse.redirect(loginErr);
  }

  return response;
}
