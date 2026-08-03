"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelGuardianInvitation,
  inviteGuardian,
  revokeGuardianRelationship,
} from "@/lib/actions/guardian-invitations";
import type { TeacherGuardianBundle } from "@/lib/parent/guardian-data";

type Props = {
  classId: string;
  studentId: string;
  initialBundle: TeacherGuardianBundle | null;
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : value;
}

export function GuardianConnectionsPanel({ classId, studentId, initialBundle }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [relationshipType, setRelationshipType] = useState<"parent" | "guardian">("guardian");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function run(id: string, action: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setBusyId(id);
    setMessage("");
    setError("");
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "The action could not be completed.");
        return false;
      }
      setMessage(result.message ?? "Updated.");
      router.refresh();
      return true;
    } finally {
      setBusyId(null);
    }
  }

  async function onInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const succeeded = await run("invite", () =>
      inviteGuardian({ classId, studentId, email, relationshipType }),
    );
    if (succeeded) setEmail("");
  }

  if (!initialBundle) {
    return (
      <section className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4">
        <h2 className="font-bold text-amber-950">Parents and guardians</h2>
        <p className="mt-2 text-sm text-amber-900">
          Guardian tools are not available yet. Apply migration 105 to enable secure invitations.
        </p>
      </section>
    );
  }

  const pending = initialBundle.invitations.filter((item) => item.status === "pending");
  const active = initialBundle.relationships.filter((item) => item.status === "active");

  return (
    <section className="space-y-4 rounded-xl border bg-white p-4" aria-labelledby="guardian-heading">
      <div>
        <h2 id="guardian-heading" className="text-lg font-bold text-neutral-950">
          Parents and guardians
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Invite a verified adult to the read-only parent portal. Access can be revoked at any time.
        </p>
      </div>

      <form onSubmit={onInvite} className="grid gap-3 rounded-lg bg-neutral-50 p-3 md:grid-cols-[1fr_150px_auto] md:items-end">
        <label className="text-sm font-semibold text-neutral-800">
          Email address
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-normal"
            placeholder="parent@example.com"
          />
        </label>
        <label className="text-sm font-semibold text-neutral-800">
          Relationship
          <select
            value={relationshipType}
            onChange={(event) =>
              setRelationshipType(event.target.value === "parent" ? "parent" : "guardian")
            }
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-normal"
          >
            <option value="guardian">Guardian</option>
            <option value="parent">Parent</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={busyId !== null}
          className="rounded-lg bg-neutral-950 px-4 py-2 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"
        >
          {busyId === "invite" ? "Sending…" : "Send invitation"}
        </button>
      </form>

      <p aria-live="polite" className="min-h-5 text-sm">
        {error ? <span className="text-red-700">{error}</span> : null}
        {!error && message ? <span className="text-emerald-700">{message}</span> : null}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            Active access ({active.length})
          </h3>
          <div className="mt-2 space-y-2">
            {active.length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-neutral-600">
                No connected guardian yet.
              </p>
            ) : (
              active.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {item.email ?? "Verified guardian account"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {item.relationshipType === "parent" ? "Parent" : "Guardian"} · Connected {formatDate(item.activatedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() =>
                      void run(`revoke:${item.id}`, () =>
                        revokeGuardianRelationship({ classId, studentId, relationshipId: item.id }),
                      )
                    }
                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50"
                  >
                    {busyId === `revoke:${item.id}` ? "Revoking…" : "Revoke"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            Pending invitations ({pending.length})
          </h3>
          <div className="mt-2 space-y-2">
            {pending.length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-neutral-600">
                No invitation is waiting for acceptance.
              </p>
            ) : (
              pending.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{item.email}</p>
                      <p className="text-xs text-neutral-500">
                        Expires {formatDate(item.expiresAt)} · Email {item.emailStatus}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() =>
                          void run(`resend:${item.id}`, () =>
                            inviteGuardian({
                              classId,
                              studentId,
                              email: item.email,
                              relationshipType: item.relationshipType,
                            }),
                          )
                        }
                        className="rounded-md border px-3 py-1.5 text-xs font-bold text-neutral-700 disabled:opacity-50"
                      >
                        {busyId === `resend:${item.id}` ? "Sending…" : "Resend"}
                      </button>
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() =>
                          void run(`cancel:${item.id}`, () =>
                            cancelGuardianInvitation({
                              classId,
                              studentId,
                              invitationId: item.id,
                            }),
                          )
                        }
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50"
                      >
                        {busyId === `cancel:${item.id}` ? "Cancelling…" : "Cancel"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
