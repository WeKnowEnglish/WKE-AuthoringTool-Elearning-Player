import { CourseMapIndex } from "@/components/teacher/course-map/CourseMapIndex";
import { courseMapError, listCourseMaps } from "@/lib/course-map/server";

export const metadata = { title: "Course map · Libraries" };
export const dynamic = "force-dynamic";
export default async function CourseMapPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const { classId } = await searchParams;
  let maps;
  let message = "";
  try { maps = await listCourseMaps(); }
  catch (error) { message = courseMapError(error); }
  if (!maps) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5"><h1 className="text-xl font-bold">Course map</h1><p className="mt-2 text-sm">{message}</p></div>;
  return <CourseMapIndex maps={maps} classId={classId} />;
}
