import { VirtualClassroomHostClient } from "@/components/virtual-classroom/VirtualClassroomHostClient";
import { isTeacher } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Host Virtual Classroom",
};

export default async function VirtualClassroomHostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?portal=teacher&next=/teacher/virtual-classroom/host");
  }
  if (!isTeacher(user)) {
    redirect("/teacher/classes?notice=teacher_only");
  }
  return <VirtualClassroomHostClient />;
}
