"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShieldAlert } from "lucide-react";
import { adminRevokeGuardianRelationship } from "@/lib/actions/admin-guardians";
import type { AdminGuardianSupportData } from "@/lib/data/admin-guardians";

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : value;
}

function actionLabel(action: string): string {
  return action.replaceAll("_", " ");
}

export function AdminGuardianSupportPanel(props: { data: AdminGuardianSupportData }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const connections = useMemo(
    () =>
      props.data.connections.filter((item) =>
        !normalizedQuery ||
        `${item.studentName} ${item.guardianEmail ?? ""} ${item.status}`
          .toLowerCase()
          .includes(normalizedQuery),
      ),
    [normalizedQuery, props.data.connections],
  );
  const invitations = useMemo(
    () =>
      props.data.invitations.filter((item) =>
        !normalizedQuery ||
        `${item.studentName} ${item.invitedEmail} ${item.status}`
          .toLowerCase()
          .includes(normalizedQuery),
      ),
    [normalizedQuery, props.data.invitations],
  );

  return (
    <div className="min-w-0 max-w-full space-y-5">
      <div className="grid min-w-0 gap-3 sm:grid-cols-3">
        <SummaryCard label="Active connections" value={props.data.connections.filter((item) => item.status === "active").length} />
        <SummaryCard label="Pending invitations" value={props.data.invitations.filter((item) => item.status === "pending").length} />
        <SummaryCard label="Recent audit events" value={props.data.auditEvents.length} />
      </div>

      <label className="relative block max-w-full sm:max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-neutral-400" aria-hidden />
        <span className="sr-only">Search guardian support records</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by student or guardian email"
          className="w-full min-w-0 rounded-lg border border-neutral-300 bg-white py-2.5 pl-10 pr-3 text-sm"
        />
      </label>

      <p aria-live="polite" className="min-h-5 text-sm">
        {error ? <span className="text-red-700">{error}</span> : null}
        {!error && message ? <span className="text-emerald-700">{message}</span> : null}
      </p>

      <section className="min-w-0 max-w-full overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 p-4">
          <h2 className="font-bold text-neutral-950">Guardian connections</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Revocation takes effect immediately across every parent route and data function.
          </p>
        </div>
        <div className="min-w-0 overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[40rem] divide-y divide-neutral-200 text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Guardian</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Activated</th>
                <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {connections.map((item) => (
                <tr key={item.id}>
                  <td className="max-w-[10rem] px-4 py-3 font-semibold break-words">
                    {item.studentName}
                  </td>
                  <td className="max-w-[14rem] px-4 py-3">
                    <p className="break-all">
                      {item.guardianEmail ?? "Email unavailable"}
                    </p>
                    <p className="text-xs capitalize text-neutral-500">
                      {item.relationshipType}
                    </p>
                  </td>
                  <td className="px-4 py-3 capitalize">{item.status}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                    {formatDate(item.activatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.status === "active" ? (
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => {
                          if (!window.confirm(`Revoke ${item.guardianEmail ?? "this guardian"}'s access to ${item.studentName}?`)) return;
                          setBusyId(item.id);
                          setError("");
                          setMessage("");
                          void adminRevokeGuardianRelationship({ relationshipId: item.id }).then((result) => {
                            setBusyId(null);
                            if (!result.ok) setError(result.error);
                            else {
                              setMessage(result.message);
                              router.refresh();
                            }
                          });
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                        {busyId === item.id ? "Revoking..." : "Revoke"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="font-bold text-neutral-950">Recent invitations</h2>
          <div className="mt-3 space-y-2">
            {invitations.slice(0, 80).map((item) => (
              <div key={item.id} className="min-w-0 rounded-lg border border-neutral-200 p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="min-w-0 font-semibold break-words">{item.studentName}</p>
                  <span className="capitalize text-neutral-500">{item.status}</span>
                </div>
                <p className="mt-1 break-all text-neutral-700">{item.invitedEmail}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Email {item.emailStatus} · {formatDate(item.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-neutral-200 bg-white p-4">
          <h2 className="font-bold text-neutral-950">Audit timeline</h2>
          <p className="mt-1 text-sm text-neutral-600">Lifecycle actions only; report narratives and student answers are excluded.</p>
          <div className="mt-3 max-h-[36rem] space-y-2 overflow-y-auto overflow-x-hidden">
            {props.data.auditEvents.map((event) => (
              <div key={event.id} className="min-w-0 rounded-lg bg-neutral-50 p-3 text-sm">
                <p className="font-semibold capitalize">{actionLabel(event.action)}</p>
                <p className="mt-1 break-all text-neutral-600">
                  {[event.studentName, event.guardianEmail, event.actorEmail].filter(Boolean).join(" · ")}
                </p>
                <time dateTime={event.createdAt} className="mt-1 block text-xs text-neutral-500">
                  {formatDate(event.createdAt)}
                </time>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard(props: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{props.label}</p>
      <p className="mt-2 text-3xl font-bold text-neutral-950">{props.value}</p>
    </div>
  );
}
