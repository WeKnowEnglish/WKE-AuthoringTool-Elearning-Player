"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  appDiagnosticsEnabled,
  flushAppDiagnosticQueue,
  recordAppDiagnostic,
} from "@/lib/app-diagnostics/client";
import { initWebVitalsDiagnostics } from "@/lib/app-diagnostics/web-vitals";

/** Zero-UI bootstrap for site-wide session diagnostics. */
export function AppDiagnosticsInit() {
  const pathname = usePathname();
  const started = useRef(false);
  useEffect(() => {
    if (!appDiagnosticsEnabled()) return;
    if (started.current) return;
    started.current = true;
    initWebVitalsDiagnostics();
    const surface = pathname.startsWith("/teacher") ? "teacher" : pathname.startsWith("/live-game") ? "live-game" : "student";
    recordAppDiagnostic(surface, "session", "session_started", {
      online: navigator.onLine,
    });
    void flushAppDiagnosticQueue();
    const flush = () => void flushAppDiagnosticQueue();
    const recordOffline = () => recordAppDiagnostic(surface, "network", "offline_detected", undefined, {
      kind: "error",
      status: "offline",
      errorCode: "browser_offline",
    });
    const recordOnline = () => {
      recordAppDiagnostic(surface, "network", "connection_restored", undefined, {
        status: "online",
      });
      flush();
    };
    const recordWindowError = (event: ErrorEvent) => recordAppDiagnostic(
      surface,
      "runtime",
      "client_error",
      { line: event.lineno || null, column: event.colno || null },
      { kind: "error", status: "failed", errorCode: event.error?.name || "window_error" },
    );
    const recordUnhandledRejection = (event: PromiseRejectionEvent) => recordAppDiagnostic(
      surface,
      "runtime",
      "unhandled_rejection",
      undefined,
      {
        kind: "error",
        status: "failed",
        errorCode: event.reason instanceof Error ? event.reason.name : "unhandled_rejection",
      },
    );
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      recordAppDiagnostic(surface, "session", "session_heartbeat", {
        online: navigator.onLine,
      }, { status: "active" });
    }, 60_000);
    const recordSessionEnd = () => {
      recordAppDiagnostic(surface, "session", "session_ended", undefined, {
        status: "ended",
      });
      flush();
    };
    window.addEventListener("online", recordOnline);
    window.addEventListener("offline", recordOffline);
    window.addEventListener("error", recordWindowError);
    window.addEventListener("unhandledrejection", recordUnhandledRejection);
    window.addEventListener("pagehide", recordSessionEnd);
    window.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("online", recordOnline);
      window.removeEventListener("offline", recordOffline);
      window.removeEventListener("error", recordWindowError);
      window.removeEventListener("unhandledrejection", recordUnhandledRejection);
      window.removeEventListener("pagehide", recordSessionEnd);
      window.removeEventListener("visibilitychange", flush);
      window.clearInterval(heartbeat);
    };
  }, [pathname]);

  return null;
}
