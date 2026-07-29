"use client";

import Link from "next/link";
import { ClipboardList, Play, Users } from "lucide-react";
import { StudentHomeGreeting } from "@/components/primary/StudentHomeGreeting";
import { CLASS_HOMEWORK_PAYLOAD_LABELS } from "@/lib/class-homework/types";
import type { StudentHomeworkCard } from "@/lib/class-homework/types";

const HERO_LIMIT = 5;

type Props = {
  enrolled: boolean;
  items: StudentHomeworkCard[];
  tone?: "primary" | "secondary";
  homeworkPathPrefix?: string;
  /** Opens join-class flow when the student is not enrolled. */
  onJoinClass?: () => void;
  /** Fallback join link when `onJoinClass` is not provided. */
  joinHref?: string;
};

function toneClasses(tone: "primary" | "secondary") {
  if (tone === "secondary") {
    return {
      section:
        "overflow-hidden rounded-xl border border-sec-border bg-sec-card p-4 sm:p-5",
      label: "text-xs font-extrabold uppercase tracking-wide text-sec-muted",
      heading: "text-2xl font-extrabold tracking-tight text-sec-ink sm:text-3xl",
      muted: "text-sm font-semibold text-sec-muted sm:text-base",
      iconWrap:
        "flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-sec-border bg-sec-panel-muted text-sec-ink",
      card: "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sec-border bg-white px-3 py-2.5 transition hover:border-sec-accent",
      cardTitle: "truncate font-extrabold text-sec-ink",
      cardMeta: "mt-0.5 text-xs font-semibold text-sec-muted",
      cardLink: "shrink-0 text-sm font-extrabold text-sec-accent",
      cta: "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg border border-sec-accent bg-sec-accent px-5 text-sm font-extrabold text-white transition hover:bg-sec-accent-hover active:scale-[0.98]",
    };
  }
  return {
    section:
      "overflow-hidden rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] p-4 shadow-sm sm:p-6",
    label: "text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--pl-purple)]",
    heading: "text-2xl font-extrabold tracking-tight text-[var(--pl-ink)] sm:text-3xl",
    muted: "text-sm font-semibold text-[var(--pl-muted)] sm:text-base",
    iconWrap:
      "flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-[var(--pl-purple-soft)] text-[var(--pl-purple)]",
    card: "flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--pl-border)] bg-white px-3 py-2.5 transition hover:border-[var(--pl-purple)]",
    cardTitle: "truncate font-extrabold text-[var(--pl-ink)]",
    cardMeta: "mt-0.5 text-xs font-semibold text-[var(--pl-muted)]",
    cardLink: "shrink-0 text-sm font-extrabold text-[var(--pl-purple)]",
    cta: "inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[var(--pl-teal)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--pl-teal-hover)] active:scale-[0.98]",
  };
}

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
 * Home · Today's Learning — teacher homework inbox for Primary and Secondary.
 * @see docs/primary/PRIMARY_VOCAB_ACTIVITY_CONTRACT.md
 */
export function TodaysLearningAssignments({
  enrolled,
  items,
  tone = "primary",
  homeworkPathPrefix = "/primary/homework",
  onJoinClass,
  joinHref = "/join-class",
}: Props) {
  const ui = toneClasses(tone);
  const openItems = sortOpenAssignments(items);
  const visible = openItems.slice(0, HERO_LIMIT);
  const nextIncomplete = openItems.find((item) => !item.completedAt) ?? null;

  return (
    <section aria-labelledby="todays-learning-heading" className={ui.section}>
      <p className={ui.label}>Today&apos;s Learning</p>

      {!enrolled ? (
        <div className="mt-4 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
          <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className={ui.iconWrap} aria-hidden>
              <Users className="h-10 w-10" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <h1 id="todays-learning-heading" className={ui.heading}>
                Join Class
              </h1>
              <p className={`mt-2 ${ui.muted}`}>
                Enter your teacher&apos;s class code to get assignments and class updates.
              </p>
            </div>
          </div>
          {onJoinClass ? (
            <button type="button" onClick={onJoinClass} className={ui.cta}>
              Join Class
            </button>
          ) : (
            <Link href={joinHref} className={ui.cta}>
              Join Class
            </Link>
          )}
        </div>
      ) : openItems.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <div className={ui.iconWrap} aria-hidden>
            <ClipboardList className="h-10 w-10" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <StudentHomeGreeting id="todays-learning-heading" className={ui.heading} />
            <p className={`mt-2 ${ui.muted}`}>
              No assignments right now. When your teacher sends work, it will show up here.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <StudentHomeGreeting id="todays-learning-heading" className={ui.heading} />
              <p className={`mt-1 ${ui.muted}`}>
                {openItems.length === 1
                  ? "1 assignment from your teacher"
                  : `${openItems.length} assignments from your teacher`}
              </p>
            </div>
            {nextIncomplete ? (
              <Link href={`${homeworkPathPrefix}/${nextIncomplete.id}`} className={ui.cta}>
                Start next
                <Play className="h-4 w-4 fill-current" />
              </Link>
            ) : null}
          </div>

          <ul className="space-y-2">
            {visible.map((item) => (
              <li key={item.id}>
                <Link href={`${homeworkPathPrefix}/${item.id}`} className={ui.card}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={ui.cardTitle}>{item.title}</p>
                      {item.completedAt ? (
                        <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-900">
                          Done
                        </span>
                      ) : null}
                    </div>
                    <p className={ui.cardMeta}>
                      {item.classTitle} · {CLASS_HOMEWORK_PAYLOAD_LABELS[item.payload.type]} ·{" "}
                      {formatDue(item.dueAt)}
                    </p>
                  </div>
                  <span className={ui.cardLink}>Open →</span>
                </Link>
              </li>
            ))}
          </ul>

          {openItems.length > HERO_LIMIT ? (
            <p className={`text-xs font-semibold ${ui.muted}`}>
              +{openItems.length - HERO_LIMIT} more assigned
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
