"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ensureSamSession,
  getSamModelStatus,
  resetSamSession,
  subscribeSamModelStatus,
} from "./loader";
import type { SamModelStatus } from "./types";
import { recordAppDiagnostic } from "@/lib/app-diagnostics/client";

/** Teacher-only SlimSAM preload hook for hotspot authoring. */
export function useHotspotSamModel(enabled: boolean) {
  const [status, setStatus] = useState<SamModelStatus>(getSamModelStatus);

  useEffect(() => {
    return subscribeSamModelStatus(setStatus);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (status.state === "loading") {
      recordAppDiagnostic("teacher", "mark", "sam_model_load_start");
    } else if (status.state === "ready") {
      recordAppDiagnostic("teacher", "mark", "sam_model_load_complete");
    } else if (status.state === "error") {
      recordAppDiagnostic(
        "teacher",
        "error",
        "sam_model_load_failed",
        { error: status.error ?? "unknown" },
        { kind: "error" },
      );
    }
  }, [enabled, status.error, status.state]);

  const preload = useCallback(async () => {
    if (!enabled) return;
    try {
      await ensureSamSession();
    } catch {
      // status updated via subscription
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled && status.state === "idle") {
      void preload();
    }
  }, [enabled, preload, status.state]);

  const retry = useCallback(async () => {
    if (!enabled) return;
    resetSamSession();
    try {
      await ensureSamSession();
    } catch {
      // status updated via subscription
    }
  }, [enabled]);

  return {
    samStatus: status,
    samReady: status.state === "ready",
    samLoading: status.state === "loading",
    samError: status.error,
    preloadSam: preload,
    retrySam: retry,
  };
}
