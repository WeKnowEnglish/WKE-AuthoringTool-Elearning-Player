"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArchiveClassButton } from "@/components/teacher/ArchiveClassButton";
import { CreateLessonTab } from "@/components/teacher/class-hub/CreateLessonTab";
import { StudentsHomeworkTab } from "@/components/teacher/class-hub/StudentsHomeworkTab";
import { TeachTab } from "@/components/teacher/class-hub/TeachTab";
import type { TeacherTier } from "@/lib/auth/roles";
import type { ClassHomework, HomeworkCompletionSummary } from "@/lib/class-homework/types";
import type { ClassLesson, LiveGameQuestionSetOption } from "@/lib/class-lessons/types";
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
import type { WhiteboardRoundHistoryItem } from "@/lib/whiteboard/server/history";

const TAB_LABELS: Record<ClassHubTab, string> = {
  teach: "Teach",
  lesson: "Create Lesson",
  students: "Students & Homework",
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
  lessons: ClassLesson[];
  liveGameSets: LiveGameQuestionSetOption[];
  homework: ClassHomework[];
  homeworkCompletions: HomeworkCompletionSummary[];
  packQuizzes: Array<{
    id: string;
    title: string;
    questionCount: number;
    packId: string | null;
  }>;
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
  lessons,
  liveGameSets,
  homework,
  homeworkCompletions,
  packQuizzes,
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

  return (
    <div className="space-y-5">
      <Link href="/teacher/classes" className="text-sm text-blue-700 underline">
        ← Classes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
          <p className="mt-1 text-sm text-neutral-600">
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
                  {pendingSentenceTotal} sentence{pendingSentenceTotal === 1 ? "" : "s"} waiting
                  for review
                </button>
              </>
            ) : null}
            {!isLight && activeSession ? (
              <>
                {" "}
                ·{" "}
                <span className="font-medium text-teal-800">Classroom live</span>
              </>
            ) : null}
          </p>
        </div>
        <ArchiveClassButton classId={classId} archived={archived} />
      </div>

      {tabs.length > 1 ? (
        <nav
          className="flex flex-wrap gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 p-1.5"
          aria-label="Class sections"
        >
          {tabs.map((tab) => {
            const selected = activeTab === tab;
            return (
              <Link
                key={tab}
                href={classHubTabHref(classId, tab, teacherTier)}
                scroll={false}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
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
          liveGameProject={liveGameProject}
          whiteboardHistory={whiteboardHistory}
        />
      ) : null}

      {activeTab === "lesson" ? (
        <CreateLessonTab
          classId={classId}
          archived={archived}
          lessons={lessons}
          liveGameSets={liveGameSets}
          initialLessonId={lessonId}
        />
      ) : null}

      {activeTab === "students" ? (
        <StudentsHomeworkTab
          classId={classId}
          joinCode={joinCode}
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
        />
      ) : null}
    </div>
  );
}
