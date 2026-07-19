import type { LearningEvidenceEvent } from "@/lib/mastery/types";
import { recordLearningEvidenceEvent } from "@/lib/mastery/local-storage";
import { awardRewards } from "@/lib/progress/rewards";

export function recordWhiteboardSubmitEvidence(input: {
  studentId: string;
  roundId: string;
  boardId: string;
  revision: number;
}): void {
  const evidence: LearningEvidenceEvent = {
    id: `wb-evidence:${input.roundId}:${input.boardId}:${input.revision}`,
    studentId: input.studentId,
    sessionId: input.roundId,
    occurredAt: new Date().toISOString(),
    source: "whiteboard",
    activityId: `whiteboard:${input.roundId}`,
    itemId: input.boardId,
    targetRefs: [
      {
        type: "skill",
        key: "collaborative_whiteboard",
        label: "Collaborative whiteboard",
      },
    ],
    response: {
      kind: "other",
      success: true,
      firstTry: input.revision <= 1,
      attempts: Math.max(1, input.revision),
    },
    context: {
      activityMode: "practice",
      evidenceMode: "production",
    },
  };
  recordLearningEvidenceEvent(evidence);
}

export function claimWhiteboardAwardClient(input: {
  awardId: string;
  goldDelta?: number;
  experienceDelta?: number;
}): void {
  awardRewards({
    eventId: input.awardId,
    goldDelta: input.goldDelta ?? 5,
    experienceDelta: input.experienceDelta ?? 10,
  });
}
