"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  forceTeacherPasswordInduction,
  resendTeacherInvitationByUserId,
  setTeacherTier,
} from "@/lib/actions/admin-users";
import type { AdminTeacherSummary } from "@/lib/data/admin-users";

export function AdminTeachersClient({ teachers }: { teachers: AdminTeacherSummary[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const changeTier = (userId: string, tier: "light" | "plus") => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await setTeacherTier({ userId, tier });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(`Updated tier to ${tier}.`);
      router.refresh();
    });
  };

  const forceInduction = (userId: string) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await forceTeacherPasswordInduction({ userId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        `Induction reset for ${result.email}. Temp password: ${result.tempPassword}`,
      );
      router.refresh();
    });
  };

  const resendInvitation = (userId: string) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await resendTeacherInvitationByUserId({ userId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        `Invitation resent to ${result.email}. Temp password: ${result.tempPassword}`,
      );
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
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

      {teachers.length === 0 ? (
        <p className="text-sm text-neutral-600">No teacher accounts found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Email</th>
                <th className="px-3 py-2 font-semibold">Tier</th>
                <th className="px-3 py-2 font-semibold">Flags</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-3 py-2 font-mono text-xs sm:text-sm">{teacher.email}</td>
                  <td className="px-3 py-2 capitalize">{teacher.tier}</td>
                  <td className="px-3 py-2 text-xs text-neutral-600">
                    {teacher.isAdmin ? "admin · " : null}
                    {teacher.mustChangePassword ? "must change password" : "ready"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={pending || teacher.tier === "light"}
                        onClick={() => changeTier(teacher.id, "light")}
                        className="rounded border border-neutral-300 px-2 py-1 text-xs font-semibold disabled:opacity-40"
                      >
                        Light
                      </button>
                      <button
                        type="button"
                        disabled={pending || teacher.tier === "plus"}
                        onClick={() => changeTier(teacher.id, "plus")}
                        className="rounded border border-neutral-300 px-2 py-1 text-xs font-semibold disabled:opacity-40"
                      >
                        Plus
                      </button>
                      {teacher.mustChangePassword ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => resendInvitation(teacher.id)}
                          className="rounded border border-teal-700 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-950 disabled:opacity-40"
                        >
                          Resend invitation
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => forceInduction(teacher.id)}
                        className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-950 disabled:opacity-40"
                      >
                        Reset temp password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-neutral-500">
        <span className="font-semibold">Resend invitation</span> appears when the teacher still has
        “must change password.” It resets the temp password to 00000000 and emails your welcome
        template again.
      </p>
    </div>
  );
}
