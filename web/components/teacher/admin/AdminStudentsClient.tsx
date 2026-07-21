"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resetStudentPin, searchStudentsForAdmin } from "@/lib/actions/admin-users";
import type { AdminStudentSummary } from "@/lib/data/admin-users";

export function AdminStudentsClient() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<AdminStudentSummary[]>([]);
  const [searched, setSearched] = useState(false);
  const [pinById, setPinById] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const search = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await searchStudentsForAdmin(query);
      setSearched(true);
      if (!result.ok) {
        setError(result.error);
        setStudents([]);
        return;
      }
      setStudents(result.students);
    });
  };

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
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search username or display name"
          className="min-w-[16rem] flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? "Searching…" : "Search"}
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950" role="status">
          {message}
        </p>
      ) : null}

      {searched && students.length === 0 && !error ? (
        <p className="text-sm text-neutral-600">No students matched.</p>
      ) : null}

      {students.length > 0 ? (
        <ul className="space-y-3">
          {students.map((student) => (
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
      ) : null}
    </div>
  );
}
