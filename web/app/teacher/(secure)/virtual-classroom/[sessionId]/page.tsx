import { redirect } from "next/navigation";
import { VirtualClassroomSessionGate } from "@/components/virtual-classroom/VirtualClassroomSessionView";
import { canHostLive, isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Virtual Classroom",
  robots: { index: false, follow: false },
};

export default async function TeacherVirtualClassroomSessionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isTeacher(user) || !canHostLive(user)) {
    redirect("/teacher/classes?notice=live_requires_plus");
  }
  return <VirtualClassroomSessionGate />;
}
