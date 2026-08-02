"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ParentLinkedStudent } from "@/lib/parent/guardian-data";

function currentSection(pathname: string): "stream" | "progress" {
  return pathname.endsWith("/progress") ? "progress" : "stream";
}

export function ParentStudentSelector(props: {
  students: ParentLinkedStudent[];
  selectedStudentId: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  if (props.students.length === 0) return null;

  return (
    <label className="block min-w-0 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
      Child
      <select
        aria-label="Choose a child"
        value={props.selectedStudentId ?? props.students[0]?.studentId ?? ""}
        onChange={(event) => {
          const studentId = event.target.value;
          if (!studentId) return;
          router.push(`/parent/students/${studentId}/${currentSection(pathname)}`);
        }}
        className="mt-1 block w-full max-w-xs rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-950 shadow-sm"
      >
        {props.students.map((student) => (
          <option key={student.studentId} value={student.studentId}>
            {student.displayName}
          </option>
        ))}
      </select>
    </label>
  );
}
