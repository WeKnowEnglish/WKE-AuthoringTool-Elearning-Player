import type { Session1PracticeActivityId } from "./session-1-practice";

export const GRADE_4_SESSION_1_RUN = {
  courseId: "grade-4-wke-learning-paths",
  unitId: "unit-1-meet-me",
  sessionId: "session-1-enter-the-welcome-fair",
  contentVersion: "2026-08-31.2",
} as const;

export type CourseSessionRunPhase = "hotspot" | "practice";
export type CourseSessionRunStatus = "in_progress" | "completed";

export type Session1HotspotProgress = {
  activeStepId: string;
  badgeComplete: boolean;
  badgePreview: string | null;
  stationChoice: string | null;
  stationOpinions: Record<string, "like" | "dont_like">;
  introducedStationIds: string[];
  pictureCheckItemIds: string[];
  pictureCheckCorrectIds: string[];
  questionCorrect: boolean;
  reflection: string | null;
  nextStepGoal: string | null;
  completedVoiceParts: string[];
};

export type Session1PracticeProgress = {
  activeActivityId: Session1PracticeActivityId | null;
  completedActivityIds: Session1PracticeActivityId[];
  writingDraft: string;
};

export type Session1RunState = {
  hotspot: Session1HotspotProgress;
  practice: Session1PracticeProgress;
};

export type CourseSessionRunRecord = {
  id: string;
  studentId: string;
  courseId: string;
  unitId: string;
  sessionId: string;
  contentVersion: string;
  status: CourseSessionRunStatus;
  activePhase: CourseSessionRunPhase;
  activeStepId: string;
  state: Session1RunState;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
};

const PRACTICE_IDS = new Set<Session1PracticeActivityId>([
  "vocabulary",
  "letter-scramble",
  "grammar-focus",
  "fix-sentence",
  "free-writing",
]);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function shortString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function emptySession1RunState(): Session1RunState {
  return {
    hotspot: {
      activeStepId: "welcome",
      badgeComplete: false,
      badgePreview: null,
      stationChoice: null,
      stationOpinions: {},
      introducedStationIds: [],
      pictureCheckItemIds: [],
      pictureCheckCorrectIds: [],
      questionCorrect: false,
      reflection: null,
      nextStepGoal: null,
      completedVoiceParts: [],
    },
    practice: {
      activeActivityId: null,
      completedActivityIds: [],
      writingDraft: "",
    },
  };
}

export function normalizeSession1HotspotProgress(value: unknown): Session1HotspotProgress {
  const input = record(value);
  const rawOpinions = record(input.stationOpinions);
  const stationOpinions = Object.fromEntries(
    Object.entries(rawOpinions)
      .filter(([, opinion]) => opinion === "like" || opinion === "dont_like")
      .slice(0, 8),
  ) as Record<string, "like" | "dont_like">;
  const shortStringList = (candidate: unknown, maxItems: number) =>
    Array.isArray(candidate)
      ? [...new Set(candidate.map((item) => shortString(item, 40)).filter(Boolean))].slice(0, maxItems)
      : [];
  const badgePreview = typeof input.badgePreview === "string" &&
      input.badgePreview.startsWith("data:image/") && input.badgePreview.length <= 18000
    ? input.badgePreview
    : null;
  return {
    activeStepId: shortString(input.activeStepId, 120) || "welcome",
    badgeComplete: input.badgeComplete === true,
    badgePreview,
    stationChoice: shortString(input.stationChoice, 40) || null,
    stationOpinions,
    introducedStationIds: shortStringList(input.introducedStationIds, 8),
    pictureCheckItemIds: shortStringList(input.pictureCheckItemIds, 3),
    pictureCheckCorrectIds: shortStringList(input.pictureCheckCorrectIds, 5),
    questionCorrect: input.questionCorrect === true,
    reflection: shortString(input.reflection, 120) || null,
    nextStepGoal: shortString(input.nextStepGoal, 120) || null,
    completedVoiceParts: Array.isArray(input.completedVoiceParts)
      ? [...new Set(input.completedVoiceParts.map((part) => shortString(part, 60)).filter(Boolean))].slice(0, 10)
      : [],
  };
}

export function normalizeSession1PracticeProgress(value: unknown): Session1PracticeProgress {
  const input = record(value);
  const active = shortString(input.activeActivityId, 40) as Session1PracticeActivityId;
  const completed = Array.isArray(input.completedActivityIds)
    ? input.completedActivityIds.filter(
        (id): id is Session1PracticeActivityId => typeof id === "string" && PRACTICE_IDS.has(id as Session1PracticeActivityId),
      )
    : [];
  return {
    activeActivityId: PRACTICE_IDS.has(active) ? active : null,
    completedActivityIds: [...new Set(completed)],
    writingDraft: typeof input.writingDraft === "string" ? input.writingDraft.slice(0, 10000) : "",
  };
}

export function normalizeSession1RunState(value: unknown): Session1RunState {
  const input = record(value);
  return {
    hotspot: normalizeSession1HotspotProgress(input.hotspot),
    practice: normalizeSession1PracticeProgress(input.practice),
  };
}

export function normalizeCourseSessionRunRow(row: Record<string, unknown>): CourseSessionRunRecord {
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    courseId: String(row.course_id),
    unitId: String(row.unit_id),
    sessionId: String(row.session_id),
    contentVersion: String(row.content_version),
    status: row.status === "completed" ? "completed" : "in_progress",
    activePhase: row.active_phase === "practice" ? "practice" : "hotspot",
    activeStepId: shortString(row.active_step_id, 120),
    state: normalizeSession1RunState(row.state),
    startedAt: String(row.started_at),
    completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
    updatedAt: String(row.updated_at),
  };
}
