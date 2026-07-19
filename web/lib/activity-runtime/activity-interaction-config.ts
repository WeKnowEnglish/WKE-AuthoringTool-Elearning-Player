import type { ActivityParticipationMode } from "@/lib/activity-runtime/activity-types";

/** Style-guide ActivityInteractionConfig — every VC activity configures this. */
export type ActivityInteractionConfig = {
  participationMode: ActivityParticipationMode;
  studentStates: {
    waiting: boolean;
    active: boolean;
    submitted: boolean;
    review: boolean;
    revision: boolean;
  };
  reviewModes: Array<"show" | "compare" | "gallery" | "peer_review" | "model_answer">;
  /** Must be true for VirtualClassroom activities. */
  pushToStudent: boolean;
  allowRevision: boolean;
  anonymousReview: boolean;
  timerEnabled: boolean;
  rewardsEnabled: boolean;
};

/** Default launch mode is individual; round may be group or whole_class at launch. */
export const DOCUMENT_INTERACTION_CONFIG: ActivityInteractionConfig = {
  participationMode: "individual",
  studentStates: {
    waiting: true,
    active: true,
    submitted: true,
    review: true,
    revision: true,
  },
  // Compare applies to individual/group; whole-class uses Show only.
  reviewModes: ["show", "compare"],
  pushToStudent: true,
  allowRevision: true,
  anonymousReview: true,
  timerEnabled: true,
  rewardsEnabled: true,
};

export const WHITEBOARD_INTERACTION_CONFIG: ActivityInteractionConfig = {
  participationMode: "individual",
  studentStates: {
    waiting: true,
    active: true,
    submitted: true,
    review: true,
    revision: true,
  },
  reviewModes: ["show", "compare"],
  pushToStudent: true,
  allowRevision: true,
  anonymousReview: true,
  timerEnabled: true,
  rewardsEnabled: true,
};
