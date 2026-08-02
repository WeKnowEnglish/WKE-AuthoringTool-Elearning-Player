"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BookOpenCheck, ShieldAlert } from "lucide-react";
import {
  markAllParentNotificationsRead,
  markParentNotificationRead,
} from "@/lib/actions/parent-notifications";
import type { ParentNotification } from "@/lib/parent/parent-notifications";

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Recent";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function ParentNotificationsList(props: { notifications: ParentNotification[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const unread = props.notifications.filter((item) => !item.readAt).length;

  async function openNotification(notification: ParentNotification) {
    setBusy(notification.id);
    setError("");
    try {
      if (!notification.readAt) {
        const result = await markParentNotificationRead(notification.id);
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      if (notification.linkPath) router.push(notification.linkPath);
      else router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (props.notifications.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
        <Bell className="mx-auto h-9 w-9 text-slate-400" aria-hidden />
        <h2 className="mt-4 text-xl font-black">No notifications yet</h2>
        <p className="mt-2 text-slate-600">
          Important report and family-access updates will appear here.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-600">
          {unread} unread notification{unread === 1 ? "" : "s"}
        </p>
        {unread > 0 ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => {
              setBusy("all");
              setError("");
              void markAllParentNotificationsRead().then((result) => {
                setBusy(null);
                if (!result.ok) setError(result.error);
                else router.refresh();
              });
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-extrabold text-slate-700 disabled:opacity-50"
          >
            {busy === "all" ? "Updating..." : "Mark all as read"}
          </button>
        ) : null}
      </div>

      <p aria-live="polite" className="text-sm text-red-700">{error}</p>

      <div className="space-y-3">
        {props.notifications.map((notification) => {
          const Icon = notification.type === "report_published" ? BookOpenCheck : ShieldAlert;
          return (
            <button
              type="button"
              key={notification.id}
              disabled={busy !== null}
              onClick={() => void openNotification(notification)}
              className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left shadow-sm transition hover:border-indigo-300 disabled:opacity-60 ${
                notification.readAt ? "border-slate-200 bg-white" : "border-indigo-200 bg-indigo-50"
              }`}
            >
              <span className="rounded-xl bg-white p-2.5 text-indigo-700 shadow-sm">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-slate-950">{notification.title}</span>
                  {!notification.readAt ? (
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
                      New
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-slate-600">
                  {notification.body}
                </span>
                <time dateTime={notification.createdAt} className="mt-2 block text-xs font-bold text-slate-500">
                  {formatDate(notification.createdAt)}
                </time>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
