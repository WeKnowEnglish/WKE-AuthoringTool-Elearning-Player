import type { ActivityRoundPhase } from "@/lib/collaborative-activity/domain";

const TRANSITIONS: Record<ActivityRoundPhase, readonly ActivityRoundPhase[]> = {
  DRAFT: ["WAITING"],
  WAITING: ["OPEN"],
  OPEN: ["PAUSED", "COLLECTING"],
  PAUSED: ["OPEN", "COLLECTING"],
  COLLECTING: ["COLLECTED"],
  COLLECTED: ["REVIEW", "REVISION", "ENDED"],
  REVIEW: ["OPEN", "REVISION", "ENDED"],
  REVISION: ["COLLECTING", "ENDED"],
  ENDED: [],
};

export function canTransition(from: ActivityRoundPhase, to: ActivityRoundPhase): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: ActivityRoundPhase, to: ActivityRoundPhase): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid activity phase transition: ${from} → ${to}`);
  }
}

export function isEditingPhase(phase: ActivityRoundPhase): boolean {
  return phase === "OPEN" || phase === "REVISION";
}

export function isCollectingOrLater(phase: ActivityRoundPhase): boolean {
  return (
    phase === "COLLECTING" ||
    phase === "COLLECTED" ||
    phase === "REVIEW" ||
    phase === "ENDED"
  );
}
