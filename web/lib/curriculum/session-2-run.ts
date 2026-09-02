import type { Session2FriendId, Session2PracticeActivityId } from "./session-2";

export const GRADE_4_SESSION_2_RUN = {
  courseId: "grade-4-wke-learning-paths",
  unitId: "unit-1-meet-me",
  sessionId: "session-2-find-a-fair-friend",
  contentVersion: "2026-09-01.1",
} as const;

export type Session2RunProgress = {
  activeStageId: string;
  foundTokenIds: string[];
  questionChunks: string[];
  questionUsed: boolean;
  visitedFriendIds: Session2FriendId[];
  chosenFriendId: Session2FriendId | null;
  introPronoun: string | null;
  introInterest: string | null;
  checkIndex: number;
  reflection: string | null;
  activePracticeActivityId: Session2PracticeActivityId | null;
  completedPracticeActivityIds: Session2PracticeActivityId[];
  writingDraft: string;
};

export type Session2CourseRunRecord = {
  id: string;
  studentId: string;
  contentVersion: string;
  status: "in_progress" | "completed";
  activeStepId: string;
  state: Session2RunProgress;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
};

const FRIEND_IDS = new Set<Session2FriendId>(["mia", "leo", "sam"]);
const TOKEN_IDS = new Set(["name", "age", "interest", "ability"]);
const QUESTION_CHUNKS = new Set(["What", "do you like", "doing?"]);
const PRACTICE_IDS = new Set<Session2PracticeActivityId>(["vocabulary", "question-scramble", "listen-match", "grammar-focus", "fix-dialogue", "read-profile", "write-profile"]);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function shortString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function emptySession2RunProgress(): Session2RunProgress {
  return {
    activeStageId: "mission",
    foundTokenIds: [],
    questionChunks: [],
    questionUsed: false,
    visitedFriendIds: [],
    chosenFriendId: null,
    introPronoun: null,
    introInterest: null,
    checkIndex: 0,
    reflection: null,
    activePracticeActivityId: null,
    completedPracticeActivityIds: [],
    writingDraft: "",
  };
}

export function normalizeSession2RunProgress(value: unknown): Session2RunProgress {
  const input = record(value);
  const friendId = shortString(input.chosenFriendId, 20) as Session2FriendId;
  const activePractice = shortString(input.activePracticeActivityId, 40) as Session2PracticeActivityId;
  return {
    activeStageId: shortString(input.activeStageId, 80) || "mission",
    foundTokenIds: Array.isArray(input.foundTokenIds) ? [...new Set(input.foundTokenIds.filter((id): id is string => typeof id === "string" && TOKEN_IDS.has(id)))].slice(0, 4) : [],
    questionChunks: Array.isArray(input.questionChunks) ? input.questionChunks.filter((chunk): chunk is string => typeof chunk === "string" && QUESTION_CHUNKS.has(chunk)).slice(0, 3) : [],
    questionUsed: input.questionUsed === true,
    visitedFriendIds: Array.isArray(input.visitedFriendIds) ? [...new Set(input.visitedFriendIds.filter((id): id is Session2FriendId => typeof id === "string" && FRIEND_IDS.has(id as Session2FriendId)))].slice(0, 3) : [],
    chosenFriendId: FRIEND_IDS.has(friendId) ? friendId : null,
    introPronoun: ["He", "She"].includes(shortString(input.introPronoun, 10)) ? shortString(input.introPronoun, 10) : null,
    introInterest: shortString(input.introInterest, 80) || null,
    checkIndex: Math.max(0, Math.min(3, Number.isInteger(input.checkIndex) ? Number(input.checkIndex) : 0)),
    reflection: shortString(input.reflection, 80) || null,
    activePracticeActivityId: PRACTICE_IDS.has(activePractice) ? activePractice : null,
    completedPracticeActivityIds: Array.isArray(input.completedPracticeActivityIds) ? [...new Set(input.completedPracticeActivityIds.filter((id): id is Session2PracticeActivityId => typeof id === "string" && PRACTICE_IDS.has(id as Session2PracticeActivityId)))].slice(0, 7) : [],
    writingDraft: typeof input.writingDraft === "string" ? input.writingDraft.slice(0, 10000) : "",
  };
}

export function normalizeSession2CourseRunRow(row: Record<string, unknown>): Session2CourseRunRecord {
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    contentVersion: String(row.content_version),
    status: row.status === "completed" ? "completed" : "in_progress",
    activeStepId: shortString(row.active_step_id, 80) || "mission",
    state: normalizeSession2RunProgress(row.state),
    startedAt: String(row.started_at),
    completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
    updatedAt: String(row.updated_at),
  };
}
