import Link from "next/link";
import type { PublicTrialTimeGroup } from "@/lib/class-schedule/trial-format";

type Props = {
  handle: string;
  groups: PublicTrialTimeGroup[];
  timezoneLabel: string | null;
};

export function WallTrialSchedule({ handle, groups, timezoneLabel }: Props) {
  if (!groups.length) return null;
  const bookHref = `/parent/login?next=${encodeURIComponent(`/parent/book-trial/wke/${handle}`)}`;

  return (
    <section
      id="trial-times"
      aria-labelledby="trial-times-heading"
      className="mx-auto max-w-5xl scroll-mt-6 px-5 pt-10 sm:px-8"
    >
      <div className="rounded-3xl border border-black/10 bg-[var(--classroom-panel)] px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="trial-times-heading"
              className="text-2xl font-extrabold text-[var(--classroom-ink)]"
            >
              Trial times
            </h2>
            <p className="mt-1 max-w-xl text-sm font-medium text-[var(--classroom-muted)]">
              Open times for a trial or placement chat. Sign in as a parent to request one.
            </p>
          </div>
          <Link
            href={bookHref}
            className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-extrabold shadow-sm transition hover:brightness-105"
            style={{
              background: "var(--classroom-cta)",
              color: "var(--classroom-cta-ink)",
            }}
          >
            Book a trial
          </Link>
        </div>

        <div className="mt-5 space-y-4">
          {groups.map((group) => (
            <div key={group.dayKey}>
              <h3 className="text-sm font-extrabold text-[var(--classroom-ink)]">
                {group.dayLabel}
                {timezoneLabel ? null : (
                  <span className="ml-2 font-semibold text-[var(--classroom-muted)]">
                    {group.timezone}
                  </span>
                )}
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {group.slots.map((slot) => (
                  <li key={slot.startsAt}>
                    <span className="inline-flex rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-sm font-bold text-[var(--classroom-ink)]">
                      {slot.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {timezoneLabel ? (
          <p className="mt-4 text-xs font-semibold text-[var(--classroom-muted)]">
            Times in {timezoneLabel}
          </p>
        ) : null}
      </div>
    </section>
  );
}
