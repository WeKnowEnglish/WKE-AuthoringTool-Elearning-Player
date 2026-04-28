import { notFound } from "next/navigation";
import { LessonGate } from "@/components/lesson/LessonGate";
import { getLessonBySlugs, getPublishedCatalog } from "@/lib/data/catalog";
import { lessonsForModule } from "@/lib/gating";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ moduleSlug: string; lessonSlug: string }> };

export default async function LessonPage({ params }: Props) {
  const { moduleSlug, lessonSlug } = await params;
  const data = await getLessonBySlugs(moduleSlug, lessonSlug);
  if (!data) notFound();

  const catalog = await getPublishedCatalog();
  const courseModules = catalog.modules.filter((m) => m.course_id === data.module.course_id);
  const modLessons = lessonsForModule(catalog.lessons, data.module.id);
  if (!modLessons.some((l) => l.id === data.lesson.id)) notFound();

  return (
    <LessonGate
      module={data.module}
      modules={courseModules}
      lessons={catalog.lessons}
      lesson={data.lesson}
      screens={data.screens}
    />
  );
}
