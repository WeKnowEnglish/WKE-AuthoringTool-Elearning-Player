"use client";

import { useState } from "react";
import { StudentClassSelectorOverlay } from "@/components/student-hub/StudentClassSelectorOverlay";
import type { StudentClassMembership } from "@/lib/data/student-classes";

type Props = {
  currentClass: StudentClassMembership;
  memberships: StudentClassMembership[];
  tone: "primary" | "secondary";
};

/** Opens the shared class picker from within a private student classroom. */
export function ClassroomClassSwitcher({ currentClass, memberships, tone }: Props) {
  const [open, setOpen] = useState(false);
  const isSecondary = tone === "secondary";
  const label = currentClass.joinCode || "Classes";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex min-h-10 shrink-0 items-center rounded-xl border px-3 font-mono text-xs font-extrabold tracking-wider transition [touch-action:manipulation] sm:text-sm ${
          isSecondary
            ? "border-sec-border bg-sec-panel-muted text-sec-ink hover:bg-white"
            : "border-[var(--pl-border)] bg-[var(--pl-bg)] text-[var(--pl-ink)] hover:bg-white"
        }`}
        aria-label={`Class ${label}. Switch or join a class.`}
        title="Switch or join a class"
      >
        {label}
      </button>

      <StudentClassSelectorOverlay
        open={open}
        onClose={() => setOpen(false)}
        memberships={memberships}
      />
    </>
  );
}
