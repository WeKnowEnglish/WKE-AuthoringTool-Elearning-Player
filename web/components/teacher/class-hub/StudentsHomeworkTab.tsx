import { ClassRosterTable } from "@/components/teacher/ClassRosterTable";
import {
  ClassHomeworkPanel,
  type HomeworkTrackDraftOption,
} from "@/components/teacher/class-hub/ClassHomeworkPanel";
import type { TeacherTier } from "@/lib/auth/roles";
import type { ClassHomework, HomeworkCompletionSummary } from "@/lib/class-homework/types";
import type { StudioActivityOption } from "@/lib/class-lessons/types";
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
  archived: boolean;
  teacherTier: TeacherTier;
  roster: ClassRosterStudent[];
  masteryByStudentId: Record<string, TeacherClassStudentMasteryPreview>;
  pendingSentencesByStudentId: Record<string, number>;
  pendingSentenceTotal: number;
  wordPacks: TeacherWordPackSummary[];
  homework: ClassHomework[];
  packQuizzes: QuizOption[];
  packFlashcardSets: FlashcardSetOption[];
  studioActivities: StudioActivityOption[];
  homeworkTrackDrafts: HomeworkTrackDraftOption[];
  homeworkCompletions: HomeworkCompletionSummary[];
};

export function StudentsHomeworkTab({
  classId,
  archived,
  teacherTier,
  roster,
  masteryByStudentId,
  pendingSentencesByStudentId,
  pendingSentenceTotal,
  wordPacks,
  homework,
  packQuizzes,
  packFlashcardSets,
  studioActivities,
  homeworkTrackDrafts,
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
            ? "Review mastery at a glance and assign quizzes, flashcards, or practice."
            : "Review the roster and assign offline work."}
        </p>
      </section>

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

      <ClassHomeworkPanel
        classId={classId}
        archived={archived}
        teacherTier={teacherTier}
        homework={homework}
        wordPacks={wordPacks}
        packQuizzes={packQuizzes}
        packFlashcardSets={packFlashcardSets}
        studioActivities={studioActivities}
        homeworkTrackDrafts={homeworkTrackDrafts}
        rosterSize={roster.length}
        rosterNames={roster.map((student) => ({
          studentId: student.studentId,
          displayName: student.displayName || student.username,
        }))}
        completions={homeworkCompletions}
      />
    </div>
  );
}
