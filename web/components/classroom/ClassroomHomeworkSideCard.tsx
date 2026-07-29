import Link from "next/link";
import { CheckCircle2, ClipboardList } from "lucide-react";
import {
  CLASS_HOMEWORK_PAYLOAD_LABELS,
  type StudentHomeworkCard,
} from "@/lib/class-homework/types";

type Props = {
  items: StudentHomeworkCard[];
  homeworkBasePath: "/primary" | "/secondary";
  tone?: "primary" | "secondary";
};

function formatDue(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function sortRecentPublished(items: StudentHomeworkCard[]): StudentHomeworkCard[] {
  return [...items].sort((a, b) => {
    const aTime = a.assignedAt ?? "";
    const bTime = b.assignedAt ?? "";
    if (aTime !== bTime) return bTime.localeCompare(aTime);
    return b.id.localeCompare(a.id);
  });
}

export function ClassroomHomeworkSideCard({
  items,
  homeworkBasePath,
  tone = "primary",
}: Props) {
  const isSecondary = tone === "secondary";
  const shell = isSecondary
    ? "rounded-xl border border-sec-border bg-sec-card"
    : "rounded-[1.5rem] border border-[var(--pl-border)] bg-white shadow-sm";
  const ink = isSecondary ? "text-sec-ink" : "text-[var(--pl-ink)]";
  const muted = isSecondary ? "text-sec-muted" : "text-[var(--pl-muted)]";
  const accent = isSecondary ? "text-sec-accent" : "text-[var(--pl-purple)]";
  const recent = sortRecentPublished(items).slice(0, 5);

  return (
    <section className={`${shell} p-3.5 sm:p-4`} aria-label="Homework">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isSecondary
              ? "bg-sec-panel-muted text-sec-accent"
              : "bg-[var(--pl-teal)]/15 text-[var(--pl-teal)]"
          }`}
        >
          <ClipboardList className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className={`text-sm font-extrabold ${ink}`}>Homework</p>
          <p className={`text-[11px] font-semibold ${muted}`}>Most recent</p>
        </div>
      </div>

      {recent.length === 0 ? (
        <p className={`mt-3 text-xs font-semibold leading-snug ${muted}`}>
          No homework published yet. When your teacher assigns work, it will show up here.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {recent.map((item) => {
            const due = formatDue(item.dueAt);
            const done = Boolean(item.completedAt);
            const kindLabel =
              CLASS_HOMEWORK_PAYLOAD_LABELS[item.payload.type] ?? "Homework";
            return (
              <li key={item.id}>
                <Link
                  href={`${homeworkBasePath}/homework/${encodeURIComponent(item.id)}`}
                  className={`block rounded-xl border px-3 py-2.5 transition ${
                    isSecondary
                      ? "border-sec-border bg-sec-panel-muted/60 hover:border-sec-accent"
                      : "border-[var(--pl-border)] bg-[var(--pl-bg)] hover:border-[var(--pl-purple)]"
                  }`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className={`min-w-0 text-sm font-extrabold leading-snug ${ink}`}>
                      {item.title}
                    </span>
                    {done ? (
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                        aria-label="Done"
                      />
                    ) : null}
                  </span>
                  <span className={`mt-1 block text-[11px] font-semibold ${muted}`}>
                    {kindLabel}
                    {due ? ` · Due ${due}` : ""}
                    {item.status === "closed" ? " · Closed" : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href={homeworkBasePath}
        className={`mt-3 inline-flex text-xs font-extrabold ${accent} hover:underline`}
      >
        See all homework
      </Link>
    </section>
  );
}
