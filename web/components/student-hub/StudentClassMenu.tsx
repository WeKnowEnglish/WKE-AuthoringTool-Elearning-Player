"use client";

import { useSyncExternalStore } from "react";
import type { StudentClassMembership } from "@/lib/data/student-classes";
import {
  readActiveStudentClassId,
  subscribeActiveStudentClassId,
} from "@/lib/student-classes/active-class";

type Props = {
  memberships: StudentClassMembership[];
  onOpenClassSelector: () => void;
  className?: string;
};

function getClassMenuLabel(memberships: StudentClassMembership[], activeClassId: string | null): string {
  if (memberships.length === 0) return "Join class";

  const active =
    activeClassId ?
      memberships.find((membership) => membership.classId === activeClassId)
    : null;
  const display = active ?? memberships[0];

  if (memberships.length === 1 && display) {
    return display.title.length > 18 ? `${display.title.slice(0, 16)}…` : display.title;
  }

  if (display) {
    const shortTitle = display.title.length > 14 ? `${display.title.slice(0, 12)}…` : display.title;
    return `${shortTitle} (${memberships.length})`;
  }

  return `Classes (${memberships.length})`;
}

export function StudentClassMenu({ memberships, onOpenClassSelector, className }: Props) {
  const activeClassId = useSyncExternalStore(
    subscribeActiveStudentClassId,
    readActiveStudentClassId,
    () => null,
  );
  const label = getClassMenuLabel(memberships, activeClassId);

  return (
    <button
      type="button"
      onClick={onOpenClassSelector}
      className={className}
      title={memberships.length > 0 ? "Open class selector" : "Join a class"}
    >
      {label}
    </button>
  );
}
