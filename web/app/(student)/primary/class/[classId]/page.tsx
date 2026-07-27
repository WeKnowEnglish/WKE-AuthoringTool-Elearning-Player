import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { StudentClassroomView } from "@/components/classroom/StudentClassroomView";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { getStudentClassMembership } from "@/lib/data/student-classes";
import { listClassPostsForStudentClass } from "@/lib/data/class-posts";
import { getActiveLiveSessionForStudentClass } from "@/lib/data/student-live";
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
};

export default async function PrimaryClassroomPage({ params }: Props) {
  const { classId } = await params;
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

  const membership = await getStudentClassMembership(classId);
  if (!membership) {
    notFound();
  }

  const posts = await listClassPostsForStudentClass(classId);
  const liveSession = await getActiveLiveSessionForStudentClass(classId);

  return (
    <div
      className={`min-h-dvh bg-[var(--pl-bg)] ${PRIMARY_CHROME_CLASS}`}
      style={PRIMARY_CHROME_STYLE}
    >
      <StudentClassroomView
        membership={membership}
        posts={posts}
        liveSession={liveSession}
        homeHref="/primary"
        homeLabel="Back to Primary home"
        tone="primary"
      />
    </div>
  );
}
