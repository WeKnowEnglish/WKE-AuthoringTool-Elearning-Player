import Link from "next/link";
import { getAllCourses } from "@/lib/data/teacher";

export default async function TeacherHomePage() {
  const courses = await getAllCourses();

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h2 className="font-bold text-amber-950">Course-first content creation</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-950">
          <li>
            <strong>Courses</strong> are the parent workspace.
          </li>
          <li>
            Create and manage modules from inside each course.
          </li>
        </ul>
        <Link
          href="/teacher/courses/new"
          className="mt-3 inline-block rounded bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-[transform,background-color] duration-100 ease-out [touch-action:manipulation] active:scale-[0.96] active:bg-neutral-950 motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          + New course
        </Link>
        <Link
          href="/teacher/courses"
          className="ml-2 inline-block rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition-[transform,background-color] duration-100 ease-out [touch-action:manipulation] hover:bg-neutral-50 active:scale-[0.96] active:bg-neutral-200 motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          Manage courses
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Courses</h1>
        <Link
          href="/teacher/courses/new"
          className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition-[transform,background-color] duration-100 ease-out [touch-action:manipulation] hover:bg-neutral-50 active:scale-[0.96] active:bg-neutral-200 motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          + New course
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <article
            key={course.id}
            className="relative rounded border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300"
          >
            <Link
              href={`/teacher/courses/${course.id}`}
              aria-label={`Open course ${course.title}`}
              className="absolute inset-0 rounded"
            />
            <h2 className="text-lg font-bold text-neutral-900">{course.title}</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Target: {course.target} · /{course.slug}
              {course.published ? "" : " · draft"}
            </p>
            <div className="relative z-10 mt-4 flex flex-wrap gap-2">
              <Link
                href={`/teacher/courses/${course.id}`}
                className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white"
              >
                Open course
              </Link>
              <Link
                href={`/teacher/courses/${course.id}/edit`}
                className="rounded border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-800"
              >
                Edit details
              </Link>
            </div>
          </article>
        ))}
      </div>
      {courses.length === 0 ? (
        <p className="text-neutral-600">
          No courses yet. Click <strong>+ New course</strong> to create your first workspace.
        </p>
      ) : null}
    </div>
  );
}
