import { notFound } from "next/navigation";
import { ClozeOpenWorkspace } from "@/components/teacher/activity-builder/reading/ClozeOpenWorkspace";
import { isAdmin } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClozeOpenBuilderPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user)) notFound();
  return <ClozeOpenWorkspace />;
}
