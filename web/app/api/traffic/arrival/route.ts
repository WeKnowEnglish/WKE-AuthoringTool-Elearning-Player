import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { rateLimitAllow } from "@/lib/rate-limit/memory";
import { TRAFFIC_ATTR_COOKIE, TRAFFIC_ATTR_PING_COOKIE, attributionDbFields, parseAttributionCookie } from "@/lib/traffic/attribution";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";

export const dynamic = "force-dynamic";

function clearedPing() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(TRAFFIC_ATTR_PING_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

/** Store the first-touch cookie once. The page stays usable if this insert fails. */
export async function POST() {
  const cookieStore = await cookies();
  const attribution = parseAttributionCookie(cookieStore.get(TRAFFIC_ATTR_COOKIE)?.value);
  if (!attribution) return clearedPing();

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientKey = forwardedFor || requestHeaders.get("x-real-ip") || "unknown";
  if (!rateLimitAllow(`traffic-arrival:${clientKey}`, 30, 60 * 60 * 1000)) {
    return clearedPing();
  }

  const admin = createServiceRoleSupabase();
  if (!admin) return clearedPing();

  const fields = attributionDbFields(attribution);
  const { error } = await admin.from("traffic_arrivals").insert({
    visitor_id: fields.visitor_id,
    landing_path: fields.landing_path,
    referrer_host: fields.referrer_host,
    utm_source: fields.utm_source,
    utm_medium: fields.utm_medium,
    utm_campaign: fields.utm_campaign,
    utm_content: fields.utm_content,
    utm_term: fields.utm_term,
    captured_at: fields.attribution_captured_at,
  });
  if (error && error.code !== "23505") {
    console.error("traffic_arrivals insert failed", error.message);
  }
  return clearedPing();
}
