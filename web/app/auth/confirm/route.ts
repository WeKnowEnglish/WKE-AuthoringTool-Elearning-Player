import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSupabaseServerEnv } from "@/lib/env/supabase-server";

function safeInternalPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/teacher/set-password";
}

function acceptedType(value: string | null): EmailOtpType | null {
  return value === "invite" || value === "recovery" ? value : null;
}

function privateRedirect(url: URL): NextResponse {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = acceptedType(requestUrl.searchParams.get("type"));
  const nextPath = safeInternalPath(requestUrl.searchParams.get("next"));
  const failure = new URL("/login", requestUrl.origin);
  failure.searchParams.set("portal", "teacher");
  failure.searchParams.set("error", "invalid_or_expired_invitation");

  if (!tokenHash || !type) return privateRedirect(failure);

  const { url, anonKey } = getSupabaseServerEnv();
  if (!url || !anonKey) return privateRedirect(failure);

  const response = privateRedirect(new URL(nextPath, requestUrl.origin));
  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const verified = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (verified.error) return privateRedirect(failure);
  return response;
}
