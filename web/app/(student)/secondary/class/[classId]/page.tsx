import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StudentClassroomView } from "@/components/classroom/StudentClassroomView";
import { listAssignedHomeworkForStudent } from "@/lib/data/class-homework";
import { getStudentClassMemberships } from "@/lib/data/student-classes";
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

  const memberships = await getStudentClassMemberships();
  const membership = memberships.find((item) => item.classId === classId) ?? null;
  if (!membership) {
    notFound();
  }

  const [posts, materials, schedule, liveSession, assignedHomework] =
    await Promise.all([
      listClassPostsForStudentClass(classId),
      listPublishedClassMaterialsForStudentClass(classId),
      getClassScheduleForStudentClass(classId),
      getActiveLiveSessionForStudentClass(classId),
      listAssignedHomeworkForStudent(),
    ]);

  const recentHomework = assignedHomework
    .filter((item) => item.classId === classId)
    .sort((a, b) => {
      const aTime = a.assignedAt ?? "";
      const bTime = b.assignedAt ?? "";
      if (aTime !== bTime) return bTime.localeCompare(aTime);
      return b.id.localeCompare(a.id);
    });

  return (
    <StudentClassroomView
      membership={membership}
      memberships={memberships}
      posts={posts}
      materials={materials}
      schedule={schedule}
      liveSession={liveSession}
      recentHomework={recentHomework}
      homeworkBasePath="/secondary"
      homeHref="/secondary"
      homeLabel="Back to Home"
      tone="secondary"
      tabSettings={membership.studentTabs}
    />
  );
}
