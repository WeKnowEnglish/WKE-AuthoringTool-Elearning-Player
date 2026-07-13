"use client";

import { useCallback, useEffect, useState } from "react";
import type { LiveGameReport } from "@/lib/live-game/reports/types";

export function useLiveGameReport(sessionId: string) {
  const [report, setReport] = useState<LiveGameReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      for (let attempt = 0; attempt < 7; attempt += 1) {
        try {
          const response = await fetch(`/api/live-game/sessions/${encodeURIComponent(sessionId)}/report`, {
            cache: "no-store",
            signal: controller.signal,
          });
          const payload = (await response.json()) as LiveGameReport & { error?: string };
          if (response.ok) {
            if (!cancelled) setReport(payload);
            return;
          }
          if (response.status !== 409 || attempt === 6) {
            throw new Error(payload.error ?? "Could not load the round report.");
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (loadError) {
          if (controller.signal.aborted) return;
          if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load the round report.");
          return;
        }
      }
    }
    void load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reloadKey, sessionId]);

  return { report, error, loading, retry };
}
