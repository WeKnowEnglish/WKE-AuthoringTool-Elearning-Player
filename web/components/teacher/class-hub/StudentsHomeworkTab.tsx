import { ClassJoinCodePanel } from "@/components/teacher/ClassJoinCodePanel";
import { ClassRosterTable } from "@/components/teacher/ClassRosterTable";
import { SentenceStripClassPanel } from "@/components/teacher/SentenceStripClassPanel";
import { ClassHomeworkPanel } from "@/components/teacher/class-hub/ClassHomeworkPanel";
import { ClassPostsPanel } from "@/components/teacher/class-hub/ClassPostsPanel";
import { ClassMeetingSchedulePanel } from "@/components/teacher/class-hub/ClassMeetingSchedulePanel";
import { ClassWordPacksPanel } from "@/components/teacher/word-packs/ClassWordPacksPanel";
import type { TeacherTier } from "@/lib/auth/roles";
import type { ClassHomework, HomeworkCompletionSummary } from "@/lib/class-homework/types";
import type { ClassMeetingSlot } from "@/lib/class-schedule/types";
import type { ClassPost } from "@/lib/class-posts/types";
import type { ClassRosterStudent } from "@/lib/data/teacher-classes";
import type { TeacherWordPackSummary } from "@/lib/data/teacher-word-packs";
import type { TeacherClassStudentMasteryPreview } from "@/lib/mastery/teacher-mastery-summary";

type QuizOption = {
  id: string;
  title: string;
  questionCount: number;
  packId: string | null;
};

type FlashcardSetOption = {
  id: string;
  title: string;
  cardCount: number;
  packId: string | null;
};

type Props = {
  classId: string;
  joinCode: string;
  archived: boolean;
  teacherTier: TeacherTier;
  roster: ClassRosterStudent[];
  masteryByStudentId: Record<string, TeacherClassStudentMasteryPreview>;
  pendingSentencesByStudentId: Record<string, number>;
  pendingSentenceTotal: number;
  wordPacks: TeacherWordPackSummary[];
  homework: ClassHomework[];
  classPosts: ClassPost[];
  meetingSlots: ClassMeetingSlot[];
  packQuizzes: QuizOption[];
  packFlashcardSets: FlashcardSetOption[];
  homeworkCompletions: HomeworkCompletionSummary[];
};

export function StudentsHomeworkTab({
  classId,
  joinCode,
  archived,
  teacherTier,
  roster,
  masteryByStudentId,
  pendingSentencesByStudentId,
  pendingSentenceTotal,
  wordPacks,
  homework,
  classPosts,
  meetingSlots,
  packQuizzes,
  packFlashcardSets,
  homeworkCompletions,
}: Props) {
  const isLight = teacherTier === "light";

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-neutral-200 bg-white px-4 py-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Students &amp; homework
        </p>
        <h2 className="mt-1 text-xl font-bold text-neutral-900">
          {isLight ? "Assign and track" : "Manage the class"}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          {isLight
            ? "Share the join code, review mastery at a glance, attach word packs, and assign quizzes, flashcards, or practice."
            : "Share the join code, review the roster, manage word packs, and assign offline work."}
        </p>
      </section>

      <ClassJoinCodePanel classId={classId} joinCode={joinCode} archived={archived} />

      <ClassPostsPanel classId={classId} archived={archived} initialPosts={classPosts} />

      <ClassMeetingSchedulePanel
        classId={classId}
        archived={archived}
        initialSlots={meetingSlots}
      />

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold text-neutral-900">Roster</h3>
          {!isLight && pendingSentenceTotal > 0 ? (
            <p className="text-sm font-medium text-amber-800">
              {pendingSentenceTotal} sentence{pendingSentenceTotal === 1 ? "" : "s"} waiting for
              review
            </p>
          ) : null}
        </div>
        <ClassRosterTable
          classId={classId}
          students={roster}
          masteryByStudentId={masteryByStudentId}
          pendingSentencesByStudentId={isLight ? {} : pendingSentencesByStudentId}
        />
      </section>

      <ClassWordPacksPanel classId={classId} archived={archived} packs={wordPacks} />

      <ClassHomeworkPanel
        classId={classId}
        archived={archived}
        teacherTier={teacherTier}
        homework={homework}
        wordPacks={wordPacks}
        packQuizzes={packQuizzes}
        packFlashcardSets={packFlashcardSets}
        rosterSize={roster.length}
        rosterNames={roster.map((student) => ({
          studentId: student.studentId,
          displayName: student.displayName || student.username,
        }))}
        completions={homeworkCompletions}
      />

      {!isLight ? (
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-neutral-900">Production &amp; review tools</h3>
          <SentenceStripClassPanel classId={classId} archived={archived} />
        </section>
      ) : null}
    </div>
  );
}
