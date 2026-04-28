import Link from "next/link";
import { getAllCourses } from "@/lib/data/teacher";

export default async function TeacherCoursesPage() {
  const courses = await getAllCourses();

  return (
    <div className="space-y-6">
      <Link href="/teacher" className="text-sm text-blue-700 underline">
        ← Teacher dashboard
      </Link>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Courses</h1>
        <Link
          href="/teacher/courses/new"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
        >
          + New course
        </Link>
      </div>
      <ul className="space-y-2">
        {courses.map((course) => (
          <li
            key={course.id}
            className="relative flex items-center justify-between gap-3 rounded border border-neutral-200 bg-white px-4 py-3 transition-colors hover:border-neutral-300"
          >
            <Link
              href={`/teacher/courses/${course.id}`}
              aria-label={`Open course ${course.title}`}
              className="absolute inset-0 rounded"
            />
            <div>
              <p className="font-semibold">{course.title}</p>
              <p className="text-sm text-neutral-600">
                Target: {course.target} · /{course.slug} · order {course.order_index}
                {course.published ? "" : " · draft"}
              </p>
            </div>
            <Link
              href={`/teacher/courses/${course.id}`}
              className="relative z-10 rounded border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-800"
            >
              Open
            </Link>
            <Link
              href={`/teacher/courses/${course.id}/edit`}
              className="relative z-10 rounded border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-800"
            >
              Edit details
            </Link>
          </li>
        ))}
      </ul>
      {courses.length === 0 ? (
        <p className="text-neutral-600">No courses yet. Create one to organize modules.</p>
      ) : null}
    </div>
  );
}
