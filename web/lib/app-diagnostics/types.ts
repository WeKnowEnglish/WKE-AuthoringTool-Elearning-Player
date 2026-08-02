export type AppDiagnosticSurface =
  | "student"
  | "teacher"
  | "lesson"
  | "live-game"
  | "parent"
  | "admin";

export type AppDiagnosticKind = "mark" | "span" | "error" | "vital";

export type AppDiagnosticServerTimingEntry = {
  name: string;
  durationMs: number;
};

export type AppDiagnosticDetailValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | AppDiagnosticServerTimingEntry[];

export type AppDiagnosticDetail = Record<string, AppDiagnosticDetailValue>;

export type AppDiagnosticEvent = {
  id: string;
  sessionId: string;
  deviceId: string;
  at: number;
  surface: AppDiagnosticSurface;
  phase: string;
  name: string;
  kind: AppDiagnosticKind;
  durationMs?: number;
  route?: string;
  detail?: AppDiagnosticDetail;
  classId?: string;
  activityId?: string;
  homeworkId?: string;
  status?: string;
  errorCode?: string;
  appVersion?: string;
  deviceCategory?: "mobile" | "tablet" | "desktop" | "unknown";
};

export type AppDiagnosticRecordOptions = {
  kind?: AppDiagnosticKind;
  durationMs?: number;
  route?: string;
  classId?: string;
  activityId?: string;
  homeworkId?: string;
  status?: string;
  errorCode?: string;
};

export type AppDiagnosticFetchOptions = {
  surface: AppDiagnosticSurface;
  phase: string;
  name: string;
  detail?: AppDiagnosticDetail;
};
