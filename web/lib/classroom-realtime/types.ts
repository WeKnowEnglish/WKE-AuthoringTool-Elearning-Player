/**
 * Provider-neutral contract for the Virtual Classroom control plane.
 *
 * This module intentionally contains no Liveblocks or Supabase imports.  It
 * describes the state every realtime transport must be able to recover after a
 * reconnect.  It is introduced before transport migration and is not yet used
 * by the running classroom.
 */

export type ClassroomRealtimeRole = "teacher" | "student";

export type ClassroomRealtimeConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export type ClassroomParticipantPresence = {
  userId: string;
  displayName: string;
  role: ClassroomRealtimeRole;
  status: "active" | "away";
  handRaised: boolean;
  activeSurface?: "meeting" | "learn";
};

export type ClassroomRuntimeSnapshot = {
  /** Existing `class_sessions.id`. */
  sessionId: string;
  /** Monotonically increasing durable state version. */
  stateVersion: number;
  status: "active" | "ended";
  uiMode: "meeting" | "learn";
  learnStage: "whiteboard" | "activity" | "presentation";
  /** Studio / track activity displayed when the shared Learn stage is activity. */
  learnActivity: {
    activityId: string;
    format: string;
    title: string;
    playPath: string;
  } | null;
  learnPresentation: {
    kind: "image" | "pdf";
    url: string;
    title: string;
    mediaAssetId?: string | null;
  } | null;
  learnStudentPensEnabled: boolean;
  announcement: string | null;
  activeActivity: {
    kind: "whiteboard" | "document" | "word_cards" | null;
    joinCode: string | null;
    label: string | null;
    roundId: string | null;
    roomId: string | null;
  };
  /** Serialized existing tool state.  Its detailed schemas remain domain-owned. */
  tools: Record<string, unknown>;
  updatedAt: string;
  updatedBy: string;
};

/** Small, server-validated live update. Full state always recovers from the snapshot. */
export type ClassroomRuntimePatch = Partial<
  Pick<
    ClassroomRuntimeSnapshot,
    | "uiMode"
    | "learnStage"
    | "learnActivity"
    | "learnPresentation"
    | "learnStudentPensEnabled"
    | "announcement"
    | "status"
    | "activeActivity"
  >
> & {
  /** Individually changed low-frequency classroom tools. */
  tools?: Record<string, unknown>;
};

export type ClassroomRealtimeHealth = {
  connection: ClassroomRealtimeConnectionState;
  sessionId: string;
  snapshotVersion: number | null;
  reconnectCount: number;
  lastEventAt: number | null;
};
