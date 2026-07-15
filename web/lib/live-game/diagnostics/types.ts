export type LiveGameDiagnosticPhase =
  | "entry"
  | "room"
  | "lobby"
  | "gameplay"
  | "exit"
  | "report"
  | "system";

export type LiveGameDiagnosticServerTimingEntry = {
  name: string;
  durationMs: number;
};

export type LiveGameDiagnosticDetailValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | LiveGameDiagnosticServerTimingEntry[];

export type LiveGameDiagnosticDetail = Record<string, LiveGameDiagnosticDetailValue>;

export type LiveGameDiagnosticEvent = {
  id: string;
  traceId: string;
  deviceId: string;
  at: number;
  phase: LiveGameDiagnosticPhase;
  name: string;
  kind: "mark" | "span" | "error";
  durationMs?: number;
  roomId?: string;
  role?: "host" | "player";
  displayName?: string;
  detail?: LiveGameDiagnosticDetail;
};
