import { LiveGameHostPage } from "@/components/live-game/LiveGameHostPage";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LiveGameHostRoute() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?portal=teacher&next=/live-game/host");
  if (user.app_metadata?.role !== "teacher") {
    redirect("/login?portal=teacher&error=not_teacher&next=/live-game/host");
  }
  return <LiveGameHostPage />;
}
