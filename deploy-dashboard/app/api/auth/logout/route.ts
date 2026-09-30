import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { assertSameOrigin, getRequestOrigin, SESSION_COOKIE_NAME } from "../../../../lib/auth.mjs";
import { getConfiguredControlStore } from "../../../../lib/control-store.mjs";
import { getCurrentPrincipal } from "../../../../lib/dashboard-auth";
import { auditEvent } from "../../../../lib/control-plane";

export async function POST(request: Request) {
  let requestOrigin: string;
  try {
    assertSameOrigin(request);
    requestOrigin = getRequestOrigin(request);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
  const principal = await getCurrentPrincipal();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  try {
    await getConfiguredControlStore()?.revokeSession(token);
    await auditEvent("auth.logout", {}, { principal, outcome: "succeeded", request });
  } catch (error) {
    console.error("Dashboard session revocation failed.", error);
  }
  const response = NextResponse.redirect(new URL("/", requestOrigin), 303);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
