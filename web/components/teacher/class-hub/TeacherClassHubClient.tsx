"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArchiveClassButton } from "@/components/teacher/ArchiveClassButton";
import { ClassHubHistoryOverlay } from "@/components/teacher/class-hub/ClassHubHistoryOverlay";
import { ClassScheduleTab } from "@/components/teacher/class-hub/ClassScheduleTab";
import { ClassSettingsTab } from "@/components/teacher/class-hub/ClassSettingsTab";
import { ClassStreamTab } from "@/components/teacher/class-hub/ClassStreamTab";
import type { ClassVocabularyListSummary } from "@/components/teacher/class-hub/ClassVocabularyListsPanel";
import { CreateLessonTab } from "@/components/teacher/class-hub/CreateLessonTab";
import { StudentsHomeworkTab } from "@/components/teacher/class-hub/StudentsHomeworkTab";
import { TeachTab } from "@/components/teacher/class-hub/TeachTab";
import type { TeacherTier } from "@/lib/auth/roles";
import type { StudentClassroomTabSettings } from "@/lib/classroom/classroom-tabs";
import type { ClassHomework, HomeworkCompletionSummary } from "@/lib/class-homework/types";
import type { ClassPost } from "@/lib/class-posts/types";
import type { ClassMeetingSlot } from "@/lib/class-schedule/types";
import type { ClassScheduleGroupingBoard } from "@/lib/class-schedule/preference-types";
import type {
  ClassLesson,
  LiveGameQuestionSetOption,
  StudioActivityOption,
} from "@/lib/class-lessons/types";
import type { LiveGameClassProjectOverview } from "@/lib/data/live-game-class-projects";
import type { ClassRosterStudent } from "@/lib/data/teacher-classes";
import type { TeacherWordPackSummary } from "@/lib/data/teacher-word-packs";
import type { TeacherClassStudentMasteryPreview } from "@/lib/mastery/teacher-mastery-summary";
import {
  classHubTabHref,
  classHubTabsForTier,
  parseClassHubTab,
  type ClassHubTab,
} from "@/lib/teacher/class-hub-tabs";
import type { TeacherSpaceItemSummary } from "@/lib/teacher-space/types";
import type { VirtualClassroomSessionHistoryItem } from "@/lib/virtual-classroom/session-history-types";
import type { WhiteboardRoundHistoryItem } from "@/lib/whiteboard/server/history";

const TAB_LABELS: Record<ClassHubTab, string> = {
  teach: "Teach",
  lesson: "Plan Lesson",
  stream: "Stream",
  schedule: "Schedule",
  students: "Students & Homework",
  settings: "Settings",
};

export type TeacherClassHubClientProps = {
  classId: string;
  title: string;
  joinCode: string;
  archived: boolean;
  teacherTier: TeacherTier;
  studentCount: number;
  pendingSentenceTotal: number;
  activeSession: {
    sessionId: string;
    joinCode: string;
    classLessonId?: string | null;
  } | null;
  roster: ClassRosterStudent[];
  masteryByStudentId: Record<string, TeacherClassStudentMasteryPreview>;
  pendingSentencesByStudentId: Record<string, number>;
  wordPacks: TeacherWordPackSummary[];
  liveGameProject: LiveGameClassProjectOverview;
  whiteboardHistory: WhiteboardRoundHistoryItem[];
  vcSessionHistory: VirtualClassroomSessionHistoryItem[];
  lessons: ClassLesson[];
  studioActivities: StudioActivityOption[];
  vocabularyLists: ClassVocabularyListSummary[];
  liveGameSets: LiveGameQuestionSetOption[];
  homework: ClassHomework[];
  homeworkCompletions: HomeworkCompletionSummary[];
  classPosts: ClassPost[];
  meetingSlots: ClassMeetingSlot[];
  scheduleGroupingBoard: ClassScheduleGroupingBoard;
  packQuizzes: Array<{
    id: string;
    title: string;
    questionCount: number;
    packId: string | null;
  }>;
  packFlashcardSets: Array<{
    id: string;
    title: string;
    cardCount: number;
    packId: string | null;
  }>;
  spaceItems: TeacherSpaceItemSummary[];
  studentTabSettings: StudentClassroomTabSettings;
  classKind: "regular" | "trial";
};

export function TeacherClassHubClient({
  classId,
  title,
  joinCode,
  archived,
  teacherTier,
  studentCount,
  pendingSentenceTotal,
  activeSession,
  roster,
  masteryByStudentId,
  pendingSentencesByStudentId,
  wordPacks,
  liveGameProject,
  whiteboardHistory,
  vcSessionHistory,
  lessons,
  studioActivities,
  vocabularyLists,
  liveGameSets,
  homework,
  homeworkCompletions,
  classPosts,
  meetingSlots,
  scheduleGroupingBoard,
  packQuizzes,
  packFlashcardSets,
  spaceItems,
  studentTabSettings,
  classKind,
}: TeacherClassHubClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabs = classHubTabsForTier(teacherTier);
  const isLight = teacherTier === "light";
  const activeTab = parseClassHubTab(searchParams.get("tab"), teacherTier);
  const lessonId = searchParams.get("lessonId");

  const setTab = (tab: ClassHubTab) => {
    router.replace(classHubTabHref(classId, tab, teacherTier), { scroll: false });
  };
  const [historyOpen, setHistoryOpen] = useState(false);
  const closeHistory = useCallback(() => setHistoryOpen(false), []);
  const [codeCopied, setCodeCopied] = useState(false);
  const copyResetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current != null) window.clearTimeout(copyResetTimer.current);
    };
  }, []);

  const copyJoinLink = useCallback(async () => {
    const origin = window.location.origin;
    const link = `${origin}/join-class?code=${encodeURIComponent(joinCode)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCodeCopied(true);
      if (copyResetTimer.current != null) window.clearTimeout(copyResetTimer.current);
      copyResetTimer.current = window.setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Fallback: leave badge as-is if clipboard is blocked.
    }
  }, [joinCode]);

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          href="/teacher/classes"
          className="shrink-0 text-sm font-medium text-blue-700 underline underline-offset-2"
        >
          ← Classes
        </Link>
        <span className="hidden h-4 w-px shrink-0 bg-neutral-200 sm:block" aria-hidden />
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
          <span className="rounded-full border border-neutral-300 bg-neutral-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-neutral-700">
            {classKind === "trial" ? "Trial" : "Regular"}
          </span>
          <button
            type="button"
            onClick={() => void copyJoinLink()}
            title="Copy join link"
            aria-label={
              codeCopied
                ? "Join link copied"
                : `Copy join link for class code ${joinCode}`
            }
            className={`rounded-full border px-2.5 py-0.5 font-mono text-xs font-bold tracking-widest transition ${
              codeCopied
                ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                : "border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100"
            }`}
          >
            {codeCopied ? "Copied!" : joinCode}
          </button>
        </div>
        <p className="min-w-0 text-sm text-neutral-600">
          <span className="hidden text-neutral-300 sm:inline" aria-hidden>
            ·{" "}
          </span>
          {studentCount} student{studentCount === 1 ? "" : "s"}
          {archived ? " · Archived" : ""}
          {!isLight && pendingSentenceTotal > 0 ? (
            <>
              {" "}
              ·{" "}
              <button
                type="button"
                onClick={() => setTab("students")}
                className="font-medium text-amber-800 underline decoration-amber-300 underline-offset-2"
              >
                {pendingSentenceTotal} sentence{pendingSentenceTotal === 1 ? "" : "s"} waiting for
                review
              </button>
            </>
          ) : null}
          {!isLight && activeSession ? (
            <>
              {" "}
              ·{" "}
              <Link
                href={`/teacher/virtual-classroom/${activeSession.sessionId}`}
                className="font-medium text-teal-800 underline-offset-2 hover:underline"
              >
                Classroom live
              </Link>
            </>
          ) : null}
        </p>
        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="rounded border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            History
          </button>
          <ArchiveClassButton classId={classId} archived={archived} />
        </div>
      </div>

      <ClassHubHistoryOverlay
        classId={classId}
        archived={archived}
        liveGameProject={liveGameProject}
        whiteboardHistory={whiteboardHistory}
        vcSessionHistory={vcSessionHistory}
        open={historyOpen}
        onClose={closeHistory}
      />

      {tabs.length > 1 ? (
        <nav
          className="mx-auto flex w-fit max-w-full flex-wrap justify-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1"
          aria-label="Class sections"
        >
          {tabs.map((tab) => {
            const selected = activeTab === tab;
            return (
              <Link
                key={tab}
                href={classHubTabHref(classId, tab, teacherTier)}
                scroll={false}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                  selected
                    ? "bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200"
                    : "text-neutral-600 hover:bg-white/70 hover:text-neutral-900"
                }`}
                aria-current={selected ? "page" : undefined}
              >
                {TAB_LABELS[tab]}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {activeTab === "teach" ? (
        <TeachTab
          classId={classId}
          archived={archived}
          activeSession={activeSession}
          readyLessons={lessons.filter((lesson) => lesson.status === "ready")}
        />
      ) : null}

      {activeTab === "lesson" ? (
        <CreateLessonTab
          classId={classId}
          archived={archived}
          lessons={lessons}
          studioActivities={studioActivities}
          liveGameSets={liveGameSets}
          vocabularyLists={vocabularyLists}
          initialLessonId={lessonId}
        />
      ) : null}

      {activeTab === "stream" ? (
        <ClassStreamTab
          classId={classId}
          archived={archived}
          classPosts={classPosts}
          homework={homework}
          spaceItems={spaceItems}
        />
      ) : null}

      {activeTab === "schedule" ? (
        <ClassScheduleTab
          classId={classId}
          archived={archived}
          roster={roster}
          meetingSlots={meetingSlots}
          scheduleGroupingBoard={scheduleGroupingBoard}
        />
      ) : null}

      {activeTab === "students" ? (
        <StudentsHomeworkTab
          classId={classId}
          archived={archived}
          teacherTier={teacherTier}
          roster={roster}
          masteryByStudentId={masteryByStudentId}
          pendingSentencesByStudentId={pendingSentencesByStudentId}
          pendingSentenceTotal={pendingSentenceTotal}
          wordPacks={wordPacks}
          homework={homework}
          homeworkCompletions={homeworkCompletions}
          packQuizzes={packQuizzes}
          packFlashcardSets={packFlashcardSets}
        />
      ) : null}

      {activeTab === "settings" ? (
        <ClassSettingsTab
          classId={classId}
          archived={archived}
          initialSettings={studentTabSettings}
        />
      ) : null}
    </div>
  );
}
