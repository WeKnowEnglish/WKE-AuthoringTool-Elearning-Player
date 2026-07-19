import type { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import type {
  BoardBackground,
  BoardOwnerType,
  BoardStatus,
  Point,
  SubmissionType,
  TimerState,
  WhiteboardElement,
  WhiteboardMode,
  WhiteboardPrompt,
  WhiteboardRoundPhase,
  WhiteboardSettings,
  WhiteboardToolId,
} from "@/lib/whiteboard/domain";
import type { SharedReviewState } from "@/lib/activity-runtime/review-task-types";
import type { ReviewTaskState } from "@/lib/whiteboard/review-task";

export type WhiteboardParticipant = {
  name: string;
  color: string;
  role: "host" | "player";
  joinedAt: number;
  groupId: string | null;
  ready: boolean;
  rewardCount: number;
};

export type WhiteboardBoardFields = {
  id: string;
  ownerType: BoardOwnerType;
  ownerId: string;
  status: BoardStatus;
  revision: number;
  submittedAt: number | null;
  privateHint: string | null;
  elements: LiveMap<string, WhiteboardElement>;
  zOrder: LiveList<string>;
  annotations: LiveMap<string, WhiteboardElement>;
  annotationZOrder: LiveList<string>;
  previewDataUrl: string | null;
};

export type WhiteboardRuntimeFields = {
  roundId: string;
  phase: WhiteboardRoundPhase;
  mode: WhiteboardMode;
  timer: TimerState;
  prompt: WhiteboardPrompt;
  settings: WhiteboardSettings;
  joinCode: string;
  hostUserId: string;
  displayBoardId: string | null;
  displayAnonymous: boolean;
  compareBoardIds: [string, string] | null;
  compareAnonymous: boolean;
  /** Shared review blob (WB-2+). Prefer this over legacy fields. */
  review: SharedReviewState | null;
  /** Legacy Show/Compare task — dual-written with `review` during migration. */
  reviewTask: ReviewTaskState | null;
  background: BoardBackground;
  promptVersion: number;
  stampPackId: string;
  classId: string | null;
  sessionId: string | null;
  productMode: boolean;
};

export type WhiteboardSubmissionRecord = {
  id: string;
  boardId: string;
  ownerType: BoardOwnerType;
  ownerId: string;
  contributorIds: string[];
  revision: number;
  submissionType: SubmissionType;
  documentJson: string;
  submittedAt: number;
  previewDataUrl: string | null;
};

export type WhiteboardGroup = {
  id: string;
  name: string;
  memberIds: string[];
  leaderId: string | null;
};

export type WhiteboardPresence = {
  cursor: Point | null;
  activeBoardId: string | null;
  selectedElementId: string | null;
  currentTool: WhiteboardToolId;
  handRaised: boolean;
  activityStatus: "waiting" | "working" | "ready" | "submitted" | "away";
  displayName: string;
  role: "host" | "player";
  clientInstanceId: string;
};

export type WhiteboardStorage = {
  runtime: LiveObject<WhiteboardRuntimeFields>;
  boards: LiveMap<string, LiveObject<WhiteboardBoardFields>>;
  participants: LiveMap<string, LiveObject<WhiteboardParticipant>>;
  groups: LiveMap<string, LiveObject<WhiteboardGroup>>;
  submissions: LiveMap<string, LiveObject<WhiteboardSubmissionRecord>>;
};

export const DEFAULT_WHITEBOARD_PRESENCE: WhiteboardPresence = {
  cursor: null,
  activeBoardId: null,
  selectedElementId: null,
  currentTool: "pen",
  handRaised: false,
  activityStatus: "waiting",
  displayName: "Guest",
  role: "player",
  clientInstanceId: "unknown",
};
