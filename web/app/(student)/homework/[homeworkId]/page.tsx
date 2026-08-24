import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import {
  homeworkPortalPath,
  resolveHomeworkPortal,
} from "@/lib/class-homework/portal";
import { getHomeworkForStudent } from "@/lib/data/class-homework";
import { learningBandFromUser } from "@/lib/student-classes/portal-paths";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Homework | We Know English",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ homeworkId: string }>;
};

/** Canonical assignment link shared by teachers; dispatches to the right player. */
export default async function HomeworkRouterPage({ params }: Props) {
  const { homeworkId } = await params;
  const canonicalPath = `/homework/${encodeURIComponent(homeworkId)}`;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?portal=student&next=${encodeURIComponent(canonicalPath)}`);
  }
  if (isTeacher(user)) redirect(TEACHER_DEFAULT_PATH);
  if (!isStudent(user)) redirect("/login?error=unknown_role");

  const detail = await getHomeworkForStudent(homeworkId);
  if (!detail) notFound();

  const portal = resolveHomeworkPortal(
    detail.homework.payload,
    learningBandFromUser(user),
  );
  redirect(homeworkPortalPath(homeworkId, portal));
}
