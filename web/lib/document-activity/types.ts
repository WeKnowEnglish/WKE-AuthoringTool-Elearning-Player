export type DocumentTemplateType =
  | "paragraph"
  | "story_continuation"
  | "reading_response"
  | "dialogue";

export type DocumentParticipationMode = "individual" | "group" | "whole_class";

export type DocumentRuntimePhase =
  | "waiting"
  | "active"
  | "collected"
  | "review"
  | "revision"
  | "completed";

export type DocumentWorkStatus =
  | "waiting"
  | "active"
  | "submitted"
  | "auto_submitted"
  | "returned"
  | "revising"
  | "completed"
  | "locked"
  | "reviewed";

export type DocumentOwnerType = "teacher" | "student" | "group" | "class";

export type DocumentAuthRole = "host" | "player";

export type DocumentRoundMeta = {
  roundId: string;
  vcSessionId: string;
  roomId: string;
  participationMode: DocumentParticipationMode;
  templateType: DocumentTemplateType;
  phase: DocumentRuntimePhase;
};
