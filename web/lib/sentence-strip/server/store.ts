import "server-only";

import type { ActivityRoundPhase, ActivityTimerState } from "@/lib/collaborative-activity/domain";
import { createIdleTimer } from "@/lib/collaborative-activity/domain";
import {
  assembleSentence,
  boardIdForStudent,
  createDefaultPrompt,
  shuffleTileOrder,
  type SentenceStripBoardState,
  type SentenceStripPrompt,
} from "@/lib/sentence-strip/domain";

export type SentenceStripRound = {
  joinCode: string;
  roundId: string;
  classId: string | null;
  hostUserId: string;
  phase: ActivityRoundPhase;
  prompt: SentenceStripPrompt;
  timer: ActivityTimerState;
  boards: Record<string, SentenceStripBoardState>;
  createdAt: number;
};

const rounds = new Map<string, SentenceStripRound>();

export function createSentenceStripRound(input: {
  joinCode: string;
  hostUserId: string;
  classId?: string | null;
  prompt?: SentenceStripPrompt;
  timerMinutes?: number;
}): SentenceStripRound {
  const prompt = input.prompt ?? createDefaultPrompt();
  const round: SentenceStripRound = {
    joinCode: input.joinCode,
    roundId: `strip_${input.joinCode}_${Date.now()}`,
    classId: input.classId ?? null,
    hostUserId: input.hostUserId,
    phase: "WAITING",
    prompt,
    timer: createIdleTimer(Math.max(1, input.timerMinutes ?? 3) * 60 * 1000),
    boards: {},
    createdAt: Date.now(),
  };
  rounds.set(input.joinCode, round);
  return round;
}

export function getSentenceStripRound(joinCode: string): SentenceStripRound | null {
  return rounds.get(joinCode.toUpperCase()) ?? null;
}

export function ensureStudentStripBoard(
  joinCode: string,
  studentId: string,
): SentenceStripBoardState | null {
  const round = getSentenceStripRound(joinCode);
  if (!round) return null;
  const boardId = boardIdForStudent(studentId);
  if (!round.boards[boardId]) {
    round.boards[boardId] = {
      boardId,
      orderedTileIds: shuffleTileOrder(round.prompt.tiles),
      status: "WAITING",
      feedback: null,
    };
  }
  return round.boards[boardId]!;
}

export function openSentenceStripBoards(joinCode: string): SentenceStripRound | null {
  const round = getSentenceStripRound(joinCode);
  if (!round) return null;
  if (round.phase === "WAITING" || round.phase === "REVIEW") {
    round.phase = "OPEN";
    for (const board of Object.values(round.boards)) {
      if (board.status === "WAITING" || board.status === "RETURNED") {
        board.status = "ACTIVE";
      }
    }
  }
  return round;
}

export function submitSentenceStripBoard(input: {
  joinCode: string;
  studentId: string;
  orderedTileIds: string[];
}): { ok: true; sentence: string } | { ok: false; error: string } {
  const round = getSentenceStripRound(input.joinCode);
  if (!round) return { ok: false, error: "Round not found." };
  if (round.phase !== "OPEN") return { ok: false, error: "Activity is not open." };
  const board = ensureStudentStripBoard(input.joinCode, input.studentId);
  if (!board) return { ok: false, error: "Board not found." };
  if (board.status === "SUBMITTED") return { ok: false, error: "Already submitted." };
  board.orderedTileIds = input.orderedTileIds;
  board.status = "SUBMITTED";
  return {
    ok: true,
    sentence: assembleSentence(round.prompt.tiles, board.orderedTileIds),
  };
}

export function returnSentenceStripBoard(input: {
  joinCode: string;
  boardId: string;
  feedback?: string;
}): { ok: true } | { ok: false; error: string } {
  const round = getSentenceStripRound(input.joinCode);
  if (!round) return { ok: false, error: "Round not found." };
  const board = round.boards[input.boardId];
  if (!board) return { ok: false, error: "Board not found." };
  board.status = "RETURNED";
  board.feedback = input.feedback?.trim().slice(0, 500) || null;
  return { ok: true };
}

export function listSentenceStripBoards(joinCode: string): SentenceStripBoardState[] {
  const round = getSentenceStripRound(joinCode);
  if (!round) return [];
  return Object.values(round.boards);
}
