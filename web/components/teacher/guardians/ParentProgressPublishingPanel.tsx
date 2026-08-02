"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FilePlus2 } from "lucide-react";
import { ParentProgressReportView } from "@/components/parent/ParentProgressReportView";
import {
  archiveParentProgressReport,
  generateParentProgressDraft,
  publishParentProgressReport,
  saveParentProgressDraft,
} from "@/lib/actions/parent-progress-reports";
import type {
  ParentProgressReport,
  ParentProgressSnapshot,
} from "@/lib/parent/progress-report";

function reportStatusLabel(status: ParentProgressReport["status"]): string {
  if (status === "ready_for_review") return "Ready for review";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function ParentProgressPublishingPanel(props: {
  classId: string;
  studentId: string;
  reports: ParentProgressReport[] | null;
}) {
  const router = useRouter();
  const working = useMemo(
    () => props.reports?.find((report) => report.status === "draft" || report.status === "ready_for_review") ?? null,
    [props.reports],
  );
  const published = useMemo(
    () => props.reports?.find((report) => report.status === "published") ?? null,
    [props.reports],
  );
  const [snapshot, setSnapshot] = useState<ParentProgressSnapshot | null>(working?.snapshot ?? null);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSnapshot(working?.snapshot ?? null);
    setDirty(false);
  }, [working?.id, working?.snapshot]);

  if (!props.reports) return null;

  function updateSnapshot(updater: (current: ParentProgressSnapshot) => ParentProgressSnapshot) {
    setSnapshot((current) => (current ? updater(current) : current));
    setDirty(true);
    setMessage("");
  }

  async function run(
    key: string,
    action: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>,
  ) {
    setBusy(key);
    setError("");
    setMessage("");
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message);
      if (key === "save") setDirty(false);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const baseInput = { classId: props.classId, studentId: props.studentId };

  return (
    <section className="space-y-4 rounded-xl border bg-white p-4" aria-labelledby="progress-sharing-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="progress-sharing-heading" className="text-lg font-bold text-neutral-950">
            Parent progress report
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Generate from saved evidence, edit the family-facing language, preview exactly what a
            parent will see, then publish deliberately.
          </p>
        </div>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run("generate", () => generateParentProgressDraft(baseInput))}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          <FilePlus2 className="h-4 w-4" aria-hidden />
          {working ? "Generate fresh draft" : "Generate draft"}
        </button>
      </div>

      {working && snapshot ? (
        <div className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-indigo-950">
              Version {working.version} · {reportStatusLabel(working.status)}
            </p>
            <button
              type="button"
              onClick={() => setPreview((value) => !value)}
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-bold text-indigo-700"
            >
              <Eye className="h-4 w-4" aria-hidden />
              {preview ? "Return to editor" : "Preview parent view"}
            </button>
          </div>

          {preview ? (
            <ParentProgressReportView snapshot={snapshot} preview />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <ReportField
                label="Reporting period label"
                value={snapshot.periodLabel}
                onChange={(value) => updateSnapshot((current) => ({ ...current, periodLabel: value }))}
              />
              <ReportField
                label="Current learning topic"
                value={snapshot.currentTopic}
                onChange={(value) => updateSnapshot((current) => ({ ...current, currentTopic: value }))}
              />
              <ReportField
                label="Recent learning"
                value={snapshot.recentLearning}
                multiline
                onChange={(value) => updateSnapshot((current) => ({ ...current, recentLearning: value }))}
              />
              <ReportField
                label="Teacher summary"
                value={snapshot.teacherSummary}
                multiline
                onChange={(value) => updateSnapshot((current) => ({ ...current, teacherSummary: value }))}
              />
              <ReportField
                label="Doing well - title"
                value={snapshot.doingWell.title}
                onChange={(value) => updateSnapshot((current) => ({ ...current, doingWell: { ...current.doingWell, title: value } }))}
              />
              <ReportField
                label="Doing well - explanation"
                value={snapshot.doingWell.detail}
                multiline
                onChange={(value) => updateSnapshot((current) => ({ ...current, doingWell: { ...current.doingWell, detail: value } }))}
              />
              <ReportField
                label="Next focus - title"
                value={snapshot.nextFocus.title}
                onChange={(value) => updateSnapshot((current) => ({ ...current, nextFocus: { ...current.nextFocus, title: value } }))}
              />
              <ReportField
                label="Next focus - explanation"
                value={snapshot.nextFocus.detail}
                multiline
                onChange={(value) => updateSnapshot((current) => ({ ...current, nextFocus: { ...current.nextFocus, detail: value } }))}
              />
              <ReportField
                label="At-home activity title"
                value={snapshot.homeSupport.title}
                onChange={(value) => updateSnapshot((current) => ({ ...current, homeSupport: { ...current.homeSupport, title: value } }))}
              />
              <ReportField
                label="At-home instructions"
                value={snapshot.homeSupport.instruction}
                multiline
                onChange={(value) => updateSnapshot((current) => ({ ...current, homeSupport: { ...current.homeSupport, instruction: value } }))}
              />
              <label className="text-sm font-semibold text-neutral-800">
                At-home minutes
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={snapshot.homeSupport.minutes}
                  onChange={(event) =>
                    updateSnapshot((current) => ({
                      ...current,
                      homeSupport: {
                        ...current.homeSupport,
                        minutes: Math.max(1, Math.min(30, Number(event.target.value) || 1)),
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal"
                />
              </label>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                busy !== null || (!dirty && working.status === "ready_for_review")
              }
              onClick={() =>
                snapshot &&
                void run("save", () =>
                  saveParentProgressDraft({ ...baseInput, reportId: working.id, snapshot }),
                )
              }
              className="rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-bold text-indigo-700 disabled:opacity-50"
            >
              Save reviewed draft
            </button>
            <button
              type="button"
              disabled={busy !== null || dirty || working.status !== "ready_for_review"}
              onClick={() =>
                void run("publish", () =>
                  publishParentProgressReport({ ...baseInput, reportId: working.id }),
                )
              }
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Publish to guardians
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void run("archive-working", () =>
                  archiveParentProgressReport({ ...baseInput, reportId: working.id }),
                )
              }
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-50"
            >
              Archive draft
            </button>
          </div>
          {dirty ? (
            <p className="text-xs font-semibold text-amber-800">
              Save the reviewed draft before publishing. Skill labels and evidence scope come from
              current saved learning data.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-300 p-5 text-sm text-neutral-600">
          No working draft. Generate one, then review every parent-facing claim before publishing.
        </div>
      )}

      {published ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm text-emerald-950">
            <span className="font-bold">Currently visible:</span> version {published.version}, {published.snapshot.periodLabel}
          </p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              void run("archive-published", () =>
                archiveParentProgressReport({ ...baseInput, reportId: published.id }),
              )
            }
            className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50"
          >
            Remove from parent view
          </button>
        </div>
      ) : null}

      <p aria-live="polite" className="min-h-5 text-sm">
        {error ? <span className="text-red-700">{error}</span> : null}
        {!error && message ? <span className="text-emerald-700">{message}</span> : null}
      </p>
    </section>
  );
}

function ReportField(props: {
  label: string;
  value: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-semibold text-neutral-800">
      {props.label}
      {props.multiline ? (
        <textarea
          rows={3}
          required
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal"
        />
      ) : (
        <input
          required
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal"
        />
      )}
    </label>
  );
}
