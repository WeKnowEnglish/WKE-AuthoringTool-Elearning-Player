import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StudentClassroomView } from "@/components/classroom/StudentClassroomView";
import { getStudentClassMembership } from "@/lib/data/student-classes";
import { listClassPostsForStudentClass } from "@/lib/data/class-posts";
import { listPublishedClassMaterialsForStudentClass } from "@/lib/data/class-lessons";
import { getClassScheduleForStudentClass } from "@/lib/data/class-meeting-slots";
import { getActiveLiveSessionForStudentClass } from "@/lib/data/student-live";
import { createClient } from "@/lib/supabase/server";
import { requireSecondaryStudentAccess } from "../../_lib/requireSecondaryAccess";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My classroom | We Know English",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ classId: string }>;
};

export default async function SecondaryClassroomPage({ params }: Props) {
  await requireSecondaryStudentAccess();
  const { classId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/secondary/class/${encodeURIComponent(classId)}`);
  }

  const membership = await getStudentClassMembership(classId);
  if (!membership) {
    notFound();
  }

  const posts = await listClassPostsForStudentClass(classId);
  const materials = await listPublishedClassMaterialsForStudentClass(classId);
  const schedule = await getClassScheduleForStudentClass(classId);
  const liveSession = await getActiveLiveSessionForStudentClass(classId);

  return (
    <StudentClassroomView
      membership={membership}
      posts={posts}
      materials={materials}
      schedule={schedule}
      liveSession={liveSession}
      homeHref="/secondary"
      homeLabel="Back to Home"
      tone="secondary"
    />
  );
}
