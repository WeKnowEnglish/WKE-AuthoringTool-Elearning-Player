"use client";

import { useActionState } from "react";
import {
  initialAdminEmailComposerState,
  sendAdminTeacherEmail,
} from "@/lib/actions/admin-communications";
import type { AdminTeacherSummary } from "@/lib/data/admin-users";

export function AdminCommunicationsClient({
  teachers,
}: {
  teachers: AdminTeacherSummary[];
}) {
  const [state, action, pending] = useActionState(
    sendAdminTeacherEmail,
    initialAdminEmailComposerState,
  );
  const stateClasses =
    state.status === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : state.status === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-red-200 bg-red-50 text-red-800";

  return (
    <form action={action} className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-neutral-900">Write an email</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Send one accountable business email at a time. Current teachers are suggested, and you
          can type a prospective teacher&apos;s address directly.
        </p>
      </div>

      {state.status !== "idle" ? (
        <p className={`rounded-lg border px-3 py-2 text-sm ${stateClasses}`} role="status">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold text-neutral-800">
          Recipient email
          <input
            name="recipientEmail"
            type="email"
            list="teacher-email-options"
            required
            maxLength={320}
            autoComplete="off"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"
          />
          <datalist id="teacher-email-options">
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.email} />
            ))}
          </datalist>
        </label>
        <label className="space-y-1 text-sm font-semibold text-neutral-800">
          Recipient name <span className="font-normal text-neutral-500">(optional)</span>
          <input
            name="recipientName"
            type="text"
            maxLength={120}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"
          />
        </label>
      </div>

      <label className="block space-y-1 text-sm font-semibold text-neutral-800">
        Subject
        <input
          name="subject"
          type="text"
          required
          maxLength={160}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"
        />
      </label>

      <label className="block space-y-1 text-sm font-semibold text-neutral-800">
        Message
        <textarea
          name="bodyText"
          required
          maxLength={10000}
          rows={10}
          className="w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 font-normal leading-6"
          placeholder="Write a clear, personal message…"
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-neutral-700">
        <input name="confirmed" value="yes" type="checkbox" required className="mt-1" />
        <span>I checked the recipient, subject, and message and am ready to send it.</span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send email"}
      </button>
    </form>
  );
}
