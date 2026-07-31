export type {
  AppDiagnosticDetail,
  AppDiagnosticEvent,
  AppDiagnosticKind,
  AppDiagnosticSurface,
} from "@/lib/app-diagnostics/types";

export {
  appDiagnosticsEnabled,
  clearAppDiagnosticEvents,
  diagnosticFetch,
  exportAppDiagnosticsAsCsv,
  exportAppDiagnosticsAsJson,
  getAppDiagnosticSessionId,
  instrumentedFetch,
  readAppDiagnosticEvents,
  recordAppDiagnostic,
  startAppDiagnosticSpan,
  subscribeToAppDiagnostics,
} from "@/lib/app-diagnostics/client";

export { initWebVitalsDiagnostics } from "@/lib/app-diagnostics/web-vitals";
export { lazyWithDiagnostics } from "@/lib/app-diagnostics/lazy";
