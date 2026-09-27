import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HouseDesigner } from "@/components/house-designer/HouseDesigner";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { studentLoginPath } from "@/lib/auth/student-login";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Design your house | WKE World",
  robots: { index: false, follow: false },
};

export default async function PrimaryHouseDesignPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(studentLoginPath("a1", "/primary/world/design/cottage"));
  }
  if (isTeacher(user)) {
    redirect(TEACHER_DEFAULT_PATH);
  }
  if (!isStudent(user)) {
    redirect("/login?error=unknown_role");
  }

  return (
    <HouseDesigner backHref="/primary/world" playHref="/primary/world/play/cottage?inside=1" />
  );
}
