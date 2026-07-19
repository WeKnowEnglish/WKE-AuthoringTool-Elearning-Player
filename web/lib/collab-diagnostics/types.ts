export type CollabDiagPhase =
  | "enter"
  | "classroom"
  | "join"
  | "launch"
  | "command"
  | "submit"
  | "liveblocks"
  | "system";

export type CollabDiagServerTimingEntry = {
  name: string;
  durationMs: number;
};

export type CollabDiagDetailValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | CollabDiagServerTimingEntry[];

export type CollabDiagDetail = Record<string, CollabDiagDetailValue>;

export type CollabDiagEvent = {
  id: string;
  traceId: string;
  at: number;
  phase: CollabDiagPhase;
  name: string;
  kind: "mark" | "span" | "error";
  durationMs?: number;
  detail?: CollabDiagDetail;
};
