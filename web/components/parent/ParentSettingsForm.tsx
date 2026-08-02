"use client";

import { useState } from "react";
import { updateParentAccountSettings } from "@/lib/actions/parent-notifications";
import type { ParentAccountSettings } from "@/lib/parent/parent-notifications";

export function ParentSettingsForm(props: { initial: ParentAccountSettings }) {
  const [displayName, setDisplayName] = useState(props.initial.displayName);
  const [preferredLanguage, setPreferredLanguage] = useState<"en" | "vi">(
    props.initial.preferredLanguage,
  );
  const [inApp, setInApp] = useState(props.initial.preferences.inApp);
  const [importantEmail, setImportantEmail] = useState(
    props.initial.preferences.importantEmail,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        setMessage("");
        void updateParentAccountSettings({
          displayName,
          preferredLanguage,
          preferences: {
            inApp,
            importantEmail,
            weeklyEmail: props.initial.preferences.weeklyEmail,
          },
        }).then((result) => {
          setBusy(false);
          if (!result.ok) setError(result.error);
          else setMessage(result.message);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-extrabold text-slate-800">
          Your name
          <input
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
          />
        </label>
        <label className="text-sm font-extrabold text-slate-800">
          Preferred language
          <select
            value={preferredLanguage}
            onChange={(event) => setPreferredLanguage(event.target.value === "vi" ? "vi" : "en")}
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal"
          >
            <option value="en">English</option>
            <option value="vi">Vietnamese (translation support planned)</option>
          </select>
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-lg font-black">Notifications</legend>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
          <input
            type="checkbox"
            checked={inApp}
            onChange={(event) => setInApp(event.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>
            <span className="block font-extrabold">In-app notifications</span>
            <span className="mt-1 block text-sm leading-relaxed text-slate-600">
              Show new progress-report and family-access alerts in the parent portal.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
          <input
            type="checkbox"
            checked={importantEmail}
            onChange={(event) => setImportantEmail(event.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>
            <span className="block font-extrabold">Important email alerts</span>
            <span className="mt-1 block text-sm leading-relaxed text-slate-600">
              Receive a generic email when a report is published or family access changes. Emails
              never contain student learning details.
            </span>
          </span>
        </label>
      </fieldset>

      <p aria-live="polite" className="min-h-5 text-sm">
        {error ? <span className="text-red-700">{error}</span> : null}
        {!error && message ? <span className="text-emerald-700">{message}</span> : null}
      </p>
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60"
      >
        {busy ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}
