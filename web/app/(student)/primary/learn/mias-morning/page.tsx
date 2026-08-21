import { redirect } from "next/navigation";
import { MiasMorningPlayer } from "@/components/primary/MiasMorningPlayer";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { WKE_LIBRARY_HOTSPOT_SEEDS } from "@/lib/wke-library/seed-definitions";
import { spacePackToLessonScreens } from "@/lib/teacher-space/pack-to-screens";

export default async function MiasMorningPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/primary/learn/mias-morning");
  if (isTeacher(user)) redirect(TEACHER_DEFAULT_PATH);
  if (!isStudent(user)) redirect("/login?error=unknown_role");

  const seed = WKE_LIBRARY_HOTSPOT_SEEDS.find((item) => item.slug === "mias-morning");
  if (!seed) throw new Error("Mia's Morning seed is missing.");
  const built = await seed.build();
  const lesson = spacePackToLessonScreens("explore_hotspots", built.pack, "mias-morning");
  return <MiasMorningPlayer lessonId={lesson.lessonId} lessonTitle={lesson.lessonTitle} screens={lesson.screens} />;
}
