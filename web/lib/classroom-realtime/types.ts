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
  learnStage: "whiteboard" | "activity";
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

export type ClassroomRealtimeHealth = {
  connection: ClassroomRealtimeConnectionState;
  sessionId: string;
  snapshotVersion: number | null;
  reconnectCount: number;
  lastEventAt: number | null;
};
