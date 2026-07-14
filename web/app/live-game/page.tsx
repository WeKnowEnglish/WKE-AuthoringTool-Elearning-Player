import Link from "next/link";
import { LiveGameLandingShell } from "@/components/live-game/LiveGameLandingShell";
import { getAppRole } from "@/lib/auth/roles";
import { ENGLISH_CRAFT_MODE } from "@/lib/live-game/modes/english-craft/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ notice?: string }>;
};

export default async function LiveGamePage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = getAppRole(user);
  const notice = (await searchParams)?.notice;
  const canHost = role === "teacher";
  const hostRequiresTeacher = user != null && !canHost;

  return (
    <LiveGameLandingShell
      eyebrow="Play together"
      title="English practice becomes an adventure."
      description={`Work as a team in ${ENGLISH_CRAFT_MODE.title}: collect resources, answer English questions, and build your way to victory.`}
      backHref="/"
      backLabel="We Know English home"
    >
      {notice === "teacher_only" ?
        <p role="alert" className="rounded-xl border-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">
          Hosting is available to teacher accounts. Students can join a teacher&apos;s game below.
        </p>
      : null}
      <section className="rounded-2xl border-2 border-kid-ink/15 bg-kid-cta/25 p-4">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-kid-accent">
          For teachers
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-kid-ink">
          Start the classroom adventure
        </h2>
        <p className="mt-1 text-sm font-semibold text-kid-ink/70">
          Choose questions, create a room, and share the join code.
        </p>
        {hostRequiresTeacher ?
          <div
            aria-disabled="true"
            className="mt-4 block cursor-not-allowed rounded-xl border-4 border-kid-ink/35 bg-slate-200 px-4 py-3 text-center text-lg font-extrabold text-kid-ink/55 shadow-none"
          >
            Teacher accounts only
          </div>
        : <Link
            href="/live-game/host"
            className="mt-4 block rounded-xl border-4 border-kid-ink bg-kid-cta px-4 py-3 text-center text-lg font-extrabold text-kid-ink shadow-[3px_3px_0_0_var(--kid-shadow)] transition-transform active:scale-[0.97]"
          >
            Host a live game
          </Link>}
        {hostRequiresTeacher ?
          <p className="mt-2 text-sm font-semibold text-kid-ink/70">
            You are signed in as a student, so hosting is unavailable.
          </p>
        : null}
      </section>

      <section className="rounded-2xl border-2 border-kid-ink/15 bg-kid-surface/45 p-4">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
          For students
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-kid-ink">
          Join your teacher&apos;s game
        </h2>
        <p className="mt-1 text-sm font-semibold text-kid-ink/70">
          Enter the six-character code. No student account is required.
        </p>
        <Link
          href="/live-game/join"
          className="mt-4 block rounded-xl border-4 border-kid-ink bg-white px-4 py-3 text-center text-lg font-extrabold text-kid-ink shadow-[3px_3px_0_0_var(--kid-shadow)] transition-transform active:scale-[0.97]"
        >
          Join with a code
        </Link>
      </section>
    </LiveGameLandingShell>
  );
}
