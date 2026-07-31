import { notFound } from "next/navigation";
import { DefinitionMatchWorkspace } from "@/components/teacher/activity-builder/reading/DefinitionMatchWorkspace";
import { isAdmin } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DefinitionMatchBuilderPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user)) notFound();
  return <DefinitionMatchWorkspace />;
}
