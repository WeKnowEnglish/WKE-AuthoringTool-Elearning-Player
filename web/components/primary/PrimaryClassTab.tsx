"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { DoorOpen, School, Users } from "lucide-react";
import { JoinClassForm } from "@/components/student-hub/JoinClassForm";
import type { StudentClassMembership } from "@/lib/data/student-classes";
import type { StudentClassLiveSession } from "@/lib/student-live/types";
import {
  readActiveStudentClassId,
  subscribeActiveStudentClassId,
  writeActiveStudentClassId,
} from "@/lib/student-classes/active-class";
import { useRouter } from "next/navigation";

type Props = {
  memberships: StudentClassMembership[];
  liveSessions?: StudentClassLiveSession[];
  onOpenClassSelector?: () => void;
};

function formatEnrolledDate(iso: string): string {
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : iso;
}

export function PrimaryClassTab({
  memberships,
  liveSessions = [],
  onOpenClassSelector,
}: Props) {
  const router = useRouter();
  const activeClassId = useSyncExternalStore(
    subscribeActiveStudentClassId,
    readActiveStudentClassId,
    () => null,
  );

  const sorted = useMemo(
    () =>
      [...memberships].sort(
        (a, b) => Date.parse(a.enrolledAt) - Date.parse(b.enrolledAt),
      ),
    [memberships],
  );

  const activeMembership =
    (activeClassId
      ? sorted.find((membership) => membership.classId === activeClassId)
      : null) ??
    sorted[0] ??
    null;

  const liveByClass = useMemo(() => {
    const map = new Map<string, StudentClassLiveSession>();
    for (const session of liveSessions) {
      map.set(session.classId, session);
    }
    return map;
  }, [liveSessions]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-24 lg:pb-8">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Class</h1>
        <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)] sm:text-base">
          Open your classroom, switch classes, or join with a teacher code.
        </p>
      </header>

      {activeMembership ? (
        <section className="overflow-hidden rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] p-4 shadow-sm sm:p-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--pl-purple)]">
            Active class
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-extrabold text-[var(--pl-ink)]">
                {activeMembership.title}
              </h2>
              <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)]">
                Joined {formatEnrolledDate(activeMembership.enrolledAt)}
              </p>
              {liveByClass.has(activeMembership.classId) ? (
                <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-900">
                  Live now
                </p>
              ) : null}
            </div>
            <Link
              href={`/primary/class/${encodeURIComponent(activeMembership.classId)}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--pl-teal)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--pl-teal-hover)]"
            >
              <DoorOpen className="h-4 w-4" aria-hidden />
              Open classroom
            </Link>
          </div>
        </section>
      ) : null}

      <section className="rounded-[1.75rem] border border-[var(--pl-border)] bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[var(--pl-purple)]" aria-hidden />
          <h2 className="text-lg font-extrabold tracking-tight">My classes</h2>
        </div>

        {sorted.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-[var(--pl-muted)]">
            You are not in a class yet. Enter your teacher&apos;s code below.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {sorted.map((membership) => {
              const isActive = membership.classId === (activeMembership?.classId ?? null);
              const isLive = liveByClass.has(membership.classId);
              return (
                <li key={membership.classId}>
                  <div
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-3 ${
                      isActive
                        ? "border-[var(--pl-purple)] bg-[var(--pl-purple-soft)]"
                        : "border-[var(--pl-border)] bg-[var(--pl-bg)]"
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => writeActiveStudentClassId(membership.classId)}
                    >
                      <p className="truncate font-extrabold text-[var(--pl-ink)]">
                        {membership.title}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-[var(--pl-muted)]">
                        {isActive ? "Active · " : ""}
                        Joined {formatEnrolledDate(membership.enrolledAt)}
                        {isLive ? " · Live" : ""}
                      </p>
                    </button>
                    <Link
                      href={`/primary/class/${encodeURIComponent(membership.classId)}`}
                      className="shrink-0 rounded-xl border border-[var(--pl-border)] bg-white px-3 py-2 text-xs font-extrabold text-[var(--pl-purple)] hover:border-[var(--pl-purple)]"
                    >
                      Open
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {onOpenClassSelector ? (
          <button
            type="button"
            onClick={onOpenClassSelector}
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-4 text-sm font-extrabold text-[var(--pl-ink)] hover:border-[var(--pl-purple)] hover:bg-white"
          >
            <School className="h-4 w-4" aria-hidden />
            Class picker
          </button>
        ) : null}
      </section>

      <section className="rounded-[1.75rem] border border-[var(--pl-border)] bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-extrabold tracking-tight">
          {sorted.length > 0 ? "Join another class" : "Join a class"}
        </h2>
        <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)]">
          Ask your teacher for the class code.
        </p>
        <div className="mt-4">
          <JoinClassForm
            onJoined={(result) => {
              writeActiveStudentClassId(result.classId);
              router.refresh();
            }}
          />
        </div>
      </section>
    </div>
  );
}
