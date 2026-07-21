import { redirect } from "next/navigation";
import { WordCardsSessionView } from "@/components/word-cards/WordCardsSessionView";
import { canHostLive, isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeacherWordCardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isTeacher(user) || !canHostLive(user)) {
    redirect("/teacher/classes?notice=live_requires_plus");
  }
  return <WordCardsSessionView />;
}
