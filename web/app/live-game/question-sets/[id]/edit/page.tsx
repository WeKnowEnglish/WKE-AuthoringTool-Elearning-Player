import { LiveGameQuestionSetEditorPage } from "@/components/live-game/editor/LiveGameQuestionSetEditorPage";
import { isTeacher } from "@/lib/auth/roles";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function LiveGameQuestionSetEditRoute({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?portal=teacher&next=/live-game/question-sets/${id}/edit`);
  }
  if (!isTeacher(user)) {
    redirect(`/login?portal=teacher&error=not_teacher&next=/live-game/question-sets/${id}/edit`);
  }
  return <LiveGameQuestionSetEditorPage setId={id} />;
}
