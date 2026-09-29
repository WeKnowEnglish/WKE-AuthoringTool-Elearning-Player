import { NextResponse } from "next/server";

import {
  assertSameOrigin,
  createSessionToken,
  getRequestOrigin,
  SESSION_COOKIE_NAME,
  verifyPassword,
} from "../../../../lib/auth.mjs";
import { readAdminConfig } from "../../../../lib/control-config.mjs";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1_000;
const MAX_ATTEMPTS = 5;

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function safeNext(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/deployments";
}

export async function POST(request: Request) {
  let requestOrigin: string;
  try {
    assertSameOrigin(request);
    requestOrigin = getRequestOrigin(request);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const admin = readAdminConfig();
  if (!admin.configured || !admin.config.password || !admin.config.sessionSecret) {
    return new Response("Administrator login is not configured.", { status: 503 });
  }

  const now = Date.now();
  const key = clientKey(request);
  const existing = attempts.get(key);
  const current = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : existing;
  if (current.count >= MAX_ATTEMPTS) {
    return new Response("Too many login attempts. Try again later.", {
      status: 429,
      headers: { "Retry-After": String(Math.ceil((current.resetAt - now) / 1000)) },
    });
  }

  const form = await request.formData();
  if (!verifyPassword(form.get("password"), admin.config.password)) {
    attempts.set(key, { ...current, count: current.count + 1 });
    const url = new URL("/login", requestOrigin);
    url.searchParams.set("error", "invalid");
    url.searchParams.set("next", safeNext(form.get("next")));
    return NextResponse.redirect(url, 303);
  }

  attempts.delete(key);
  const response = NextResponse.redirect(new URL(safeNext(form.get("next")), requestOrigin), 303);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(admin.config.sessionSecret),
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return response;
}
