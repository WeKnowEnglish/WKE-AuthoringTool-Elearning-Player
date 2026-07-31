import { notFound } from "next/navigation";
import { ClozeChoiceWorkspace } from "@/components/teacher/activity-builder/reading/ClozeChoiceWorkspace";
import { isAdmin } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClozeChoiceBuilderPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user)) notFound();
  return <ClozeChoiceWorkspace />;
}
