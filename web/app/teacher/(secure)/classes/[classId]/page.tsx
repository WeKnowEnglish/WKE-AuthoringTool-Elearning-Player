import type { ClassVocabularyListSummary } from "@/components/teacher/class-hub/ClassVocabularyListsPanel";
import { TeacherClassHubClient } from "@/components/teacher/class-hub/TeacherClassHubClient";
import { listAssignableActivitiesForClass } from "@/lib/assignable-activities/registry";
import { getTeacherTier } from "@/lib/auth/roles";
import { listActivityTrackDraftsForTeacher } from "@/lib/activity-tracks/draft-server";
import type { LiveGameQuestionSetOption } from "@/lib/class-lessons/types";
import {
  listClassHomeworkCompletionsForClass,
  listClassHomeworkForClass,
} from "@/lib/data/class-homework";
import { listClassPostsForClass } from "@/lib/data/class-posts";
import { listMeetingSlotsForClass } from "@/lib/data/class-meeting-slots";
import { getClassScheduleGroupingBoard } from "@/lib/data/class-schedule-preferences";
import { listClassLessonsWithStepsForClass } from "@/lib/data/class-lessons";
import { listMyStudioActivities } from "@/lib/data/studio-activities";
import { getLiveGameClassProjectOverview } from "@/lib/data/live-game-class-projects";
import { getClassMasteryOverview } from "@/lib/data/teacher-mastery";
import { getClassRoster, getTeacherClass } from "@/lib/data/teacher-classes";
import { listTeacherWordPacksForClass } from "@/lib/data/teacher-word-packs";
import { getPendingSentenceCountsForClass } from "@/lib/data/teacher-sentence-submissions";
import { listMyTeacherSpaceItems } from "@/lib/data/teacher-space";
import { getTrialStudentDiscoveryForClass } from "@/lib/data/trial-availability";
import { listPublishedQuestionSetsForHost } from "@/lib/live-game/server/question-set-list";
import { playPathForStudioActivity } from "@/lib/studio-activities/paths";
import { createClient } from "@/lib/supabase/server";
import { getActiveVirtualClassroomForClass } from "@/lib/virtual-classroom/server/session";
import { listVirtualClassroomSessionHistoryForClass } from "@/lib/virtual-classroom/server/session-history";
import { listClassWhiteboardHistory } from "@/lib/whiteboard/server/history";
import { Suspense } from "react";
import { notFound } from "next/navigation";

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
    vcSessionHistory,
    wordPacks,
    lessons,
    studioActivities,
    trackDrafts,
    liveGameSetsRaw,
    homework,
    activityCards,
    homeworkCompletions,
    classPosts,
    meetingSlots,
    scheduleGroupingBoard,
    spaceItems,
    trialDiscovery,
  ] = await Promise.all([
    getClassRoster(classId),
    getClassMasteryOverview(classId),
    getPendingSentenceCountsForClass(classId),
    getLiveGameClassProjectOverview(classId),
    listClassWhiteboardHistory(classId),
    getActiveVirtualClassroomForClass(classId),
    listVirtualClassroomSessionHistoryForClass(classId).catch(() => []),
    listTeacherWordPacksForClass(classId),
    listClassLessonsWithStepsForClass(classId),
    listMyStudioActivities(),
    user?.id ? listActivityTrackDraftsForTeacher(user.id).catch(() => []) : Promise.resolve([]),
    listPublishedQuestionSetsForHost(),
    listClassHomeworkForClass(classId),
    listAssignableActivitiesForClass(classId),
    listClassHomeworkCompletionsForClass(classId).catch(() => []),
    listClassPostsForClass(classId).catch(() => []),
    listMeetingSlotsForClass(classId).catch(() => []),
    getClassScheduleGroupingBoard(classId).catch(() => ({
      preferenceCollectionOpen: false,
      windows: [],
      preferences: [],
      firstChoiceCounts: {},
    })),
    listMyTeacherSpaceItems(),
    teacherClass.class_kind === "trial"
      ? getTrialStudentDiscoveryForClass(classId)
      : Promise.resolve(null),
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

  const studioActivityOptions = studioActivities.map((activity) => ({
    id: activity.id,
    title: activity.title,
    format: activity.format,
    playPath: activity.playPath,
  }));

  const homeworkTrackDrafts = trackDrafts
    .filter((track) => track.mode !== "practice" || Boolean(track.bankActivityId))
    .map((track) => ({
      id: track.id,
      title: track.title,
      mode: track.mode,
      level: track.level,
    }));

  const vocabularyLists: ClassVocabularyListSummary[] = studioActivities
    .filter((activity) => activity.format === "vocabulary_list")
    .map((activity) => {
      const entryCount = activity.source?.entryCount;
      return {
        id: activity.id,
        title: activity.title,
        entryCount: typeof entryCount === "number" ? entryCount : null,
        href:
          activity.playPath ||
          playPathForStudioActivity("vocabulary_list", activity.id),
      };
    });

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
        vcSessionHistory={vcSessionHistory}
        lessons={lessons}
        studioActivities={studioActivityOptions}
        homeworkTrackDrafts={homeworkTrackDrafts}
        vocabularyLists={vocabularyLists}
        liveGameSets={liveGameSets}
        homework={homework}
        homeworkCompletions={homeworkCompletions}
        classPosts={classPosts}
        meetingSlots={meetingSlots}
        scheduleGroupingBoard={scheduleGroupingBoard}
        packQuizzes={packQuizzes}
        packFlashcardSets={packFlashcardSets}
        spaceItems={spaceItems}
        studentTabSettings={{
          schedule: teacherClass.student_tab_schedule_enabled,
          noticeboard: teacherClass.student_tab_noticeboard_enabled,
          materials: teacherClass.student_tab_materials_enabled,
        }}
        classKind={teacherClass.class_kind}
        trialDiscovery={trialDiscovery}
      />
    </Suspense>
  );
}
