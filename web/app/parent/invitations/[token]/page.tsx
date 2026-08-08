import type { Metadata } from "next";
import { cookies } from "next/headers";
import { GuardianInvitationAcceptCard } from "@/components/parent/GuardianInvitationAcceptCard";
import { ParentAccountSwitchButton } from "@/components/parent/ParentAccountSwitchButton";
import { ParentAuthForm } from "@/components/parent/ParentAuthForm";
import { ParentI18nBoundary } from "@/components/parent/ParentI18nBoundary";
import { ParentLanguageToggle } from "@/components/parent/ParentLanguageToggle";
import { PARENT_LANG_COOKIE, readParentLangCookie } from "@/lib/parent/i18n/cookie";
import { getGuardianInvitationPreview } from "@/lib/parent/guardian-data";
import { isPlausibleGuardianInvitationToken } from "@/lib/parent/guardian-domain";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Parent invitation | We Know English",
  robots: { index: false, follow: false },
};

function StateCard(props: { title: string; detail: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-black tracking-tight text-slate-950">{props.title}</h1>
      <p className="mt-3 leading-relaxed text-slate-600">{props.detail}</p>
      {props.children}
    </div>
  );
}

export default async function GuardianInvitationPage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;
  const invitationPath = `/parent/invitations/${encodeURIComponent(token)}`;

  if (!isPlausibleGuardianInvitationToken(token)) {
    return (
      <main className="min-h-dvh bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl">
          <StateCard
            title="This invitation is not valid"
            detail="Ask your child's teacher to send a new parent portal invitation."
          />
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const cookieStore = await cookies();
    const locale = readParentLangCookie(cookieStore.get(PARENT_LANG_COOKIE)?.value) ?? "en";
    return (
      <ParentI18nBoundary locale={locale}>
        <main className="min-h-dvh bg-slate-50 px-4 py-10 text-slate-950" lang={locale}>
          <div className="mx-auto max-w-md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">
                  Secure family invitation
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight">Sign in to continue</h1>
              </div>
              <ParentLanguageToggle />
            </div>
            <p className="mt-3 leading-relaxed text-slate-600">
              Use the email address that received this invitation. Student details remain hidden until
              the email is verified.
            </p>
            <div className="mt-7">
              <ParentAuthForm nextPath={invitationPath} invitationMode />
            </div>
          </div>
        </main>
      </ParentI18nBoundary>
    );
  }

  const preview = await getGuardianInvitationPreview(token);
  if (!preview.ok) {
    const unverified = preview.error === "verified_email_required";
    return (
      <main className="min-h-dvh bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl">
          <StateCard
            title={unverified ? "Verify your email first" : "This account cannot accept the invitation"}
            detail={
              unverified
                ? "Open the verification email from We Know English, then return to this invitation."
                : "The invitation may have expired, been cancelled, or been sent to another email address. Sign in using the exact invited address or ask the teacher for a new invitation."
            }
          >
            <p className="mt-4 text-sm text-slate-500">Signed in as {user.email ?? "this account"}</p>
            <ParentAccountSwitchButton />
          </StateCard>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <GuardianInvitationAcceptCard
          token={token}
          studentName={preview.studentName}
          relationshipType={preview.relationshipType}
          expiresAt={preview.expiresAt}
          signedInEmail={user.email ?? "Verified account"}
        />
      </div>
    </main>
  );
}
