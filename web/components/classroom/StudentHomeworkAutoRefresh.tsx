"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const STUDENT_PORTAL_REFRESH_MS = 5_000;

/**
 * Keep an idle student home/class screen in sync with live-class and homework
 * changes. Server reads are no-store, so router.refresh() fetches the current
 * enrolled-class state without reloading the browser or losing login.
 */
export function StudentHomeworkAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let lastRefreshAt = Date.now();

    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshAt < 2_000) return;
      lastRefreshAt = now;
      router.refresh();
    };

    const intervalId = window.setInterval(refresh, STUDENT_PORTAL_REFRESH_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  return null;
}
