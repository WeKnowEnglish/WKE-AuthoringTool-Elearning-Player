"use client";

import Link from "next/link";
import type { StudentClassLiveSession } from "@/lib/student-live/types";
import { resolveStudentClassroomPath } from "@/lib/student-classes/portal-paths";
import { ClassroomLiveNowJoin } from "@/components/classroom/ClassroomLiveNowJoin";

type Props = {
  sessions: StudentClassLiveSession[];
  tone?: "primary" | "secondary";
  learningBand?: string | null;
};

export function StudentLiveNowStrip({ sessions, tone = "primary", learningBand }: Props) {
  if (sessions.length === 0) return null;

  const isSecondary = tone === "secondary";

  return (
    <div className="space-y-3" aria-label="Live classes">
      {sessions.map((session) => (
        <div key={session.sessionId} className="space-y-2">
          <ClassroomLiveNowJoin session={session} tone={tone} compact />
          <Link
            href={resolveStudentClassroomPath(session.classId, learningBand)}
            className={`text-sm font-semibold underline underline-offset-2 ${
              isSecondary ? "text-sec-muted" : "text-[var(--pl-muted,#64748b)]"
            }`}
          >
            Open {session.classTitle}
          </Link>
        </div>
      ))}
    </div>
  );
}
