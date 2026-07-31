import { ActivityBuilderHub } from "@/components/teacher/ActivityBuilderHub";
import { studioOriginFromEnv } from "@/lib/activity-builder/catalog";
import { isAdmin } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeacherActivityBuilderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <ActivityBuilderHub
      studioOrigin={studioOriginFromEnv()}
      isAdmin={isAdmin(user)}
    />
  );
}
