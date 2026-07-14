export type LiveGameDiagnosticPhase =
  | "entry"
  | "room"
  | "lobby"
  | "gameplay"
  | "exit"
  | "report"
  | "system";

export type LiveGameDiagnosticDetail = Record<
  string,
  string | number | boolean | null | undefined
>;

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
