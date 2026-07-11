import { randomBytes } from "node:crypto";
import { ENGLISH_CRAFT_CHALLENGE_TTL_MS } from "@/lib/live-game/modes/english-craft/gameplay-v1";

export type LiveGameChallengeRecord = {
  challengeId: string;
  roomId: string;
  playerId: string;
  nodeId: string;
  questionId: string;
  correctAnswer: string;
  expiresAt: number;
  used: boolean;
  awarded: boolean;
};

const challenges = new Map<string, LiveGameChallengeRecord>();

function purgeExpired(now = Date.now()) {
  for (const [id, record] of challenges.entries()) {
    if (record.expiresAt <= now) {
      challenges.delete(id);
    }
  }
}

export function createLiveGameChallenge(input: {
  roomId: string;
  playerId: string;
  nodeId: string;
  questionId: string;
  correctAnswer: string;
}): LiveGameChallengeRecord {
  purgeExpired();
  const challengeId = `ch_${randomBytes(12).toString("hex")}`;
  const record: LiveGameChallengeRecord = {
    challengeId,
    roomId: input.roomId,
    playerId: input.playerId,
    nodeId: input.nodeId,
    questionId: input.questionId,
    correctAnswer: input.correctAnswer,
    expiresAt: Date.now() + ENGLISH_CRAFT_CHALLENGE_TTL_MS,
    used: false,
    awarded: false,
  };
  challenges.set(challengeId, record);
  return record;
}

export function getLiveGameChallenge(challengeId: string): LiveGameChallengeRecord | null {
  purgeExpired();
  const record = challenges.get(challengeId);
  if (!record) return null;
  if (record.expiresAt <= Date.now()) {
    challenges.delete(challengeId);
    return null;
  }
  return record;
}

export function findActiveChallengeForPlayerNode(input: {
  roomId: string;
  playerId: string;
  nodeId: string;
}): LiveGameChallengeRecord | null {
  purgeExpired();
  for (const record of challenges.values()) {
    if (
      record.roomId === input.roomId &&
      record.playerId === input.playerId &&
      record.nodeId === input.nodeId &&
      !record.used &&
      record.expiresAt > Date.now()
    ) {
      return record;
    }
  }
  return null;
}

export function markChallengeUsed(challengeId: string): LiveGameChallengeRecord | null {
  const record = getLiveGameChallenge(challengeId);
  if (!record) return null;
  record.used = true;
  return record;
}

export function markChallengeAwarded(challengeId: string): LiveGameChallengeRecord | null {
  const record = challenges.get(challengeId) ?? null;
  if (!record) return null;
  record.awarded = true;
  record.used = true;
  return record;
}

/** Test helper */
export function clearLiveGameChallengesForTests() {
  challenges.clear();
}
