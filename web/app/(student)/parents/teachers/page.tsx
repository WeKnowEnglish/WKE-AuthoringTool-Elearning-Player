import type { Metadata } from "next";
import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { listTeachersAcceptingTrials } from "@/lib/data/trial-teachers";
import { buildPublicMetadata } from "@/lib/seo/build-metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Find a teacher | Parents | We Know English",
  description:
    "Browse We Know English teachers who are accepting trial bookings for families.",
  pathname: "/parents/teachers",
});

export default async function ParentsTeachersDirectoryPage() {
  const teachers = await listTeachersAcceptingTrials();

  return (
    <div className="min-h-dvh bg-[var(--landing-page-bg)] text-kid-ink">
      <LandingHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--landing-primary-title)]">
          Parents
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Teachers accepting trials
        </h1>
        <p className="mt-3 max-w-2xl text-base font-semibold text-[var(--landing-body-muted)]">
          Sign in as a parent, then book an open time. You can request a trial before your child
          has a student account.
        </p>

        {teachers.length === 0 ? (
          <p className="mt-10 rounded-2xl border-2 border-dashed border-kid-ink/20 bg-white p-8 text-center text-sm font-semibold text-kid-ink/70">
            No teachers are listed for trials yet. Check back soon, or{" "}
            <Link href="/contact" className="font-extrabold underline">
              contact us
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map((teacher) => (
              <li
                key={teacher.handle}
                className="flex flex-col rounded-2xl border-2 border-kid-ink/15 bg-white p-5 shadow-[3px_3px_0_0_var(--kid-shadow)]"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-kid-ink/50">
                  @{teacher.handle}
                </p>
                <h2 className="mt-1 text-xl font-extrabold">{teacher.title}</h2>
                {teacher.bio ? (
                  <p className="mt-2 line-clamp-3 flex-1 text-sm font-semibold text-kid-ink/70">
                    {teacher.bio}
                  </p>
                ) : (
                  <p className="mt-2 flex-1 text-sm font-semibold text-kid-ink/50">
                    Trial and placement chats available.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/parent/login?next=${encodeURIComponent(`/parent/book-trial/wke/${teacher.handle}`)}`}
                    className="inline-flex rounded-lg border-2 border-kid-ink bg-kid-ink px-3 py-2 text-xs font-extrabold text-white"
                  >
                    Book a trial
                  </Link>
                  <Link
                    href={`/wke/${teacher.handle}`}
                    className="inline-flex rounded-lg border-2 border-kid-ink/25 bg-white px-3 py-2 text-xs font-extrabold text-kid-ink"
                  >
                    View classroom
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-10 text-sm font-semibold text-kid-ink/60">
          <Link href="/parents" className="font-extrabold underline">
            ← Back to parents
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
