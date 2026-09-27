"use client";

import { useEffect } from "react";
import { TRAFFIC_ATTR_PING_COOKIE } from "@/lib/traffic/attribution";

/** Reports a new first-touch cookie once. Quiet when the cookie is absent. */
export function TrafficArrivalPing() {
  useEffect(() => {
    const pending = document.cookie.split(";").some((part) => part.trim().startsWith(`${TRAFFIC_ATTR_PING_COOKIE}=`));
    if (!pending) return;
    void fetch("/api/traffic/arrival", { method: "POST", keepalive: true });
  }, []);
  return null;
}
