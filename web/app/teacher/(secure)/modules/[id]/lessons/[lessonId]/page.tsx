import { notFound } from "next/navigation";
import { ensureLessonBookendsForEditor, saveLessonSkills } from "@/lib/actions/teacher";
import { findOpeningStartScreen } from "@/lib/lesson-bookends";
import { parseLearningGoalsFromDb } from "@/lib/learning-goals";
import { parseActivityLibraryIdFromLessonSlug } from "@/lib/activity-library-mirror";
import {
  getActivityLibraryItem,
  getLesson,
  getLessonsForModule,
  getLessonSkills,
  getModule,
  getScreens,
} from "@/lib/data/teacher";
import { completionPlaygroundSchema } from "@/lib/lesson-schemas";
import { CompletionPlaygroundForm } from "@/components/teacher/lesson-editor/CompletionPlaygroundForm";
import { RegisterTeacherEditorHeader } from "@/components/teacher/TeacherEditorHeaderContext";
import { AiLessonPanel } from "./AiLessonPanel";
import { LessonEditorWorkspace } from "@/components/teacher/lesson-editor/LessonEditorWorkspace";

type Props = {
  params: Promise<{ id: string; lessonId: string }>;
};

export default async function EditLessonPage({ params }: Props) {
  const { id: moduleId, lessonId } = await params;
  const modPromise = getModule(moduleId);
  const lessonPromise = getLesson(lessonId);
  let lesson;
  let mod;
  try {
    [mod, lesson] = await Promise.all([modPromise, lessonPromise]);
  } catch {
    notFound();
  }
  if (lesson.module_id !== moduleId) notFound();

  await ensureLessonBookendsForEditor(lessonId, moduleId);
  const [screens, moduleLessons, skillKeys] = await Promise.all([
    getScreens(lessonId),
    getLessonsForModule(moduleId),
    getLessonSkills(lessonId),
  ]);
  const learningGoals = parseLearningGoalsFromDb(
    (lesson as { learning_goals?: unknown }).learning_goals,
  );
  const hasOpeningStart = Boolean(findOpeningStartScreen(screens));
  /** Bumps when the lesson row changes so the client refetches `lesson_plan` (not sent in RSC). */
  const lessonPlanSyncKey = `${(lesson as { updated_at?: string | null }).updated_at ?? ""}:${lessonId}`;

  const activityLibraryMirrorId = parseActivityLibraryIdFromLessonSlug(lesson.slug);
  const activityLibraryPublished: boolean | null =
    !activityLibraryMirrorId ? null
    : await (async () => {
        try {
          const row = await getActivityLibraryItem(activityLibraryMirrorId);
          return row.published === true;
        } catch {
          return false;
        }
      })();

  const headerPublished =
    activityLibraryMirrorId ? activityLibraryPublished === true : lesson.published === true;

  const rawCompletion = (lesson as { completion_playground?: unknown }).completion_playground;
  const completionPg = completionPlaygroundSchema.safeParse(rawCompletion);
  const completionPlayground = completionPg.success ? completionPg.data : null;
  const lessonUpdatedAt = (lesson as { updated_at?: string | null }).updated_at ?? "";

  return (
    <>
      <RegisterTeacherEditorHeader title={lesson.title} published={headerPublished} />
      <LessonEditorWorkspace
        moduleId={moduleId}
        lessonId={lessonId}
        moduleSlug={mod.slug}
        moduleTitle={mod.title}
        lessonSlug={lesson.slug}
        currentLessonId={lessonId}
        moduleLessons={moduleLessons.map((item) => ({
          id: item.id,
          title: item.title,
          order_index: Number(item.order_index ?? 0),
        }))}
        lessonTitle={lesson.title}
        lessonOrderIndex={lesson.order_index ?? 0}
        lessonEstimatedMinutes={
          lesson.estimated_minutes === null || lesson.estimated_minutes === undefined ?
            null
          : Number(lesson.estimated_minutes)
        }
        published={lesson.published === true}
        activityLibraryMirrorId={activityLibraryMirrorId}
        activityLibraryPublished={activityLibraryPublished}
        screens={screens}
        lessonPlanSyncKey={lessonPlanSyncKey}
        learningGoals={learningGoals}
        hasOpeningStart={hasOpeningStart}
        completionPlayground={completionPlayground}
      >
        <AiLessonPanel sidebar />

        <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Completion playground</h2>
          <p className="mt-1 text-xs text-neutral-600">
            Optional layer on the reward screen after the lesson (same shape as the opening
            playground: background, tap-friendly items, optional tiny prizes). Remove the playground
            to hide it.
          </p>
          <CompletionPlaygroundForm
            key={`${lessonId}:${lessonUpdatedAt}`}
            lessonId={lessonId}
            moduleId={moduleId}
            initialPlayground={completionPlayground}
          />
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Skill tags</h2>
          <p className="mt-1 text-xs text-neutral-600">
            Comma-separated keys (e.g. vocabulary, listening).
          </p>
          <form
            action={saveLessonSkills.bind(null, lessonId, moduleId)}
            className="mt-3 flex flex-col gap-2 sm:flex-row"
          >
            <input
              name="skills_raw"
              defaultValue={skillKeys.join(", ")}
              className="min-w-0 flex-1 rounded border px-3 py-2 text-sm"
              placeholder="vocabulary, listening"
            />
            <button
              type="submit"
              className="shrink-0 rounded bg-neutral-800 px-3 py-2 text-sm font-semibold text-white active:bg-neutral-900"
            >
              Save skills
            </button>
          </form>
        </section>
      </LessonEditorWorkspace>
    </>
  );
}
