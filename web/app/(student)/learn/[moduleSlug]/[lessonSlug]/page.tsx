import { notFound } from "next/navigation";
import { LessonGate } from "@/components/lesson/LessonGate";
import { getLessonPageContext } from "@/lib/data/catalog";
import { lessonsForModule } from "@/lib/gating";
import { completionPlaygroundSchema } from "@/lib/lesson-schemas";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ moduleSlug: string; lessonSlug: string }> };

export default async function LessonPage({ params }: Props) {
  const { moduleSlug, lessonSlug } = await params;
  const ctx = await getLessonPageContext(moduleSlug, lessonSlug);
  if (!ctx) notFound();

  const { data, catalog } = ctx;
  const courseModules = catalog.modules;
  const modLessons = lessonsForModule(catalog.lessons, data.module.id);
  if (!modLessons.some((l) => l.id === data.lesson.id)) notFound();

  const rawCompletion = (data.lesson as { completion_playground?: unknown })
    .completion_playground;
  const completionParsed = completionPlaygroundSchema.safeParse(rawCompletion);
  const completionPlayground = completionParsed.success ? completionParsed.data : null;

  return (
    <LessonGate
      module={data.module}
      modules={courseModules}
      lessons={catalog.lessons}
      lesson={data.lesson}
      screens={data.screens}
      completionPlayground={completionPlayground}
    />
  );
}
