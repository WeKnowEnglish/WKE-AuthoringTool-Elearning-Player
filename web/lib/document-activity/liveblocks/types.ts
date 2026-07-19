import type { SharedReviewState } from "@/lib/activity-runtime/review-task-types";
import type {
  DocumentOwnerType,
  DocumentParticipationMode,
  DocumentRuntimePhase,
  DocumentTemplateType,
  DocumentWorkStatus,
} from "@/lib/document-activity/types";
import type {
  DocumentPrompt,
  DocumentRoundSettings,
  DocumentScaffolds,
} from "@/lib/document-activity/domain";

export type DocumentRuntimeFields = {
  roundId: string;
  vcSessionId: string;
  phase: DocumentRuntimePhase;
  participationMode: DocumentParticipationMode;
  templateType: DocumentTemplateType;
  prompt: DocumentPrompt;
  scaffolds: DocumentScaffolds;
  settings: DocumentRoundSettings;
  hostUserId: string;
  review: SharedReviewState | null;
  classId: string | null;
  openedAt: number | null;
  collectedAt: number | null;
  completedAt: number | null;
};

export type DocumentFields = {
  id: string;
  ownerType: DocumentOwnerType;
  ownerId: string;
  status: DocumentWorkStatus;
  revision: number;
  submittedAt: number | null;
  returnNote: string | null;
  displayName: string;
};

export type DocumentGroupFields = {
  id: string;
  name: string;
  memberIds: string[];
  leaderId: string | null;
};

export type DocumentParticipant = {
  name: string;
  role: "host" | "player";
  joinedAt: number;
  color: string;
  /** Document-local ready (group submit policy / peer signal). */
  ready: boolean;
  groupId: string | null;
};

export type DocumentPresence = {
  displayName: string;
  role: "host" | "player";
  clientInstanceId: string;
  cursor: null;
};

export const DEFAULT_DOCUMENT_PRESENCE: DocumentPresence = {
  displayName: "Guest",
  role: "player",
  clientInstanceId: "pending",
  cursor: null,
};
