"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { resetStudentPin } from "@/lib/actions/admin-users";
import type { AdminStudentSummary } from "@/lib/data/admin-users";

export function AdminStudentsClient({ students }: { students: AdminStudentSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pinById, setPinById] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (student) =>
        student.username.toLowerCase().includes(q) ||
        student.displayName.toLowerCase().includes(q),
    );
  }, [students, query]);

  const resetPin = (userId: string, username: string) => {
    const pin = pinById[userId]?.trim() ?? "";
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await resetStudentPin({ userId, pin });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(`PIN updated for ${username}. New PIN: ${pin}`);
      setPinById((current) => ({ ...current, [userId]: "" }));
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[16rem] flex-1 text-xs font-semibold text-neutral-600">
          Filter by username or display name
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to filter…"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
          />
        </label>
        <p className="pb-2 text-sm text-neutral-500">
          {filtered.length === students.length
            ? `${students.length} student${students.length === 1 ? "" : "s"}`
            : `${filtered.length} of ${students.length}`}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {students.length === 0 ? (
        <p className="text-sm text-neutral-600">No student accounts yet.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-neutral-600">No students matched “{query.trim()}”.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((student) => (
            <li
              key={student.userId}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-neutral-900">{student.displayName}</p>
                  <p className="font-mono text-sm text-neutral-700">@{student.username}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Band: {student.learningBand ?? "—"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-3">
                <label className="text-xs font-semibold text-neutral-600">
                  New PIN (4–6 digits)
                  <input
                    value={pinById[student.userId] ?? ""}
                    onChange={(e) =>
                      setPinById((current) => ({
                        ...current,
                        [student.userId]: e.target.value,
                      }))
                    }
                    inputMode="numeric"
                    autoComplete="off"
                    className="mt-1 block w-32 rounded border border-neutral-300 px-2 py-1.5 text-sm font-normal"
                    disabled={pending}
                  />
                </label>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => resetPin(student.userId, student.username)}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  Reset PIN
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
