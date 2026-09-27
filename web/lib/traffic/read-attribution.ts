import "server-only";

import { cookies } from "next/headers";
import { TRAFFIC_ATTR_COOKIE, parseAttributionCookie, type TrafficAttribution } from "@/lib/traffic/attribution";

export async function readTrafficAttribution(): Promise<TrafficAttribution | null> {
  const cookieStore = await cookies();
  return parseAttributionCookie(cookieStore.get(TRAFFIC_ATTR_COOKIE)?.value);
}
