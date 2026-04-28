import Link from "next/link";
import { saveModule } from "@/lib/actions/teacher";
import { TitleSlugFields } from "@/components/teacher/TitleSlugFields";
import { getAllCourses, getAllModules, getNextModuleOrderIndex } from "@/lib/data/teacher";

type Props = {
  searchParams?: Promise<{ courseId?: string }>;
};

export default async function NewModulePage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const courses = await getAllCourses();
  const selectedCourse =
    courses.find((course) => course.id === params.courseId) ?? courses[0];
  const nextOrder = await getNextModuleOrderIndex(selectedCourse?.id);
  const modules = await getAllModules({ courseId: selectedCourse?.id });
  const last =
    modules.length > 0
      ? modules.reduce((a, b) => (a.order_index > b.order_index ? a : b))
      : null;

  return (
    <div className="space-y-6">
      <Link href="/teacher" className="text-sm text-blue-700 underline">
        ← Teacher dashboard
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Create next module</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Modules control student order: they unlock one after another. This new
          module will use order <strong>{nextOrder}</strong>
          {last ? (
            <>
              {" "}
              (after <em>{last.title}</em>).
            </>
          ) : (
            " (first module)."
          )}
        </p>
      </div>
      {courses.length === 0 ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Create a course first before creating modules.
          <Link href="/teacher/courses/new" className="ml-1 font-semibold underline">
            Go to new course
          </Link>
        </div>
      ) : null}
      <form
        action={saveModule}
        className="max-w-md space-y-4 rounded border bg-white p-6"
        aria-disabled={courses.length === 0}
      >
        <TitleSlugFields />
        <div>
          <label className="block text-sm font-medium" htmlFor="course_id">
            Course
          </label>
          <select
            id="course_id"
            name="course_id"
            required
            disabled={courses.length === 0}
            defaultValue={selectedCourse?.id}
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title} ({course.target})
              </option>
            ))}
          </select>
        </div>
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
          <p className="mt-1 text-xs text-neutral-500">
            Usually leave as-is so the module appears last in this course.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="unlock_strategy">
            Unlock strategy
          </label>
          <select
            id="unlock_strategy"
            name="unlock_strategy"
            defaultValue="sequential"
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          >
            <option value="sequential">Sequential (complete previous module)</option>
            <option value="always_open">Always open</option>
            <option value="manual">Manual teacher control</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="manual_unlocked" />
          Manual unlock (used when strategy = manual)
        </label>
        <div>
          <label className="block text-sm font-medium" htmlFor="tags_raw">
            Tags
          </label>
          <input
            id="tags_raw"
            name="tags_raw"
            placeholder="grammar, speaking, grade-3"
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-neutral-500">Comma-separated tags for search.</p>
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="standards">
            Standards
          </label>
          <textarea
            id="standards"
            name="standards"
            rows={4}
            placeholder="Module-level standards this unit addresses."
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="outcomes">
            Outcomes
          </label>
          <textarea
            id="outcomes"
            name="outcomes"
            rows={4}
            placeholder="Expected outcomes after completing this module."
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="published" />
          Published (visible to students)
        </label>
        <button
          type="submit"
          disabled={courses.length === 0}
          className="rounded bg-neutral-900 px-4 py-2 font-semibold text-white active:bg-neutral-950"
        >
          Create module
        </button>
      </form>
    </div>
  );
}
