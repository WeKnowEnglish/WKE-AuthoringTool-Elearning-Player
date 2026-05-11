import Image from "next/image";
import Link from "next/link";
import { getAllCourses, getAllLessons, getAllModules } from "@/lib/data/teacher";

const DEFAULT_COURSE_CARD_COVER = "/listen-color-backgrounds/scene-easy.svg";

export default async function TeacherHomePage() {
  const [courses, modules, lessons] = await Promise.all([
    getAllCourses(),
    getAllModules(),
    getAllLessons(),
  ]);
  const modulesByCourse = new Map<string, typeof modules>();
  for (const mod of modules) {
    if (!mod.course_id) continue;
    const list = modulesByCourse.get(mod.course_id) ?? [];
    list.push(mod);
    modulesByCourse.set(mod.course_id, list);
  }
  const lessonsByModule = new Map<string, typeof lessons>();
  for (const lesson of lessons) {
    const list = lessonsByModule.get(lesson.module_id) ?? [];
    list.push(lesson);
    lessonsByModule.set(lesson.module_id, list);
  }

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
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {courses.map((course) => (
          (() => {
            const courseModules = modulesByCourse.get(course.id) ?? [];
            const coverImageUrl = course.cover_image_url?.trim() || DEFAULT_COURSE_CARD_COVER;
            return (
              <article
                key={course.id}
                className="rounded-3xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-[#f8f5ef] p-3 shadow-sm ring-1 ring-neutral-100"
              >
                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                  <div className="relative aspect-[16/9] border-b border-neutral-200 bg-[#f4ecd8]">
                    <Image
                      src={coverImageUrl}
                      alt={`${course.title} cover`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1279px) 100vw, 50vw"
                      unoptimized={coverImageUrl.startsWith("http")}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
                  </div>
                  <div className="space-y-3 p-4">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-neutral-900">{course.title}</h2>
                      {!course.published ? (
                        <p className="mt-0.5 text-sm text-neutral-600">Draft</p>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-neutral-600">Modules</p>
                      <div className="mt-2 space-y-2">
                        {courseModules.map((mod) => {
                          const moduleLessons = lessonsByModule.get(mod.id) ?? [];
                          return (
                            <details
                              key={mod.id}
                              className="group overflow-hidden rounded-xl border border-neutral-200 bg-white"
                            >
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
                                <span className="min-w-0 truncate text-sm font-semibold text-neutral-800">
                                  {mod.title}
                                </span>
                                <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-600">
                                  Open lessons
                                </span>
                              </summary>
                              <ul className="space-y-1 border-t border-neutral-200 bg-neutral-50 px-3 py-2.5">
                                {moduleLessons.map((lesson) => (
                                  <li key={lesson.id}>
                                    <Link
                                      href={`/teacher/modules/${mod.id}/lessons/${lesson.id}`}
                                      className="text-sm text-blue-700 underline"
                                    >
                                      {lesson.title}
                                      {!lesson.published ? " ┬╖ draft" : ""}
                                    </Link>
                                  </li>
                                ))}
                                {moduleLessons.length === 0 ? (
                                  <li className="text-sm text-neutral-500">No lessons yet.</li>
                                ) : null}
                              </ul>
                            </details>
                          );
                        })}
                        {courseModules.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-500">
                            No modules yet.
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link
                        href={`/teacher/courses/${course.id}/edit`}
                        className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
                      >
                        Edit details
                      </Link>
                      <Link
                        href={`/teacher/modules/new?courseId=${course.id}`}
                        className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-neutral-800"
                      >
                        + New module
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })()
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
