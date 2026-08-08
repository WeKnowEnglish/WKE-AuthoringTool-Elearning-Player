import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ParentI18nBoundary } from "@/components/parent/ParentI18nBoundary";
import { ParentLoginPageView } from "@/components/parent/ParentLoginPageView";
import { PARENT_LANG_COOKIE, readParentLangCookie } from "@/lib/parent/i18n/cookie";
import { safeParentPath } from "@/lib/parent/parent-routes";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Parent sign in | We Know English",
  robots: { index: false, follow: false },
};

export default async function ParentLoginPage(props: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await props.searchParams;
  const destination = safeParentPath(next);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(destination);

  const cookieStore = await cookies();
  const locale = readParentLangCookie(cookieStore.get(PARENT_LANG_COOKIE)?.value) ?? "en";

  return (
    <ParentI18nBoundary locale={locale}>
      <ParentLoginPageView nextPath={destination} />
    </ParentI18nBoundary>
  );
}
