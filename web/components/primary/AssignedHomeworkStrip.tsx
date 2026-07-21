import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { CLASS_HOMEWORK_PAYLOAD_LABELS } from "@/lib/class-homework/types";
import type { StudentHomeworkCard } from "@/lib/class-homework/types";

type Props = {
  items: StudentHomeworkCard[];
};

function formatDue(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function AssignedHomeworkStrip({ items }: Props) {
  const openItems = items.filter((item) => item.status === "assigned");
  if (openItems.length === 0) return null;

  return (
    <section
      aria-labelledby="assigned-homework-heading"
      className="rounded-[1.75rem] border border-[var(--pl-border)] bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-[var(--pl-purple)]" aria-hidden />
        <h2
          id="assigned-homework-heading"
          className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--pl-purple)]"
        >
          Assigned
        </h2>
      </div>
      <ul className="mt-3 space-y-2">
        {openItems.slice(0, 5).map((item) => (
          <li key={item.id}>
            <Link
              href={`/primary/homework/${item.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-card)] px-3 py-2.5 transition hover:border-[var(--pl-purple)]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-extrabold text-[var(--pl-ink)]">{item.title}</p>
                  {item.completedAt ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-900">
                      Done
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs font-semibold text-[var(--pl-muted)]">
                  {item.classTitle} · {CLASS_HOMEWORK_PAYLOAD_LABELS[item.payload.type]} ·{" "}
                  {formatDue(item.dueAt)}
                </p>
              </div>
              <span className="shrink-0 text-sm font-extrabold text-[var(--pl-purple)]">
                Open →
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {openItems.length > 5 ? (
        <p className="mt-2 text-xs font-semibold text-[var(--pl-muted)]">
          +{openItems.length > 5 ? openItems.length - 5 : 0} more assigned
        </p>
      ) : null}
    </section>
  );
}
