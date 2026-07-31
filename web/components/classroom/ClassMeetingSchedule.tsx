import type { StudentClassSchedule } from "@/lib/class-schedule/types";
import { formatWeeklySlotLabel } from "@/lib/class-schedule/next-meeting";

type Props = {
  schedule: StudentClassSchedule;
  tone?: "primary" | "secondary";
};

export function ClassMeetingSchedule({ schedule, tone = "primary" }: Props) {
  const isSecondary = tone === "secondary";
  const shell = isSecondary
    ? "rounded-xl border border-sec-border bg-sec-card"
    : "rounded-[1.75rem] border border-[var(--pl-border,#e5e0f0)] bg-white shadow-sm";
  const muted = isSecondary ? "text-sec-muted" : "text-[var(--pl-muted,#64748b)]";

  const { slots, nextMeeting } = schedule;

  return (
    <section className={`${shell} p-5 sm:p-6`} aria-labelledby="classroom-schedule-heading">
      <h2 id="classroom-schedule-heading" className={`text-base font-extrabold ${isSecondary ? "text-sec-ink" : "text-neutral-900"}`}>
        Class schedule
      </h2>

      {slots.length === 0 ? (
        <p className={`mt-2 text-sm ${muted}`}>
          Your teacher has not set weekly class times yet.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {nextMeeting ? (
            <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-950">
              Next lesson: {nextMeeting.label}
            </p>
          ) : null}

          <ul className="space-y-1.5">
            {slots.map((slot) => (
              <li key={slot.id} className={`text-sm font-semibold ${isSecondary ? "text-sec-ink" : "text-neutral-900"}`}>
                {formatWeeklySlotLabel(slot)}
                <span className={`ml-2 text-xs font-medium ${muted}`}>
                  ({slot.durationMinutes} min)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
