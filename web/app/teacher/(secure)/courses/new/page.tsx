import Link from "next/link";
import { saveCourse } from "@/lib/actions/teacher";
import { TitleSlugFields } from "@/components/teacher/TitleSlugFields";
import { getNextCourseOrderIndex } from "@/lib/data/teacher";

export default async function NewCoursePage() {
  const nextOrder = await getNextCourseOrderIndex();

  return (
    <div className="space-y-6">
      <Link href="/teacher/courses" className="text-sm text-blue-700 underline">
        ← Courses
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Create course</h1>
        <p className="mt-1 text-sm text-neutral-600">
          A course groups modules for a target audience or objective.
        </p>
      </div>
      <form action={saveCourse} className="max-w-md space-y-4 rounded border bg-white p-6">
        <TitleSlugFields />
        <div>
          <label className="block text-sm font-medium" htmlFor="target">
            Target
          </label>
          <input
            id="target"
            name="target"
            required
            placeholder="Grade 3, IELTS Foundation, Kids A1"
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          />
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
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="standards">
            Standards
          </label>
          <textarea
            id="standards"
            name="standards"
            rows={4}
            placeholder="List curriculum standards this course targets."
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
            placeholder="List measurable outcomes for students."
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="published" />
          Published (visible to students)
        </label>
        <button type="submit" className="rounded bg-neutral-900 px-4 py-2 font-semibold text-white">
          Create course
        </button>
      </form>
    </div>
  );
}
