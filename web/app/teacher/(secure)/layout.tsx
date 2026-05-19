import { redirect } from "next/navigation";
import { TeacherSecureShell } from "@/components/teacher/TeacherSecureShell";
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
    redirect("/login?portal=teacher&next=/teacher/courses");
  }
  if (user.app_metadata?.role !== "teacher") {
    redirect("/login?portal=teacher&error=not_teacher");
  }

  return <TeacherSecureShell userEmail={user.email ?? ""}>{children}</TeacherSecureShell>;
}
