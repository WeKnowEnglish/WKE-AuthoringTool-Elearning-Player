import { redirect } from "next/navigation";
import { SecretRolesSessionView } from "@/components/secret-roles/SecretRolesSessionView";
import { canHostLive, isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Secret Roles teacher view",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ roundId: string }> };

export default async function TeacherSecretRolesPage({ params }: Props) {
  const { roundId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isTeacher(user) || !canHostLive(user)) {
    redirect("/teacher/classes?notice=live_requires_plus");
  }
  return (
    <main className="min-h-dvh bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto h-[calc(100dvh-1.5rem)] max-w-6xl sm:h-[calc(100dvh-3rem)]">
        <SecretRolesSessionView roundId={roundId} role="host" />
      </div>
    </main>
  );
}
