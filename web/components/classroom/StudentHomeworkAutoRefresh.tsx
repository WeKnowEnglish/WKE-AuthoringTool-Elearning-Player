"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const HOMEWORK_REFRESH_MS = 15_000;

/**
 * Keep an idle student home/class screen in sync while a teacher is assigning.
 * Server homework reads are no-store, so router.refresh() fetches the current
 * RLS-filtered assignment list without reloading the browser or losing login.
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

    const intervalId = window.setInterval(refresh, HOMEWORK_REFRESH_MS);
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
