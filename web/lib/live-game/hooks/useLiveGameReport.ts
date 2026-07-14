"use client";

import { useCallback, useEffect, useState } from "react";
import type { LiveGameReport } from "@/lib/live-game/reports/types";
import { diagnosticFetch, recordLiveGameDiagnostic } from "@/lib/live-game/diagnostics/client";

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
      recordLiveGameDiagnostic("report", "report_loading_started", { sessionId });
      const maxAttempts = 20;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
          const response = await diagnosticFetch(`/api/live-game/sessions/${encodeURIComponent(sessionId)}/report`, {
            cache: "no-store",
            signal: controller.signal,
          }, { phase: "report", name: "report_request", detail: { attempt: attempt + 1, sessionId } });
          const payload = (await response.json()) as LiveGameReport & { error?: string };
          if (response.ok) {
            if (!cancelled) {
              setReport(payload);
              recordLiveGameDiagnostic("report", "report_payload_ready", {
                attempt: attempt + 1,
                role: payload.role,
                sessionId,
                participantCount: payload.team.participantCount,
                encounterCount: payload.team.totalEncounters,
              });
            }
            return;
          }
          if (response.status !== 409 || attempt === maxAttempts - 1) {
            throw new Error(payload.error ?? "Could not load the round report.");
          }
          recordLiveGameDiagnostic("report", "report_retry_wait", { attempt: attempt + 1, status: response.status });
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (loadError) {
          if (controller.signal.aborted) return;
          if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load the round report.");
          recordLiveGameDiagnostic("report", "report_loading_failed", {
            error: loadError instanceof Error ? loadError.message : String(loadError),
          }, { kind: "error" });
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
