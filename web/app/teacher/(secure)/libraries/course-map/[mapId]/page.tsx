import { notFound } from "next/navigation";
import { CourseMapEditor } from "@/components/teacher/course-map/CourseMapEditor";
import { courseMapError, courseResourceOptions, getCourseMap } from "@/lib/course-map/server";
import { listTeacherClasses } from "@/lib/data/teacher-classes";
import { isUuid } from "@/lib/class-lessons/vocabulary";

export const metadata = { title: "Edit course map · Libraries" };
export const dynamic = "force-dynamic";
export default async function CourseMapDetailPage({ params, searchParams }: { params: Promise<{ mapId: string }>; searchParams: Promise<{ lesson?: string; classId?: string }> }) {
  const { mapId } = await params;
  if (!isUuid(mapId)) notFound();
  const map = await getCourseMap(mapId);
  if (!map) notFound();
  const search = await searchParams;
  let loaded;
  let message = "";
  try { loaded = await Promise.all([courseResourceOptions(map.document), listTeacherClasses()]); }
  catch (error) { message = courseMapError(error); }
  if (!loaded) return <p role="alert" className="rounded-lg border border-red-200 p-4">{message}</p>;
  const [resources, classes] = loaded;
  return <CourseMapEditor initialMap={map} initialResources={resources} classes={classes.filter(c => !c.archived_at).map(c => ({ id: c.id, title: c.title }))} initialLessonId={search.lesson} initialClassId={search.classId} />;
}
