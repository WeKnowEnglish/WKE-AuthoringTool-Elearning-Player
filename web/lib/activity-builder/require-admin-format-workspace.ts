import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

/**
 * Individual format workspaces stay available for admins / deep edit.
 * Teachers use the hub hubs (Quiz builder, vocab lists, LTC, hotspots, library).
 */
export async function requireAdminActivityFormatWorkspace(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdmin(user)) {
    redirect("/teacher/activity-builder");
  }
}
