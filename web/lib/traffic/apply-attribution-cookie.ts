import { NextResponse, type NextRequest } from "next/server";
import {
  TRAFFIC_ATTR_COOKIE,
  TRAFFIC_ATTR_MAX_AGE_SECONDS,
  TRAFFIC_ATTR_PING_COOKIE,
  buildAttribution,
  firstTouchAttribution,
  isDocumentNavigation,
  serializeAttribution,
  type ArrivalSignals,
} from "@/lib/traffic/attribution";

export function arrivalSignalsFromRequest(request: NextRequest): ArrivalSignals {
  return {
    method: request.method,
    pathname: request.nextUrl.pathname,
    searchParams: request.nextUrl.searchParams,
    host: request.headers.get("host") ?? request.nextUrl.host,
    referer: request.headers.get("referer"),
    accept: request.headers.get("accept"),
    secFetchDest: request.headers.get("sec-fetch-dest"),
    purpose: request.headers.get("purpose") ?? request.headers.get("sec-purpose"),
    nextRouterPrefetch: request.headers.get("next-router-prefetch"),
    rsc: request.headers.get("rsc"),
  };
}

/** Set the first-touch cookie on a real document load. Later pages leave it alone. */
export function applyTrafficAttribution(request: NextRequest, response: NextResponse): NextResponse {
  const signals = arrivalSignalsFromRequest(request);
  if (!isDocumentNavigation(signals)) return response;

  const existing = request.cookies.get(TRAFFIC_ATTR_COOKIE)?.value;
  const incoming = buildAttribution(signals, crypto.randomUUID(), new Date().toISOString());
  const next = firstTouchAttribution(existing, incoming);
  if (!next) return response;

  const secure = request.nextUrl.protocol === "https:";
  response.cookies.set(TRAFFIC_ATTR_COOKIE, serializeAttribution(next), {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: TRAFFIC_ATTR_MAX_AGE_SECONDS,
  });
  response.cookies.set(TRAFFIC_ATTR_PING_COOKIE, "1", {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
