import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalLoginPanel } from "@/components/auth/PortalLoginPanel";
import {
  resolveLandingRedirectPath,
  resolvePostLoginPath,
  STUDENT_SECONDARY_DEFAULT_PATH,
} from "@/lib/auth/post-login-path";
import { getAppRole } from "@/lib/auth/roles";
import { isSecondaryEligibleBand } from "@/lib/auth/student-bands";
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

export default async function SecondaryLoginPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = getAppRole(user);
  if (role === "teacher") {
    redirect(resolveLandingRedirectPath(user) ?? "/teacher/courses");
  }
  if (role === "student") {
    const learningBand =
      typeof user?.user_metadata?.learning_band === "string"
        ? user.user_metadata.learning_band
        : null;
    if (isSecondaryEligibleBand(learningBand)) {
      redirect(
        resolvePostLoginPath({
          role: "student",
          learningBand,
          next: firstParam(sp.next) || STUDENT_SECONDARY_DEFAULT_PATH,
        }),
      );
    }
    redirect(resolveLandingRedirectPath(user) ?? "/home");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border-4 border-kid-ink bg-[#fff8eb] p-6 shadow-lg">
        <p className="text-xs font-extrabold uppercase tracking-wide text-[#1d4ed8]">
          Secondary
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-kid-ink">Vocabulary login</h1>
        <p className="mt-2 text-sm font-semibold text-kid-ink/85">
          Sign in or create a Secondary account for lower-secondary vocabulary practice.
        </p>
        <PortalLoginPanel
          learningBand="a2"
          studentOnly
          nextPath={firstParam(sp.next) || STUDENT_SECONDARY_DEFAULT_PATH}
          initialError={firstParam(sp.error) || undefined}
          initialMessage={firstParam(sp.message) || undefined}
          className="mt-4"
        />
        <p className="mt-4 text-center text-xs font-semibold text-kid-ink/70">
          Looking for Primary?{" "}
          <Link href="/" className="underline">
            Back to path picker
          </Link>
        </p>
      </div>
    </div>
  );
}
