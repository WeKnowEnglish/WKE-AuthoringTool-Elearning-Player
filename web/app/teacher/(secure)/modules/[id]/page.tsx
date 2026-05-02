import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteLesson, deleteModule, saveModule } from "@/lib/actions/teacher";
import { getAllCourses, getLessonsForModule, getModule } from "@/lib/data/teacher";
import { ConfirmSubmitButton } from "@/components/teacher/ConfirmSubmitButton";

type Props = { params: Promise<{ id: string }> };

export default async function EditModulePage({ params }: Props) {
  const { id } = await params;
  let mod;
  try {
    mod = await getModule(id);
  } catch {
    notFound();
  }
  const lessons = await getLessonsForModule(id);
  const courses = await getAllCourses();
  const selectedTags = ((mod.module_tags as { tags?: { slug?: string } | null }[]) ?? [])
    .map((rel) => rel.tags?.slug)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-8">
      <Link href="/teacher" className="text-sm text-blue-700 underline">
        ← Modules
      </Link>
      <h1 className="text-2xl font-bold">Edit module</h1>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
      <form action={saveModule} className="w-full max-w-md shrink-0 space-y-4 rounded border bg-white p-6">
        <input type="hidden" name="id" value={mod.id} />
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            name="title"
            required
            defaultValue={mod.title}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Slug</label>
          <input
            name="slug"
            required
            defaultValue={mod.slug}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Course</label>
          <select
            name="course_id"
            defaultValue={mod.course_id}
            required
            className="mt-1 w-full rounded border px-3 py-2"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title} ({course.target})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Order</label>
          <input
            name="order_index"
            type="number"
            defaultValue={mod.order_index}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Unlock strategy</label>
          <select
            name="unlock_strategy"
            defaultValue={mod.unlock_strategy ?? "sequential"}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="sequential">Sequential (complete previous module)</option>
            <option value="always_open">Always open</option>
            <option value="manual">Manual teacher control</option>
          </select>
          <p className="mt-1 text-xs text-neutral-500">
            Sequential matches the original behavior.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="manual_unlocked"
            defaultChecked={mod.manual_unlocked ?? false}
          />
          Manual unlock (used when strategy = manual)
        </label>
        <div>
          <label className="block text-sm font-medium">Tags</label>
          <input
            name="tags_raw"
            defaultValue={selectedTags}
            placeholder="grammar, speaking, grade-3"
            className="mt-1 w-full rounded border px-3 py-2"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Comma-separated tags used by teacher/student search.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium">Standards</label>
          <textarea
            name="standards"
            rows={5}
            defaultValue={mod.standards ?? ""}
            placeholder="Module-level standards this unit addresses."
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Outcomes</label>
          <textarea
            name="outcomes"
            rows={5}
            defaultValue={mod.outcomes ?? ""}
            placeholder="Expected outcomes after completing this module."
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="published" defaultChecked={mod.published} />
          Published
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="rounded bg-neutral-900 px-4 py-2 font-semibold text-white active:bg-neutral-950"
          >
            Save module
          </button>
          <ConfirmSubmitButton
            type="submit"
            formAction={deleteModule.bind(null, id)}
            confirmMessage="Delete this module and all its lessons? This cannot be undone."
            className="rounded border border-red-300 bg-red-50 px-4 py-2 font-semibold text-red-800 hover:bg-red-100 active:bg-red-200"
          >
            Delete module
          </ConfirmSubmitButton>
        </div>
      </form>

      <section className="min-w-0 flex-1">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Lessons</h2>
          <Link
            prefetch={false}
            href={`/teacher/modules/${id}/lessons/new`}
            className="rounded bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white transition-[transform,background-color] duration-100 ease-out [touch-action:manipulation] hover:bg-emerald-800 active:scale-[0.96] active:bg-emerald-900 motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            + Next lesson
          </Link>
        </div>
        <ul className="space-y-2">
          {lessons.map((l) => (
            <li
              key={l.id}
              className="relative flex flex-wrap items-center justify-between gap-2 rounded border bg-white px-4 py-3 transition-colors hover:border-neutral-300"
            >
              <Link
                prefetch={false}
                href={`/teacher/modules/${id}/lessons/${l.id}`}
                aria-label={`Edit screens for ${l.title}`}
                className="absolute inset-0 rounded"
              />
              <span className="font-medium">
                {l.title}{" "}
                <span className="text-sm text-neutral-500">/{l.slug}</span>
              </span>
              <div className="relative z-10 flex items-center gap-2">
                <Link
                  prefetch={false}
                  href={`/teacher/modules/${id}/lessons/${l.id}`}
                  className="rounded px-2 py-1 text-sm font-semibold text-blue-700 underline transition-[transform,background-color] duration-100 ease-out [touch-action:manipulation] hover:bg-blue-50 active:scale-[0.97] active:bg-blue-100 motion-reduce:transition-none motion-reduce:active:scale-100"
                >
                  Edit screens
                </Link>
                <form action={deleteLesson.bind(null, l.id, id)}>
                  <ConfirmSubmitButton
                    type="submit"
                    confirmMessage={`Delete lesson "${l.title}"? This cannot be undone.`}
                    className="rounded border border-red-300 bg-red-50 px-2 py-1 text-sm font-semibold text-red-800 hover:bg-red-100 active:bg-red-200"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
        {lessons.length === 0 ? (
          <p className="text-neutral-600">No lessons in this module.</p>
        ) : null}
      </section>
      </div>
    </div>
  );
}
