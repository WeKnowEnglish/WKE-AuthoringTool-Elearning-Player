"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { JoinClassForm } from "@/components/student-hub/JoinClassForm";
import type { StudentClassMembership } from "@/lib/data/student-classes";
import {
  readActiveStudentClassId,
  subscribeActiveStudentClassId,
  writeActiveStudentClassId,
} from "@/lib/student-classes/active-class";

type Props = {
  open: boolean;
  onClose: () => void;
  memberships: StudentClassMembership[];
};

function formatEnrolledDate(iso: string): string {
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : iso;
}

export function StudentClassSelectorOverlay({ open, onClose, memberships }: Props) {
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

  useEffect(() => {
    if (!open || sorted.length === 0) return;
    const stored = readActiveStudentClassId();
    if (stored && sorted.some((membership) => membership.classId === stored)) return;
    writeActiveStudentClassId(sorted[0]!.classId);
  }, [open, sorted]);

  if (!open) return null;

  const selectClass = (classId: string) => {
    writeActiveStudentClassId(classId);
  };

  const handleJoined = (result: { classId: string; title: string }) => {
    writeActiveStudentClassId(result.classId);
    router.refresh();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[min(90dvh,40rem)] w-full max-w-lg overflow-y-auto rounded-2xl border-4 border-kid-ink bg-[#fff8eb] p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-class-selector-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="student-class-selector-title" className="text-xl font-extrabold text-kid-ink">
              My classes
            </h2>
            <p className="mt-1 text-sm font-semibold text-kid-ink/80">
              {sorted.length > 0 ?
                "Pick your class or join another with a teacher code."
              : "Enter your teacher's class code to get started."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close class selector"
            className="rounded border-2 border-kid-ink px-2 py-1 text-sm font-bold text-kid-ink"
          >
            X
          </button>
        </div>

        {sorted.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {sorted.map((membership) => {
              const isActive = membership.classId === activeClassId;
              return (
                <li key={membership.classId}>
                  <button
                    type="button"
                    onClick={() => selectClass(membership.classId)}
                    className={`w-full rounded-xl border-2 px-3 py-3 text-left transition-colors ${
                      isActive ?
                        "border-kid-ink bg-kid-panel"
                      : "border-kid-ink/40 bg-white hover:bg-kid-panel/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-extrabold text-kid-ink">{membership.title}</p>
                      {isActive ? (
                        <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-900">
                          Active
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-kid-ink/70">
                      Joined {formatEnrolledDate(membership.enrolledAt)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className={sorted.length > 0 ? "mt-5 border-t-2 border-kid-ink/20 pt-4" : "mt-4"}>
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-kid-ink">
            {sorted.length > 0 ? "Join another class" : "Join a class"}
          </h3>
          <div className="mt-3">
            <JoinClassForm onJoined={handleJoined} />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border-2 border-kid-ink bg-kid-panel px-4 py-2 text-sm font-bold text-kid-ink"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
