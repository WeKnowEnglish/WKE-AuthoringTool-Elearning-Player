import { redirect } from "next/navigation";
import { TeacherSecureShell } from "@/components/teacher/TeacherSecureShell";
import {
  getTeacherTier,
  isAdmin,
  isTeacher,
  mustChangePassword,
  TEACHER_SET_PASSWORD_PATH,
} from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeacherSecureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?portal=teacher&next=/teacher/classes");
  }
  if (!isTeacher(user)) {
    redirect("/login?portal=teacher&error=not_teacher");
  }
  if (mustChangePassword(user)) {
    redirect(TEACHER_SET_PASSWORD_PATH);
  }

  return (
    <TeacherSecureShell
      userEmail={user.email ?? ""}
      teacherTier={getTeacherTier(user) ?? "plus"}
      isAdmin={isAdmin(user)}
    >
      {children}
    </TeacherSecureShell>
  );
}
