import { notFound } from "next/navigation";
import { saveLessonSkills } from "@/lib/actions/teacher";
import {
  getLesson,
  getLessonSkills,
  getModule,
  getScreens,
} from "@/lib/data/teacher";
import { RegisterTeacherEditorHeader } from "@/components/teacher/TeacherEditorHeaderContext";
import { AiLessonPanel } from "./AiLessonPanel";
import { LessonEditorWorkspace } from "@/components/teacher/lesson-editor/LessonEditorWorkspace";

type Props = {
  params: Promise<{ id: string; lessonId: string }>;
};

export default async function EditLessonPage({ params }: Props) {
  const { id: moduleId, lessonId } = await params;
  let lesson;
  let mod;
  try {
    mod = await getModule(moduleId);
    lesson = await getLesson(lessonId);
  } catch {
    notFound();
  }
  if (lesson.module_id !== moduleId) notFound();

  const screens = await getScreens(lessonId);
  const skillKeys = await getLessonSkills(lessonId);

  return (
    <>
      <RegisterTeacherEditorHeader
        title={lesson.title}
        published={lesson.published === true}
      />
      <LessonEditorWorkspace
        moduleId={moduleId}
        lessonId={lessonId}
        moduleSlug={mod.slug}
        lessonSlug={lesson.slug}
        lessonTitle={lesson.title}
        lessonOrderIndex={lesson.order_index ?? 0}
        lessonEstimatedMinutes={
          lesson.estimated_minutes === null || lesson.estimated_minutes === undefined ?
            null
          : Number(lesson.estimated_minutes)
        }
        published={lesson.published === true}
        screens={screens}
      >
        <AiLessonPanel
          moduleId={moduleId}
          lessonId={lessonId}
          lessonTitle={lesson.title}
          sidebar
        />

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
