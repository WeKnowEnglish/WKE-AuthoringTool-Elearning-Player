"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveTeacherAccessRequest,
  declineTeacherAccessRequest,
  resendTeacherWelcomeEmail,
} from "@/lib/actions/admin-users";
import type { AdminAccessRequest } from "@/lib/data/admin-users";

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function AdminRequestsClient({
  requests,
  initialStatus,
}: {
  requests: AdminAccessRequest[];
  initialStatus: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [credential, setCredential] = useState<{
    email: string;
    tempPassword: string;
    tier: string;
    created: boolean;
    welcomeEmailSent: boolean;
    welcomeEmailError?: string;
  } | null>(null);
  const [noteById, setNoteById] = useState<Record<string, string>>({});

  const setFilter = (status: string) => {
    const href =
      status === "pending" ? "/teacher/admin/requests" : `/teacher/admin/requests?status=${status}`;
    router.push(href);
  };

  const approve = (requestId: string, tier: "light" | "plus") => {
    setError(null);
    setCredential(null);
    startTransition(async () => {
      const result = await approveTeacherAccessRequest({
        requestId,
        tier,
        note: noteById[requestId],
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCredential({
        email: result.email,
        tempPassword: result.tempPassword,
        tier: result.tier,
        created: result.created,
        welcomeEmailSent: result.welcomeEmailSent,
        welcomeEmailError: result.welcomeEmailError,
      });
      router.refresh();
    });
  };

  const decline = (requestId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await declineTeacherAccessRequest({
        requestId,
        note: noteById[requestId],
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const resendWelcome = (requestId: string) => {
    setError(null);
    setCredential(null);
    startTransition(async () => {
      const result = await resendTeacherWelcomeEmail({ requestId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCredential({
        email: result.email,
        tempPassword: result.tempPassword,
        tier: "resent",
        created: false,
        welcomeEmailSent: true,
      });
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["pending", "approved", "declined", "all"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
              initialStatus === status
                ? "bg-neutral-900 text-white"
                : "border border-neutral-300 bg-white text-neutral-700"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {credential ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            credential.welcomeEmailSent
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
          role="status"
        >
          <p className="font-semibold">
            {credential.tier === "resent"
              ? "Welcome email resent"
              : `Teacher ${credential.created ? "created" : "updated"} (${credential.tier})`}
          </p>
          <p className="mt-1">
            Email: <span className="font-mono font-semibold">{credential.email}</span>
          </p>
          <p className="mt-1">
            Temp password:{" "}
            <span className="font-mono font-semibold">{credential.tempPassword}</span>
          </p>
          {credential.welcomeEmailSent ? (
            <p className="mt-2 text-xs opacity-80">
              A welcome email with sign-in instructions was sent. They must change the temporary
              password on first login.
            </p>
          ) : (
            <p className="mt-2 text-xs opacity-80">
              Account is ready, but the welcome email did not send
              {credential.welcomeEmailError ? ` (${credential.welcomeEmailError})` : ""}. Copy the
              credentials above or use Resend welcome after fixing Resend env on the server.
            </p>
          )}
          <button
            type="button"
            className="mt-2 text-xs font-semibold underline"
            onClick={() => setCredential(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {requests.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-4 text-sm text-neutral-600">
          No requests in this filter.
        </p>
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => (
            <li
              key={request.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold text-neutral-900">{request.fullName}</p>
                  <p className="font-mono text-sm text-neutral-700">{request.email}</p>
                  <p className="mt-1 text-sm text-neutral-600">{request.school}</p>
                </div>
                <div className="text-right text-xs text-neutral-500">
                  <p className="font-semibold capitalize text-neutral-800">{request.status}</p>
                  <p>{formatWhen(request.createdAt)}</p>
                  <p className="mt-1">Admin notify: {request.notificationStatus}</p>
                  {request.status === "approved" ? (
                    <p className="mt-1">
                      Welcome email: {request.welcomeEmailStatus ?? "—"}
                    </p>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-700">{request.reason}</p>
              {request.reviewNote ? (
                <p className="mt-2 text-xs text-neutral-500">Note: {request.reviewNote}</p>
              ) : null}

              {request.status === "pending" ? (
                <div className="mt-3 space-y-2 border-t border-neutral-100 pt-3">
                  <label className="block text-xs font-semibold text-neutral-600">
                    Optional note
                    <input
                      value={noteById[request.id] ?? ""}
                      onChange={(e) =>
                        setNoteById((current) => ({ ...current, [request.id]: e.target.value }))
                      }
                      className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5 text-sm font-normal"
                      disabled={pending}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => approve(request.id, "light")}
                      className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50"
                    >
                      Approve Light
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => approve(request.id, "plus")}
                      className="rounded-lg bg-teal-800 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50"
                    >
                      Approve Plus
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => decline(request.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ) : null}

              {request.status === "approved" ? (
                <div className="mt-3 border-t border-neutral-100 pt-3">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => resendWelcome(request.id)}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-800 disabled:opacity-50"
                  >
                    Resend welcome email
                  </button>
                  <p className="mt-1 text-xs text-neutral-500">
                    Resets the temporary password to 00000000 and emails sign-in instructions again.
                  </p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
