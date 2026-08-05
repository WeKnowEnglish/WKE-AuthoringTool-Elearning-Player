import { redirect } from "next/navigation";
import { TeacherRecordingReviewClient } from "@/components/virtual-classroom/daily/TeacherRecordingReviewClient";
import { canHostLive, isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Class recording",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ sessionId: string }> };

export default async function TeacherVirtualClassroomRecordingPage({
  params,
}: PageProps) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isTeacher(user) || !canHostLive(user)) {
    redirect("/teacher/classes?notice=live_requires_plus");
  }

  return <TeacherRecordingReviewClient sessionId={sessionId} />;
}
