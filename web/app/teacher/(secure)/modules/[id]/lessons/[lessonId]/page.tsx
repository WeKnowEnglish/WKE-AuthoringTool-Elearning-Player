import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteLesson, saveLesson, saveLessonSkills } from "@/lib/actions/teacher";
import {
  getLesson,
  getLessonSkills,
  getModule,
  getScreens,
} from "@/lib/data/teacher";
import { AiLessonPanel } from "./AiLessonPanel";
import { LessonEditorWorkspace } from "@/components/teacher/lesson-editor/LessonEditorWorkspace";
import { ConfirmSubmitButton } from "@/components/teacher/ConfirmSubmitButton";

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
    <div className="space-y-6">
      <Link
        href={`/teacher/modules/${moduleId}`}
        className="inline-block text-sm text-blue-700 underline"
      >
        ← Module
      </Link>

      <header className="space-y-1 border-b border-neutral-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl">
          {lesson.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-base text-neutral-600">
          <span className="font-mono text-sm text-neutral-700">/{lesson.slug}</span>
          <span className="text-neutral-300">·</span>
          {lesson.published ? (
            <span className="font-medium text-green-800">Published</span>
          ) : (
            <span className="font-medium text-amber-800">Draft</span>
          )}
          <span className="text-neutral-300">·</span>
          <form action={saveLesson}>
            <input type="hidden" name="id" value={lessonId} />
            <input type="hidden" name="module_id" value={moduleId} />
            <input type="hidden" name="title" value={lesson.title} />
            <input type="hidden" name="slug" value={lesson.slug} />
            <input type="hidden" name="order_index" value={String(lesson.order_index ?? 0)} />
            <input
              type="hidden"
              name="estimated_minutes"
              value={
                lesson.estimated_minutes === null || lesson.estimated_minutes === undefined ?
                  ""
                : String(lesson.estimated_minutes)
              }
            />
            <input
              type="hidden"
              name="published"
              value={lesson.published ? "" : "on"}
            />
            <button
              type="submit"
              className={
                lesson.published ?
                  "rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 active:bg-amber-200"
                : "rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 active:bg-emerald-200"
              }
            >
              {lesson.published ? "Unpublish lesson" : "Publish lesson"}
            </button>
          </form>
          <span className="text-neutral-300">·</span>
          <form action={deleteLesson.bind(null, lessonId, moduleId)}>
            <ConfirmSubmitButton
              type="submit"
              confirmMessage={`Delete lesson "${lesson.title}"? This cannot be undone.`}
              className="rounded border border-red-300 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 active:bg-red-200"
            >
              Delete lesson
            </ConfirmSubmitButton>
          </form>
        </div>
      </header>

      <LessonEditorWorkspace
        moduleId={moduleId}
        lessonId={lessonId}
        moduleSlug={mod.slug}
        lessonSlug={lesson.slug}
        lessonTitle={lesson.title}
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
    </div>
  );
}
