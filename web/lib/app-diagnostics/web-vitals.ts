"use client";

import { recordAppDiagnostic } from "@/lib/app-diagnostics/client";
import type { AppDiagnosticSurface } from "@/lib/app-diagnostics/types";

let initialized = false;

function inferSurface(pathname: string): AppDiagnosticSurface {
  if (pathname.startsWith("/teacher")) return "teacher";
  if (pathname.startsWith("/live-game")) return "live-game";
  if (
    pathname.startsWith("/primary") ||
    pathname.startsWith("/secondary") ||
    pathname.startsWith("/learn") ||
    pathname.startsWith("/home") ||
    pathname.startsWith("/activities")
  ) {
    return "student";
  }
  return "student";
}

function recordVital(
  name: string,
  value: number,
  detail?: Record<string, string | number | boolean | null | undefined>,
) {
  const route = typeof window !== "undefined" ? window.location.pathname : undefined;
  recordAppDiagnostic(
    route ? inferSurface(route) : "student",
    "navigation",
    name,
    { value, ...detail },
    { kind: "vital", durationMs: value },
  );
}

function observeNavigationTiming() {
  if (typeof window === "undefined" || !("performance" in window)) return;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!nav) return;

  recordVital("TTFB", Math.round(nav.responseStart - nav.requestStart), {
    domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
    loadEventEndMs: Math.round(nav.loadEventEnd - nav.startTime),
  });
}

function observeLcp() {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return;
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry & {
        renderTime?: number;
        loadTime?: number;
        size?: number;
      };
      if (!last) return;
      const value = Math.round(last.renderTime ?? last.loadTime ?? last.startTime);
      recordVital("LCP", value, {
        element: last.name,
        size: last.size ?? null,
      });
    });
    observer.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // Unsupported in this browser.
  }
}

function observeFcp() {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return;
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          recordVital("FCP", Math.round(entry.startTime));
        }
      }
    });
    observer.observe({ type: "paint", buffered: true });
  } catch {
    // Unsupported in this browser.
  }
}

function observeCls() {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return;
  let clsValue = 0;
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<
        PerformanceEntry & { hadRecentInput?: boolean; value?: number }
      >) {
        if (entry.hadRecentInput) continue;
        clsValue += entry.value ?? 0;
      }
    });
    observer.observe({ type: "layout-shift", buffered: true });

    const reportCls = () => {
      recordVital("CLS", Math.round(clsValue * 1000) / 1000);
    };
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") reportCls();
    });
    window.addEventListener("pagehide", reportCls);
  } catch {
    // Unsupported in this browser.
  }
}

function observeInp() {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return;
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { duration?: number }>) {
        const duration = entry.duration;
        if (duration == null) continue;
        recordVital("INP", Math.round(duration), { eventType: entry.name });
      }
    });
    observer.observe({ type: "event", buffered: true });
  } catch {
    // event timing unsupported — skip INP.
  }
}

function observeRouteChanges() {
  if (typeof window === "undefined") return;
  let lastPath = window.location.pathname + window.location.search;
  const recordRouteChange = (nextPath: string) => {
    if (nextPath === lastPath) return;
    const surface = inferSurface(nextPath);
    recordAppDiagnostic(surface, "navigation", "route_change", {
      from: lastPath,
      to: nextPath,
    });
    lastPath = nextPath;
  };

  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);
  history.pushState = (...args) => {
    originalPushState(...args);
    recordRouteChange(window.location.pathname + window.location.search);
  };
  history.replaceState = (...args) => {
    originalReplaceState(...args);
    recordRouteChange(window.location.pathname + window.location.search);
  };
  window.addEventListener("popstate", () => {
    recordRouteChange(window.location.pathname + window.location.search);
  });
}

export function initWebVitalsDiagnostics() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  observeNavigationTiming();
  observeLcp();
  observeFcp();
  observeCls();
  observeInp();
  observeRouteChanges();
}
