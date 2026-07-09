import { redirect } from "next/navigation";
import { StudentHubClient } from "@/components/student-hub/StudentHubClient";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { getStudentClassMemberships } from "@/lib/data/student-classes";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams?: Promise<{ collection?: string; room?: string; message?: string }>;
};

export default async function StudentHomePage({ searchParams }: Props) {
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
  const classMemberships = await getStudentClassMemberships();

  return (
    <StudentHubClient
      initialCollectionPage={params.collection ?? null}
      initialRoom={params.room ?? null}
      initialMessage={params.message ?? null}
      classMemberships={classMemberships}
    />
  );
}
