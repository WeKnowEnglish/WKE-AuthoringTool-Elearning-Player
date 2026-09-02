import type { Session3ActivityId, Session3FriendId, Session3PracticeActivityId } from "./session-3";

export const GRADE_4_SESSION_3_RUN = {
  courseId: "grade-4-wke-learning-paths",
  unitId: "unit-1-meet-me",
  sessionId: "session-3-find-something-in-common",
  contentVersion: "2026-09-01.1",
} as const;

export type Session3RunProgress = {
  activeStageId: string;
  foundBadgeIds: Session3ActivityId[];
  favouriteActivityId: Session3ActivityId | null;
  questionChunks: string[];
  questionPractised: boolean;
  visitedFriendIds: Session3FriendId[];
  chosenFriendId: Session3FriendId | null;
  commonSentenceReady: boolean;
  commonSentencePractised: boolean;
  checkIndex: number;
  reflection: string | null;
  activePracticeActivityId: Session3PracticeActivityId | null;
  completedPracticeActivityIds: Session3PracticeActivityId[];
  writingDraft: string;
};

export type Session3CourseRunRecord = {
  id: string;
  studentId: string;
  contentVersion: string;
  status: "in_progress" | "completed";
  activeStepId: string;
  state: Session3RunProgress;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
};

const ACTIVITY_IDS = new Set<Session3ActivityId>(["painting", "football", "reading"]);
const FRIEND_IDS = new Set<Session3FriendId>(["mia", "leo", "sam"]);
const QUESTION_CHUNKS = new Set(["Do", "you like"]);
const PRACTICE_IDS = new Set<Session3PracticeActivityId>(["vocabulary", "question-scramble", "listen-answer", "grammar-focus", "fix-chat", "read-note", "write-chat"]);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function shortString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function emptySession3RunProgress(): Session3RunProgress {
  return {
    activeStageId: "mission",
    foundBadgeIds: [],
    favouriteActivityId: null,
    questionChunks: [],
    questionPractised: false,
    visitedFriendIds: [],
    chosenFriendId: null,
    commonSentenceReady: false,
    commonSentencePractised: false,
    checkIndex: 0,
    reflection: null,
    activePracticeActivityId: null,
    completedPracticeActivityIds: [],
    writingDraft: "",
  };
}

export function normalizeSession3RunProgress(value: unknown): Session3RunProgress {
  const input = record(value);
  const favourite = shortString(input.favouriteActivityId, 20) as Session3ActivityId;
  const chosenFriend = shortString(input.chosenFriendId, 20) as Session3FriendId;
  const activePractice = shortString(input.activePracticeActivityId, 40) as Session3PracticeActivityId;
  return {
    activeStageId: shortString(input.activeStageId, 80) || "mission",
    foundBadgeIds: Array.isArray(input.foundBadgeIds) ? [...new Set(input.foundBadgeIds.filter((id): id is Session3ActivityId => typeof id === "string" && ACTIVITY_IDS.has(id as Session3ActivityId)))].slice(0, 3) : [],
    favouriteActivityId: ACTIVITY_IDS.has(favourite) ? favourite : null,
    questionChunks: Array.isArray(input.questionChunks) ? input.questionChunks.filter((chunk): chunk is string => typeof chunk === "string" && QUESTION_CHUNKS.has(chunk)).slice(0, 2) : [],
    questionPractised: input.questionPractised === true,
    visitedFriendIds: Array.isArray(input.visitedFriendIds) ? [...new Set(input.visitedFriendIds.filter((id): id is Session3FriendId => typeof id === "string" && FRIEND_IDS.has(id as Session3FriendId)))].slice(0, 3) : [],
    chosenFriendId: FRIEND_IDS.has(chosenFriend) ? chosenFriend : null,
    commonSentenceReady: input.commonSentenceReady === true,
    commonSentencePractised: input.commonSentencePractised === true,
    checkIndex: Math.max(0, Math.min(3, Number.isInteger(input.checkIndex) ? Number(input.checkIndex) : 0)),
    reflection: shortString(input.reflection, 80) || null,
    activePracticeActivityId: PRACTICE_IDS.has(activePractice) ? activePractice : null,
    completedPracticeActivityIds: Array.isArray(input.completedPracticeActivityIds) ? [...new Set(input.completedPracticeActivityIds.filter((id): id is Session3PracticeActivityId => typeof id === "string" && PRACTICE_IDS.has(id as Session3PracticeActivityId)))].slice(0, 7) : [],
    writingDraft: typeof input.writingDraft === "string" ? input.writingDraft.slice(0, 10000) : "",
  };
}

export function normalizeSession3CourseRunRow(row: Record<string, unknown>): Session3CourseRunRecord {
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    contentVersion: String(row.content_version),
    status: row.status === "completed" ? "completed" : "in_progress",
    activeStepId: shortString(row.active_step_id, 80) || "mission",
    state: normalizeSession3RunProgress(row.state),
    startedAt: String(row.started_at),
    completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
    updatedAt: String(row.updated_at),
  };
}
