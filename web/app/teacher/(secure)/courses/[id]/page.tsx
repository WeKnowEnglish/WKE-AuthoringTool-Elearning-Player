import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllModules, getCourse } from "@/lib/data/teacher";

type Props = { params: Promise<{ id: string }> };

export default async function CourseWorkspacePage({ params }: Props) {
  const { id } = await params;
  let course;
  try {
    course = await getCourse(id);
  } catch {
    notFound();
  }
  const modules = await getAllModules({ courseId: id });

  return (
    <div className="space-y-8">
      <Link href="/teacher/courses" className="text-sm text-blue-700 underline">
        ← Courses
      </Link>
      <section className="rounded border border-neutral-200 bg-white p-5">
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Target: {course.target} · /{course.slug}
          {course.published ? "" : " · draft"}
        </p>
        {course.standards ? (
          <div className="mt-3 rounded border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Standards
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800">
              {course.standards}
            </p>
          </div>
        ) : null}
        {course.outcomes ? (
          <div className="mt-3 rounded border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Outcomes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800">
              {course.outcomes}
            </p>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/teacher/modules/new?courseId=${course.id}`}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
          >
            + New module in this course
          </Link>
          <Link
            href={`/teacher/courses/${course.id}/edit`}
            className="rounded border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800"
          >
            Edit course details
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Modules in this course</h2>
        <ul className="space-y-2">
          {modules.map((m) => (
            <li
              key={m.id}
              className="relative flex flex-wrap items-center justify-between gap-3 rounded border border-neutral-200 bg-white px-4 py-3 transition-colors hover:border-neutral-300"
            >
              <Link
                href={`/teacher/modules/${m.id}`}
                aria-label={`Edit module ${m.title}`}
                className="absolute inset-0 rounded"
              />
              <div>
                <p className="font-semibold">{m.title}</p>
                <p className="text-sm text-neutral-600">
                  order {m.order_index} · /{m.slug}
                  {m.published ? "" : " · draft"}
                </p>
              </div>
              <div className="relative z-10 flex flex-wrap gap-2">
                <Link
                  href={`/teacher/modules/${m.id}`}
                  className="rounded border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-800"
                >
                  Edit module
                </Link>
                <Link
                  href={`/teacher/modules/${m.id}/lessons/new`}
                  className="rounded bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white"
                >
                  + Lesson
                </Link>
              </div>
            </li>
          ))}
        </ul>
        {modules.length === 0 ? (
          <p className="text-neutral-600">No modules yet. Create one inside this course.</p>
        ) : null}
      </section>
    </div>
  );
}
