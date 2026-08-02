import { redirect } from "next/navigation";
import { ParentPortalShell } from "@/components/parent/ParentPortalShell";
import { listParentLinkedStudents } from "@/lib/parent/guardian-data";
import { countUnreadParentNotifications } from "@/lib/parent/parent-notifications";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ParentSecureLayout(props: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/parent/login?next=/parent");

  const [students, unreadNotificationCount] = await Promise.all([
    listParentLinkedStudents(),
    countUnreadParentNotifications().catch(() => 0),
  ]);
  return (
    <ParentPortalShell
      userEmail={user.email ?? ""}
      students={students}
      unreadNotificationCount={unreadNotificationCount}
    >
      {props.children}
    </ParentPortalShell>
  );
}
