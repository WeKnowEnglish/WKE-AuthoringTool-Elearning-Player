import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TeacherClassHubClient } from "@/components/teacher/class-hub/TeacherClassHubClient";
import { listAssignableActivitiesForClass } from "@/lib/assignable-activities/registry";
import { getTeacherTier } from "@/lib/auth/roles";
import type { LiveGameQuestionSetOption } from "@/lib/class-lessons/types";
import {
  listClassHomeworkCompletionsForClass,
  listClassHomeworkForClass,
} from "@/lib/data/class-homework";
import { listClassLessonsWithStepsForClass } from "@/lib/data/class-lessons";
import { getLiveGameClassProjectOverview } from "@/lib/data/live-game-class-projects";
import { getClassMasteryOverview } from "@/lib/data/teacher-mastery";
import { getClassRoster, getTeacherClass } from "@/lib/data/teacher-classes";
import { listTeacherWordPacksForClass } from "@/lib/data/teacher-word-packs";
import { getPendingSentenceCountsForClass } from "@/lib/data/teacher-sentence-submissions";
import { listPublishedQuestionSetsForHost } from "@/lib/live-game/server/question-set-list";
import { createClient } from "@/lib/supabase/server";
import { getActiveVirtualClassroomForClass } from "@/lib/virtual-classroom/server/session";
import { listClassWhiteboardHistory } from "@/lib/whiteboard/server/history";

type Props = {
  params: Promise<{ classId: string }>;
};

export default async function TeacherClassDetailPage({ params }: Props) {
  const { classId } = await params;
  const teacherClass = await getTeacherClass(classId);
  if (!teacherClass) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const teacherTier = getTeacherTier(user) ?? "plus";

  const [
    roster,
    masteryOverview,
    pendingSentences,
    liveGameProject,
    whiteboardHistory,
    activeVc,
    wordPacks,
    lessons,
    liveGameSetsRaw,
    homework,
    activityCards,
    homeworkCompletions,
  ] = await Promise.all([
    getClassRoster(classId),
    getClassMasteryOverview(classId),
    getPendingSentenceCountsForClass(classId),
    getLiveGameClassProjectOverview(classId),
    listClassWhiteboardHistory(classId),
    getActiveVirtualClassroomForClass(classId),
    listTeacherWordPacksForClass(classId),
    listClassLessonsWithStepsForClass(classId),
    listPublishedQuestionSetsForHost(),
    listClassHomeworkForClass(classId),
    listAssignableActivitiesForClass(classId),
    listClassHomeworkCompletionsForClass(classId).catch(() => []),
  ]);

  const packQuizzes = activityCards
    .filter((card) => card.kind === "pack_mc_quiz")
    .map((card) => ({
      id: card.artifactId,
      title: card.title,
      questionCount: card.questionCount ?? 0,
      packId: card.packId ?? null,
    }));

  const packFlashcardSets = activityCards
    .filter((card) => card.kind === "pack_flashcards")
    .map((card) => ({
      id: card.artifactId,
      title: card.title,
      cardCount: card.questionCount ?? 0,
      packId: card.packId ?? null,
    }));

  const masteryByStudentId = Object.fromEntries(
    masteryOverview.students.map((preview) => [preview.studentId, preview]),
  );

  const liveGameSets: LiveGameQuestionSetOption[] = liveGameSetsRaw.map((set) => ({
    id: set.id,
    slug: set.slug,
    title: set.title,
    level: set.level,
    topic: set.topic,
    questionCount: set.questionCount,
  }));

  const archived = Boolean(teacherClass.archived_at);

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-8 w-40 animate-pulse rounded bg-neutral-200" />
          <div className="h-10 w-full max-w-md animate-pulse rounded bg-neutral-100" />
          <div className="h-40 w-full animate-pulse rounded-xl bg-neutral-100" />
        </div>
      }
    >
      <TeacherClassHubClient
        classId={classId}
        title={teacherClass.title}
        joinCode={teacherClass.join_code}
        archived={archived}
        teacherTier={teacherTier}
        studentCount={roster.length}
        pendingSentenceTotal={pendingSentences.total}
        activeSession={
          activeVc
            ? {
                sessionId: activeVc.id,
                joinCode: activeVc.joinCode,
                classLessonId: activeVc.classLessonId,
              }
            : null
        }
        roster={roster}
        masteryByStudentId={masteryByStudentId}
        pendingSentencesByStudentId={pendingSentences.byStudentId}
        wordPacks={wordPacks}
        liveGameProject={liveGameProject}
        whiteboardHistory={whiteboardHistory}
        lessons={lessons}
        liveGameSets={liveGameSets}
        homework={homework}
        homeworkCompletions={homeworkCompletions}
        packQuizzes={packQuizzes}
        packFlashcardSets={packFlashcardSets}
      />
    </Suspense>
  );
}
