"use client";

import Link from "next/link";
import { useTransition } from "react";
import { removeStudentFromClass } from "@/lib/actions/teacher-classes";
import type { ClassRosterStudent } from "@/lib/data/teacher-classes";
import { formatRelativeDate } from "@/lib/mastery/teacher-mastery-display";
import type { TeacherClassStudentMasteryPreview } from "@/lib/mastery/teacher-mastery-summary";

type Props = {
  classId: string;
  students: ClassRosterStudent[];
  masteryByStudentId: Record<string, TeacherClassStudentMasteryPreview>;
};

function formatBand(band: string | null): string {
  if (!band) return "—";
  return band.toUpperCase();
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : iso;
}

export function ClassRosterTable({ classId, students, masteryByStudentId }: Props) {
  const [isPending, startTransition] = useTransition();

  const removeStudent = (studentId: string, displayName: string) => {
    if (!window.confirm(`Remove ${displayName} from this class?`)) return;
    startTransition(async () => {
      const result = await removeStudentFromClass(classId, studentId);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      window.location.reload();
    });
  };

  return (
    <div className="overflow-x-auto rounded border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b bg-neutral-50 text-neutral-700">
          <tr>
            <th className="px-4 py-3 font-semibold">Student</th>
            <th className="px-4 py-3 font-semibold">Username</th>
            <th className="px-4 py-3 font-semibold">Band</th>
            <th className="px-4 py-3 font-semibold">Enrolled</th>
            <th className="px-4 py-3 font-semibold">Signals</th>
            <th className="px-4 py-3 font-semibold">Last active</th>
            <th className="px-4 py-3 font-semibold">Progress</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-neutral-600">
                No students yet. Share the join code so students can enroll.
              </td>
            </tr>
          ) : (
            students.map((student) => {
              const mastery = masteryByStudentId[student.studentId];
              const dueCount = mastery?.dueReviewCount ?? 0;
              const weakCount = mastery?.weakWordCount ?? 0;
              const progressHref = `/teacher/classes/${classId}/students/${student.studentId}`;

              return (
                <tr
                  key={student.studentId}
                  className={`border-b last:border-b-0 ${dueCount > 0 ? "bg-amber-50/60" : ""}`}
                >
                  <td className="px-4 py-3 font-medium">
                    <Link href={progressHref} className="text-blue-700 underline">
                      {student.displayName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{student.username}</td>
                  <td className="px-4 py-3">{formatBand(student.learningBand)}</td>
                  <td className="px-4 py-3 text-neutral-600">{formatDate(student.enrolledAt)}</td>
                  <td className="px-4 py-3">
                    {mastery && mastery.recordCount > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {dueCount > 0 && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                            {dueCount} due
                          </span>
                        )}
                        {weakCount > 0 && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-900">
                            {weakCount} weak
                          </span>
                        )}
                        {dueCount === 0 && weakCount === 0 && (
                          <span className="text-xs text-neutral-500">On track</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-500">No data</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {formatRelativeDate(mastery?.latestUpdatedAt ?? null)}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={progressHref} className="text-sm font-semibold text-blue-700 underline">
                      View progress
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => removeStudent(student.studentId, student.displayName)}
                      className="text-sm font-semibold text-red-700 underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
