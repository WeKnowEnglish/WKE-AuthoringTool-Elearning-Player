import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedCatalog } from "@/lib/data/catalog";
import { CourseLearnClient } from "./CourseLearnClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ courseSlug: string }> };

export default async function CourseLearnPage({ params }: Props) {
  const { courseSlug } = await params;
  const catalog = await getPublishedCatalog();
  const course = catalog.courses.find((c) => c.slug === courseSlug);
  if (!course) notFound();

  const modules = catalog.modules.filter((m) => m.course_id === course.id);
  const moduleIds = new Set(modules.map((m) => m.id));
  const lessons = catalog.lessons.filter((l) => moduleIds.has(l.module_id));

  return (
    <div className="space-y-6">
      <p className="text-sm">
        <Link href="/learn" className="font-semibold underline">
          All courses
        </Link>
      </p>
      <h1 className="text-3xl font-extrabold">{course.title}</h1>
      <p className="text-lg text-neutral-700">
        Target: {course.target}. Finish each module to unlock the next one.
      </p>
      <CourseLearnClient
        key={course.id}
        course={course}
        modules={modules}
        lessons={lessons}
        skillsByLesson={catalog.skillsByLesson}
        moduleTagsByModule={catalog.moduleTagsByModule}
        loadError={catalog.loadError}
      />
    </div>
  );
}
