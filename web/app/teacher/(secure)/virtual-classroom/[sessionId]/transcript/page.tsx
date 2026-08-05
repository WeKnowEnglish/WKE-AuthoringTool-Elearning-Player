import { redirect } from "next/navigation";
import { TeacherTranscriptReviewClient } from "@/components/virtual-classroom/daily/TeacherTranscriptReviewClient";
import { canHostLive, isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Class transcript",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ sessionId: string }> };

export default async function TeacherVirtualClassroomTranscriptPage({
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

  return <TeacherTranscriptReviewClient sessionId={sessionId} />;
}
