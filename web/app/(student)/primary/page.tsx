import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PrimaryDashboardClient } from "@/components/primary/PrimaryDashboardClient";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { listAssignedHomeworkForStudent } from "@/lib/data/class-homework";
import { getStudentClassMemberships } from "@/lib/data/student-classes";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Primary Learning | We Know English",
  description: "Primary student learning dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

type Props = {
  searchParams?: Promise<{ nav?: string; set?: string; message?: string }>;
};

export default async function PrimaryDashboardPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  if (isTeacher(user)) {
    redirect(TEACHER_DEFAULT_PATH);
  }

  if (!isStudent(user)) {
    redirect("/login?error=unknown_role");
  }

  const params = (await searchParams) ?? {};
  const [classMemberships, assignedHomework] = await Promise.all([
    getStudentClassMemberships(),
    listAssignedHomeworkForStudent(),
  ]);

  return (
    <PrimaryDashboardClient
      classMemberships={classMemberships}
      assignedHomework={assignedHomework}
      initialNav={params.nav ?? null}
      initialSetId={params.set ?? null}
      initialMessage={params.message ?? null}
    />
  );
}
