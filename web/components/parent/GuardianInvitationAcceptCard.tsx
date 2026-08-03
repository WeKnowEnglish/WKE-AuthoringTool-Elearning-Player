"use client";

import { useState } from "react";
import { acceptGuardianInvitation } from "@/lib/actions/guardian-invitations";
import { parentStudentPath } from "@/lib/parent/parent-routes";
import { createClient } from "@/lib/supabase/client";

export function GuardianInvitationAcceptCard(props: {
  token: string;
  studentName: string;
  relationshipType: "parent" | "guardian";
  expiresAt: string;
  signedInEmail: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const expiry = new Date(props.expiresAt);

  async function accept() {
    setBusy(true);
    setError("");
    try {
      const result = await acceptGuardianInvitation({ token: props.token });
      if (!result.ok || !result.studentId) {
        setError(result.ok ? "The invitation could not be accepted." : result.error);
        return;
      }
      window.location.assign(parentStudentPath(result.studentId));
    } finally {
      setBusy(false);
    }
  }

  async function switchAccount() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-indigo-600">
        Parent portal invitation
      </p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        Connect to {props.studentName}
      </h1>
      <p className="mt-3 leading-relaxed text-slate-600">
        Accepting gives this verified account a read-only view of teacher-approved class updates
        and published progress reports.
      </p>

      <dl className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-bold text-slate-500">Signed in as</dt>
          <dd className="mt-1 font-semibold text-slate-900">{props.signedInEmail}</dd>
        </div>
        <div>
          <dt className="font-bold text-slate-500">Relationship</dt>
          <dd className="mt-1 font-semibold capitalize text-slate-900">{props.relationshipType}</dd>
        </div>
        <div>
          <dt className="font-bold text-slate-500">Invitation expires</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {Number.isFinite(expiry.getTime()) ? expiry.toLocaleDateString() : "Soon"}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-slate-500">Access</dt>
          <dd className="mt-1 font-semibold text-slate-900">Read only</dd>
        </div>
      </dl>

      <p aria-live="polite" className="mt-4 min-h-5 text-sm text-red-700">
        {error}
      </p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={busy}
          onClick={() => void accept()}
          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? "Connecting…" : "Accept and open parent portal"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void switchAccount()}
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Use another account
        </button>
      </div>
    </div>
  );
}
