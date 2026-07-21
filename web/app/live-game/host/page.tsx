import { LiveGameHostPage } from "@/components/live-game/LiveGameHostPage";
import {
  canHostLive,
  isTeacher,
  mustChangePassword,
  TEACHER_SET_PASSWORD_PATH,
} from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ classId?: string; questionSetId?: string }> };

export default async function LiveGameHostRoute({ searchParams }: Props) {
  const { classId, questionSetId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?portal=teacher&next=/live-game/host");
  if (!isTeacher(user)) {
    redirect("/live-game?notice=teacher_only");
  }
  if (mustChangePassword(user)) {
    redirect(TEACHER_SET_PASSWORD_PATH);
  }
  if (!canHostLive(user)) {
    redirect("/teacher/classes?notice=live_requires_plus");
  }
  return (
    <LiveGameHostPage initialClassId={classId} initialQuestionSetId={questionSetId} />
  );
}
