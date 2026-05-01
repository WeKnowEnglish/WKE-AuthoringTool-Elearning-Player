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
    redirect("/teacher/login");
  }
  if (user.app_metadata?.role !== "teacher") {
    redirect("/teacher/login?error=not_teacher");
  }

  return <TeacherSecureShell userEmail={user.email ?? ""}>{children}</TeacherSecureShell>;
}
