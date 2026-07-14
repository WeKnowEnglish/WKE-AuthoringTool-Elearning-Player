import { LiveGameHostPage } from "@/components/live-game/LiveGameHostPage";
import { isTeacher } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ classId?: string }> };

export default async function LiveGameHostRoute({ searchParams }: Props) {
  const { classId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?portal=teacher&next=/live-game/host");
  if (!isTeacher(user)) {
    redirect("/live-game?notice=teacher_only");
  }
  return <LiveGameHostPage initialClassId={classId} />;
}
