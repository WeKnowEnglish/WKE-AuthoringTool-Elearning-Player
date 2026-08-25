import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StudentClassroomView } from "@/components/classroom/StudentClassroomView";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { parseClassroomTab } from "@/lib/classroom/classroom-tabs";
import { listAssignedHomeworkForStudent } from "@/lib/data/class-homework";
import { getStudentClassMemberships } from "@/lib/data/student-classes";
import { listClassPostsForStudentClass } from "@/lib/data/class-posts";
import { listPublishedClassMaterialsForStudentClass } from "@/lib/data/class-lessons";
import { getClassScheduleForStudentClass } from "@/lib/data/class-meeting-slots";
import { getActiveLiveSessionForStudentClass } from "@/lib/data/student-live";
import { getTrialStudentDiscoveryForClass } from "@/lib/data/trial-availability";
import {
  PRIMARY_CHROME_CLASS,
  PRIMARY_CHROME_STYLE,
} from "@/lib/primary/primary-chrome";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My classroom | We Know English",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ classId: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

export default async function PrimaryClassroomPage({ params, searchParams }: Props) {
  const { classId } = await params;
  const tabParam = (await searchParams)?.tab;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/primary/class/${encodeURIComponent(classId)}`);
  }
  if (isTeacher(user)) {
    redirect(TEACHER_DEFAULT_PATH);
  }
  if (!isStudent(user)) {
    redirect("/login?error=unknown_role");
  }

  const memberships = await getStudentClassMemberships();
  const membership = memberships.find((item) => item.classId === classId) ?? null;
  if (!membership) {
    notFound();
  }

  const [posts, materials, schedule, liveSession, assignedHomework, trialDiscovery] =
    await Promise.all([
      listClassPostsForStudentClass(classId),
      listPublishedClassMaterialsForStudentClass(classId),
      getClassScheduleForStudentClass(classId),
      getActiveLiveSessionForStudentClass(classId),
      listAssignedHomeworkForStudent(),
      membership.classKind === "trial"
        ? getTrialStudentDiscoveryForClass(classId)
        : Promise.resolve(null),
    ]);

  const openForClass = assignedHomework.filter((item) => item.classId === classId);
  const recentHomework = [...openForClass].sort((a, b) => {
    const aTime = a.assignedAt ?? "";
    const bTime = b.assignedAt ?? "";
    if (aTime !== bTime) return bTime.localeCompare(aTime);
    return b.id.localeCompare(a.id);
  });

  return (
    <div className={`${PRIMARY_CHROME_CLASS}`} style={PRIMARY_CHROME_STYLE}>
      <StudentClassroomView
        membership={membership}
        memberships={memberships}
        posts={posts}
        materials={materials}
        schedule={schedule}
        liveSession={liveSession}
        recentHomework={recentHomework}
        homeworkBasePath="/primary"
        homeHref="/primary"
        homeLabel="Back to Primary home"
        tone="primary"
        initialTab={parseClassroomTab(tabParam, membership.studentTabs)}
        tabSettings={membership.studentTabs}
        trialDiscovery={trialDiscovery}
      />
    </div>
  );
}
