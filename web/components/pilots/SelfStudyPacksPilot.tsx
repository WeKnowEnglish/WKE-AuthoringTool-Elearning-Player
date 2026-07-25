"use client";

import Link from "next/link";
import {
  PRIMARY_CHROME_CLASS,
  PRIMARY_CHROME_STYLE,
} from "@/lib/primary/primary-chrome";
import {
  listSelfStudyPacks,
  SELF_STUDY_LESSON_SLOTS,
  type SelfStudyPackStatus,
  type SelfStudyPackSummary,
} from "@/lib/self-study-packs";

function statusLabel(status: SelfStudyPackStatus): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "draft":
      return "In progress";
    default:
      return "Planned";
  }
}

function statusClass(status: SelfStudyPackStatus): string {
  switch (status) {
    case "ready":
      return "bg-[var(--pl-success)]/15 text-[var(--pl-teal)]";
    case "draft":
      return "bg-[var(--pl-purple-soft)] text-[var(--pl-purple)]";
    default:
      return "bg-[var(--pl-bg)] text-[var(--pl-muted)]";
  }
}

function PackRow({ pack }: { pack: SelfStudyPackSummary }) {
  return (
    <li>
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-card)] p-4 shadow-sm sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-xl bg-[var(--pl-purple-soft)] sm:aspect-square sm:h-24 sm:w-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pack.coverImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold tracking-tight text-[var(--pl-ink)]">
              {pack.title}
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${statusClass(pack.status)}`}
            >
              {statusLabel(pack.status)}
            </span>
            <span className="rounded-full bg-[var(--pl-bg)] px-2.5 py-0.5 text-[11px] font-extrabold text-[var(--pl-muted)]">
              {pack.levelLabel}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)]">
            {pack.subtitle}
          </p>
          <p className="mt-2 text-xs font-semibold text-[var(--pl-ink)]/80">
            {pack.lessonCount} lessons · {pack.buildNote}
          </p>
        </div>

        <div className="shrink-0 sm:self-center">
          <span className="inline-flex rounded-xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-3 py-2 text-xs font-extrabold text-[var(--pl-muted)]">
            Open soon
          </span>
        </div>
      </div>
    </li>
  );
}

/**
 * Pilot shell: catalog of 8-lesson Self Study packs.
 * Lesson players / pack detail routes come next.
 */
export function SelfStudyPacksPilot() {
  const packs = listSelfStudyPacks();

  return (
    <div
      className={`min-h-dvh bg-[var(--pl-bg)] ${PRIMARY_CHROME_CLASS}`}
      style={PRIMARY_CHROME_STYLE}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 pb-10 sm:p-6">
        <header className="rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] p-5 shadow-sm sm:p-6">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--pl-purple)]">
            Pilot · Self Study packs
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Self Study
          </h1>
          <p className="mt-2 text-sm font-semibold text-[var(--pl-muted)]">
            Catalog shell for 8-lesson packs. V1 playable tracks now compile in
            Studio Learning tracks (start with Our favorite hobbies · Day 1).
          </p>
          <p className="mt-3 text-xs font-semibold text-[var(--pl-muted)]">
            <Link href="/primary" className="text-[var(--pl-teal)] underline-offset-2 hover:underline">
              ← Primary home
            </Link>
            {" · "}
            <Link
              href="/pilots/learning-track"
              className="text-[var(--pl-teal)] underline-offset-2 hover:underline"
            >
              Open Learning track pilot
            </Link>
            {" · "}
            <span>{packs.length} packs in catalog</span>
          </p>
        </header>

        <section
          aria-labelledby="pack-list-heading"
          className="rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] p-4 shadow-sm sm:p-6"
        >
          <h2
            id="pack-list-heading"
            className="text-lg font-extrabold tracking-tight"
          >
            Lesson packs
          </h2>
          <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)]">
            Each pack follows the same 8-lesson spine.
          </p>

          <ul className="mt-5 space-y-3">
            {packs.map((pack) => (
              <PackRow key={pack.id} pack={pack} />
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="spine-heading"
          className="rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] p-4 shadow-sm sm:p-6"
        >
          <h2 id="spine-heading" className="text-lg font-extrabold tracking-tight">
            Pack lesson spine
          </h2>
          <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)]">
            Shared format for every Self Study pack.
          </p>
          <ol className="mt-4 space-y-2">
            {SELF_STUDY_LESSON_SLOTS.map((slot) => (
              <li
                key={slot.slot}
                className="flex gap-3 rounded-xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-3 py-2.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--pl-purple-soft)] text-xs font-extrabold text-[var(--pl-purple)]">
                  {slot.slot}
                </span>
                <span className="pt-0.5 text-sm font-semibold text-[var(--pl-ink)]">
                  {slot.functionLabel}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
