import Link from "next/link";
import { notFound } from "next/navigation";
import { saveLesson } from "@/lib/actions/teacher";
import { TitleSlugFields } from "@/components/teacher/TitleSlugFields";
import {
  getLessonsForModule,
  getModule,
} from "@/lib/data/teacher";

type Props = { params: Promise<{ id: string }> };

export default async function NewLessonPage({ params }: Props) {
  const { id: moduleId } = await params;
  const modPromise = getModule(moduleId);
  const lessonsPromise = getLessonsForModule(moduleId);
  let mod;
  try {
    mod = await modPromise;
  } catch {
    notFound();
  }

  const lessons = await lessonsPromise;
  const nextOrder =
    lessons.length > 0 ? Math.max(...lessons.map((l) => l.order_index ?? 0)) + 1 : 0;
  const lastLesson =
    lessons.length > 0
      ? lessons.reduce((a, b) => (a.order_index > b.order_index ? a : b))
      : null;

  return (
    <div className="space-y-6">
      <Link
        href={`/teacher/modules/${moduleId}`}
        className="text-sm text-blue-700 underline"
      >
        ← {mod.title}
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Create next lesson</h1>
        <p className="mt-1 text-sm text-neutral-600">
          In module <strong>{mod.title}</strong>. Students can open lessons in any
          order once the module is unlocked. Default order is{" "}
          <strong>{nextOrder}</strong>
          {lastLesson ? (
            <>
              {" "}
              (after <em>{lastLesson.title}</em>).
            </>
          ) : (
            " (first lesson in this module)."
          )}
        </p>
      </div>
      <form
        action={saveLesson}
        className="mx-auto max-w-md space-y-4 rounded border bg-white p-6"
      >
        <input type="hidden" name="module_id" value={moduleId} />
        <TitleSlugFields />
        <div>
          <label className="block text-sm font-medium" htmlFor="order_index">
            Order
          </label>
          <input
            id="order_index"
            name="order_index"
            type="number"
            defaultValue={nextOrder}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="estimated_minutes">
            Est. minutes
          </label>
          <input
            id="estimated_minutes"
            name="estimated_minutes"
            type="number"
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="published" />
          Published (visible to students)
        </label>
        <button
          type="submit"
          className="rounded bg-neutral-900 px-4 py-2 font-semibold text-white active:bg-neutral-950"
        >
          Create lesson
        </button>
      </form>
      <p className="mx-auto max-w-md text-sm text-neutral-600">
        After creating, use <strong>Edit screens</strong> to add story slides,
        quizzes, and AI drafts.
      </p>
    </div>
  );
}
