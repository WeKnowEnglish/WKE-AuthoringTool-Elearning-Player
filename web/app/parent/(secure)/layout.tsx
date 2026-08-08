import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ParentI18nBoundary } from "@/components/parent/ParentI18nBoundary";
import { ParentPortalShell } from "@/components/parent/ParentPortalShell";
import { listParentLinkedStudents } from "@/lib/parent/guardian-data";
import {
  PARENT_LANG_COOKIE,
  readParentLangCookie,
} from "@/lib/parent/i18n/cookie";
import { parseParentLocale } from "@/lib/parent/i18n";
import {
  countUnreadParentNotifications,
  getParentAccountSettings,
} from "@/lib/parent/parent-notifications";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ParentSecureLayout(props: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/parent/login?next=/parent");

  const [students, unreadNotificationCount, settings] = await Promise.all([
    listParentLinkedStudents(),
    countUnreadParentNotifications().catch(() => 0),
    getParentAccountSettings().catch(() => null),
  ]);

  const cookieStore = await cookies();
  const cookieLocale = readParentLangCookie(cookieStore.get(PARENT_LANG_COOKIE)?.value);
  const locale = settings?.preferredLanguage
    ? parseParentLocale(settings.preferredLanguage)
    : (cookieLocale ?? "en");

  return (
    <ParentI18nBoundary locale={locale}>
      <ParentPortalShell
        userEmail={user.email ?? ""}
        students={students}
        unreadNotificationCount={unreadNotificationCount}
      >
        {props.children}
      </ParentPortalShell>
    </ParentI18nBoundary>
  );
}
