import { redirect } from "next/navigation";
import { PortalLoginPanel, type PortalKind } from "@/components/auth/PortalLoginPanel";
import {
  resolveLandingRedirectPath,
  resolvePostLoginPath,
} from "@/lib/auth/post-login-path";
import { getAppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{
    portal?: string;
    next?: string;
    error?: string;
    message?: string;
  }>;
};

function firstParam(v: string | undefined): string {
  return v?.trim() ?? "";
}

export default async function LoginPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = getAppRole(user);
  if (role) {
    redirect(
      resolvePostLoginPath({
        role,
        next: firstParam(sp.next) || null,
      }),
    );
  }

  const portalRaw = firstParam(sp.portal);
  const defaultPortal: PortalKind =
    portalRaw === "teacher" ? "teacher" : "student";

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border-4 border-kid-ink bg-[#fff8eb] p-6 shadow-lg">
        <h1 className="text-2xl font-extrabold text-kid-ink">We Know English</h1>
        <p className="mt-2 text-sm font-semibold text-kid-ink/85">
          One place to sign in — students and teachers go to the right home automatically.
        </p>
        <PortalLoginPanel
          defaultPortal={defaultPortal}
          nextPath={firstParam(sp.next) || undefined}
          initialError={firstParam(sp.error) || undefined}
          initialMessage={firstParam(sp.message) || undefined}
          className="mt-4"
        />
      </div>
    </div>
  );
}
