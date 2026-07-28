"use client";

import { useEffect } from "react";
import { appDiagnosticsEnabled } from "@/lib/app-diagnostics/client";
import { initWebVitalsDiagnostics } from "@/lib/app-diagnostics/web-vitals";

/** Zero-UI bootstrap for site-wide session diagnostics. */
export function AppDiagnosticsInit() {
  useEffect(() => {
    if (!appDiagnosticsEnabled()) return;
    initWebVitalsDiagnostics();
  }, []);

  return null;
}
