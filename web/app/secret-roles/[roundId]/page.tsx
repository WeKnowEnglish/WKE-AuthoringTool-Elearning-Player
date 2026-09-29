import { SecretRolesSessionView } from "@/components/secret-roles/SecretRolesSessionView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Secret Roles",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ roundId: string }> };

export default async function StudentSecretRolesPage({ params }: Props) {
  const { roundId } = await params;
  return (
    <main className="min-h-dvh bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto h-[calc(100dvh-1.5rem)] max-w-5xl sm:h-[calc(100dvh-3rem)]">
        <SecretRolesSessionView roundId={roundId} role="member" />
      </div>
    </main>
  );
}
