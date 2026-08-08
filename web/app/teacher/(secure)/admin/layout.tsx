import { redirect } from "next/navigation";
import { isAdmin, isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeacherAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isTeacher(user) || !isAdmin(user)) {
    redirect("/teacher/classes");
  }

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-hidden py-2">
      {children}
    </div>
  );
}
