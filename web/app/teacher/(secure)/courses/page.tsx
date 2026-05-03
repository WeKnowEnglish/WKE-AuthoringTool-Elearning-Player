import Link from "next/link";
import { CourseWallBoard } from "@/components/teacher/CourseWallBoard";
import { getAllCourses, getAllModules, getLessonsForModules } from "@/lib/data/teacher";

export default async function TeacherCoursesPage() {
  const [courses, modules] = await Promise.all([getAllCourses(), getAllModules()]);
  const lessons = await getLessonsForModules(modules.map((module) => module.id));

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
      <CourseWallBoard courses={courses} modules={modules} lessons={lessons} />
      {courses.length === 0 ? (
        <p className="text-neutral-600">No courses yet. Create one to organize modules.</p>
      ) : null}
    </div>
  );
}
