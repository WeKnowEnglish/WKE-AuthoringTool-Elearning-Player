import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalLoginPanel } from "@/components/auth/PortalLoginPanel";
import {
  resolveLandingRedirectPath,
  resolvePostLoginPath,
} from "@/lib/auth/post-login-path";
import { getAppRole, STUDENT_DEFAULT_PATH } from "@/lib/auth/roles";
import { isSecondaryEligibleBand } from "@/lib/auth/student-bands";
import { STUDENT_SECONDARY_LOGIN_PATH } from "@/lib/auth/student-login";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{
    next?: string;
    error?: string;
    message?: string;
  }>;
};

function firstParam(v: string | undefined): string {
  return v?.trim() ?? "";
}

export default async function PrimaryLoginPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = getAppRole(user);
  if (role === "teacher") {
    redirect(resolveLandingRedirectPath(user) ?? "/teacher/classes");
  }
  if (role === "student") {
    const learningBand =
      typeof user?.user_metadata?.learning_band === "string"
        ? user.user_metadata.learning_band
        : null;
    if (isSecondaryEligibleBand(learningBand)) {
      redirect(resolveLandingRedirectPath(user) ?? "/secondary");
    }
    redirect(
      resolvePostLoginPath({
        role: "student",
        learningBand,
        next: firstParam(sp.next) || STUDENT_DEFAULT_PATH,
      }),
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border-4 border-kid-ink bg-[#fff8eb] p-6 shadow-lg">
        <p className="text-xs font-extrabold uppercase tracking-wide text-[#765600]">
          Primary
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-kid-ink">Primary student login</h1>
        <p className="mt-2 text-sm font-semibold text-kid-ink/85">
          Sign in or create a Primary account for games, words, stories, and class activities.
        </p>
        <PortalLoginPanel
          learningBand="a1"
          studentOnly
          nextPath={firstParam(sp.next) || STUDENT_DEFAULT_PATH}
          initialError={firstParam(sp.error) || undefined}
          initialMessage={firstParam(sp.message) || undefined}
          className="mt-4"
        />
        <p className="mt-4 text-center text-xs font-semibold text-kid-ink/70">
          Looking for Secondary?{" "}
          <Link href={STUDENT_SECONDARY_LOGIN_PATH} className="underline">
            Secondary student login
          </Link>
        </p>
      </div>
    </div>
  );
}
