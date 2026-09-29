import { NextResponse } from "next/server";

import { assertSameOrigin, getRequestOrigin, SESSION_COOKIE_NAME } from "../../../../lib/auth.mjs";

export async function POST(request: Request) {
  let requestOrigin: string;
  try {
    assertSameOrigin(request);
    requestOrigin = getRequestOrigin(request);
  } catch {
    return new Response("Forbidden", { status: 403 });
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
