import Link from "next/link";
import { BookOpen, ClipboardList, Play } from "lucide-react";
import { CLASS_HOMEWORK_PAYLOAD_LABELS } from "@/lib/class-homework/types";
import type { StudentHomeworkCard } from "@/lib/class-homework/types";

const HERO_LIMIT = 5;

type Props = {
  enrolled: boolean;
  items: StudentHomeworkCard[];
};

function formatDue(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function sortOpenAssignments(items: StudentHomeworkCard[]) {
  return items
    .filter((item) => item.status === "assigned")
    .slice()
    .sort((a, b) => {
      const aDone = a.completedAt ? 1 : 0;
      const bDone = b.completedAt ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;
      return 0;
    });
}

/**
 * Home · Today’s Learning — Product C (teacher assignments).
 * @see docs/primary/PRIMARY_VOCAB_ACTIVITY_CONTRACT.md
 */
export function TodaysLearningAssignments({ enrolled, items }: Props) {
  const openItems = sortOpenAssignments(items);
  const visible = openItems.slice(0, HERO_LIMIT);
  const nextIncomplete = openItems.find((item) => !item.completedAt) ?? null;

  return (
    <section
      aria-labelledby="todays-learning-heading"
      className="overflow-hidden rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] p-4 shadow-sm sm:p-6"
    >
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--pl-purple)]">
        Today&apos;s Learning
      </p>

      {!enrolled ? (
        <div className="mt-4 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-[var(--pl-purple-soft)] text-[var(--pl-purple)]"
            aria-hidden
          >
            <BookOpen className="h-10 w-10" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <h1
              id="todays-learning-heading"
              className="text-2xl font-extrabold tracking-tight text-[var(--pl-ink)] sm:text-3xl"
            >
              Self-study coming soon
            </h1>
            <p className="mt-2 text-sm font-semibold text-[var(--pl-muted)] sm:text-base">
              Join a class to get assignments from your teacher. Self-study units will
              be ready here later.
            </p>
          </div>
        </div>
      ) : openItems.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-[var(--pl-purple-soft)] text-[var(--pl-purple)]"
            aria-hidden
          >
            <ClipboardList className="h-10 w-10" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <h1
              id="todays-learning-heading"
              className="text-2xl font-extrabold tracking-tight text-[var(--pl-ink)] sm:text-3xl"
            >
              No assignments right now
            </h1>
            <p className="mt-2 text-sm font-semibold text-[var(--pl-muted)] sm:text-base">
              When your teacher sends work, it will show up here.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1
                id="todays-learning-heading"
                className="text-2xl font-extrabold tracking-tight text-[var(--pl-ink)] sm:text-3xl"
              >
                Your assignments
              </h1>
              <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)]">
                {openItems.length === 1
                  ? "1 assignment from your teacher"
                  : `${openItems.length} assignments from your teacher`}
              </p>
            </div>
            {nextIncomplete ? (
              <Link
                href={`/primary/homework/${nextIncomplete.id}`}
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[var(--pl-teal)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--pl-teal-hover)] active:scale-[0.98]"
              >
                Start next
                <Play className="h-4 w-4 fill-current" />
              </Link>
            ) : null}
          </div>

          <ul className="space-y-2">
            {visible.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/primary/homework/${item.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--pl-border)] bg-white px-3 py-2.5 transition hover:border-[var(--pl-purple)]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-extrabold text-[var(--pl-ink)]">
                        {item.title}
                      </p>
                      {item.completedAt ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-900">
                          Done
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-[var(--pl-muted)]">
                      {item.classTitle} · {CLASS_HOMEWORK_PAYLOAD_LABELS[item.payload.type]}{" "}
                      · {formatDue(item.dueAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-extrabold text-[var(--pl-purple)]">
                    Open →
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {openItems.length > HERO_LIMIT ? (
            <p className="text-xs font-semibold text-[var(--pl-muted)]">
              +{openItems.length - HERO_LIMIT} more assigned
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
