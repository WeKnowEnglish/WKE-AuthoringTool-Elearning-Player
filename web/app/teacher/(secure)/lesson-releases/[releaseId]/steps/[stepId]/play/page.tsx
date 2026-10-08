import { notFound } from "next/navigation";
import { getLessonRelease } from "@/lib/data/lesson-releases";
import { isUuid } from "@/lib/class-lessons/vocabulary";
import { validateLessonMaterial } from "@/lib/class-lessons/release";
import { ReleasedLessonPlayer } from "@/components/teacher/class-hub/ReleasedLessonPlayer";
import type { LessonScreenRow } from "@/lib/lesson/types";

export default async function ReleasedLessonPlayPage({ params }: { params: Promise<{ releaseId: string; stepId: string }> }) {
  const { releaseId, stepId } = await params;
  if (!isUuid(releaseId) || !isUuid(stepId)) notFound();
  const release = await getLessonRelease(releaseId);
  const material = release?.snapshot.materials[stepId];
  if (!release || !material) notFound();
  const pack = validateLessonMaterial(material.format, material.pack);
  const lessonId = `activity-lesson-release-${release.id}-${stepId}`;
  const screens = (pack.screens as LessonScreenRow["payload"][]).map((payload, index): LessonScreenRow => ({
    id: `${lessonId}-${index}`, lesson_id: lessonId, order_index: index, screen_type: "interaction", payload,
  }));
  return <ReleasedLessonPlayer lessonId={lessonId} title={material.title} screens={screens} />;
}
