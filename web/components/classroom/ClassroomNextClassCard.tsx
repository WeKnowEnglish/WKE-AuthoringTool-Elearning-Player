import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { StudentNextClassMeeting } from "@/lib/class-schedule/types";

type Props = {
  nextMeeting: StudentNextClassMeeting | null;
  scheduleHref?: string;
  tone?: "primary" | "secondary";
};

export function ClassroomNextClassCard({
  nextMeeting,
  scheduleHref,
  tone = "primary",
}: Props) {
  const isSecondary = tone === "secondary";
  const shell = isSecondary
    ? "rounded-xl border border-sec-border bg-sec-card"
    : "rounded-[1.5rem] border border-[var(--pl-border)] bg-white shadow-sm";
  const ink = isSecondary ? "text-sec-ink" : "text-[var(--pl-ink)]";
  const muted = isSecondary ? "text-sec-muted" : "text-[var(--pl-muted)]";
  const accent = isSecondary ? "text-sec-accent" : "text-[var(--pl-purple)]";

  return (
    <section className={`${shell} p-3.5 sm:p-4`} aria-label="Next class">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isSecondary
              ? "bg-sec-panel-muted text-sec-accent"
              : "bg-[var(--pl-purple-soft)] text-[var(--pl-purple)]"
          }`}
        >
          <CalendarDays className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className={`text-sm font-extrabold ${ink}`}>Next class</p>
          <p className={`text-[11px] font-semibold ${muted}`}>From your schedule</p>
        </div>
      </div>

      {nextMeeting ? (
        <p className={`mt-3 text-sm font-extrabold leading-snug ${ink}`}>
          {nextMeeting.label}
        </p>
      ) : (
        <p className={`mt-3 text-xs font-semibold leading-snug ${muted}`}>
          No upcoming class time yet. Check the Schedule tab when your teacher adds one.
        </p>
      )}

      {scheduleHref ? (
        <Link
          href={scheduleHref}
          className={`mt-3 inline-flex text-xs font-extrabold ${accent} hover:underline`}
        >
          View schedule
        </Link>
      ) : null}
    </section>
  );
}
