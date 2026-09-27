import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getAppRole, mustChangePassword } from "@/lib/auth/roles";
import { getSupabaseServerEnv } from "@/lib/env/supabase-server";

export const dynamic = "force-dynamic";

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

function authResponse(
  body: Record<string, unknown>,
  status: number,
  cookies: PendingCookie[],
  headers: Record<string, string>,
) {
  const response = NextResponse.json(body, { status });
  cookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  Object.entries(headers).forEach(([name, value]) =>
    response.headers.set(name, value),
  );
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  return response;
}

export async function POST(request: NextRequest) {
  const pendingCookies: PendingCookie[] = [];
  const pendingHeaders: Record<string, string> = {};

  let body: { email?: unknown; password?: unknown; expectedRole?: unknown };
  try {
    body = await request.json();
  } catch {
    return authResponse({ ok: false, error: "Invalid login request." }, 400, [], {});
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const expectedRole = body.expectedRole;
  if (!email || !password || (expectedRole !== "teacher" && expectedRole !== "student")) {
    return authResponse({ ok: false, error: "Invalid login request." }, 400, [], {});
  }

  const { url, anonKey } = getSupabaseServerEnv();
  if (!url || !anonKey) {
    return authResponse(
      { ok: false, error: "The sign-in service is not configured." },
      503,
      [],
      {},
    );
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        pendingCookies.push(...cookiesToSet);
        Object.assign(pendingHeaders, headers);
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return authResponse(
      { ok: false, error: "Incorrect email or password." },
      401,
      pendingCookies,
      pendingHeaders,
    );
  }

  const role = getAppRole(data.user);
  if (role !== expectedRole) {
    await supabase.auth.signOut();
    return authResponse(
      {
        ok: false,
        error:
          expectedRole === "teacher"
            ? "This account is not a teacher."
            : "This account cannot be used here.",
      },
      403,
      pendingCookies,
      pendingHeaders,
    );
  }

  return authResponse(
    {
      ok: true,
      role,
      mustChangePassword: mustChangePassword(data.user),
      userId: data.user.id,
      learningBand:
        typeof data.user.user_metadata?.learning_band === "string"
          ? data.user.user_metadata.learning_band
          : null,
    },
    200,
    pendingCookies,
    pendingHeaders,
  );
}
