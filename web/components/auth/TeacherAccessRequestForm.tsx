"use client";

import { useState } from "react";
import { requestTeacherAccess } from "@/lib/actions/teacher-access";

export function TeacherAccessRequestForm({ onCancel }: { onCancel: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("");
  const [reason, setReason] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await requestTeacherAccess({ fullName, email, school, reason, website });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-3 rounded-xl border-2 border-emerald-700 bg-emerald-50 p-4">
        <h2 className="text-lg font-extrabold text-emerald-950">Request received</h2>
        <p className="text-sm font-semibold text-emerald-900">
          The administrator has been notified. We will review your request before creating a
          teacher account.
        </p>
        <button type="button" className="text-sm font-bold underline" onClick={onCancel}>
          Back to teacher sign in
        </button>
      </div>
    );
  }

  const inputClass = "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2";
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <h2 className="text-lg font-extrabold text-kid-ink">Request teacher access</h2>
        <p className="mt-1 text-sm text-kid-ink/75">
          Teacher accounts require administrator approval. Submitting this form does not create an
          account.
        </p>
      </div>
      <label className="block text-sm font-semibold">
        Full name
        <input className={inputClass} required maxLength={120} value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </label>
      <label className="block text-sm font-semibold">
        Work email
        <input className={inputClass} required type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block text-sm font-semibold">
        School or organization
        <input className={inputClass} required maxLength={180} value={school} onChange={(e) => setSchool(e.target.value)} />
      </label>
      <label className="block text-sm font-semibold">
        How will you use the teacher portal?
        <textarea className={inputClass} required rows={4} minLength={10} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <label className="hidden" aria-hidden="true">
        Website
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </label>
      {error ? <p role="alert" className="text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-neutral-900 px-3 py-2.5 font-semibold text-white disabled:opacity-60">
          {loading ? "Sending request…" : "Request access"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm font-semibold">
          Cancel
        </button>
      </div>
    </form>
  );
}
