"use client";

import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  Monitor,
  Save,
  Smartphone,
  Tablet,
} from "lucide-react";
import { homeworkCollectionPartValidationIssues } from "@/lib/homework-collections";
import {
  activityItemCount,
  trackMediaIssues,
  trackScoringParts,
  type ActivityTrackDocument,
} from "@/lib/activity-tracks";
import { buildGradedTrackFreezeDocument } from "@/lib/class-homework/freeze-graded-track";
import type { GradedTrackStep } from "@/components/teacher/activity-builder/GradedTrackAuthoringTree";

type Props = {
  document: ActivityTrackDocument;
  canAssign: boolean;
  onPreview: (device: "desktop" | "tablet" | "mobile") => void;
  onNavigate: (step: GradedTrackStep) => void;
  onSave: () => void;
  onAssign: () => void;
};

export function trackReviewIssues(document: ActivityTrackDocument): string[] {
  const issues: string[] = [];
  if (!document.title.trim()) issues.push("Add a Learning Track name.");
  if (document.parts.length === 0) issues.push("Add at least one activity.");
  for (const [index, part] of document.parts.entries()) {
    if (!part.label.trim()) issues.push("Activity " + (index + 1) + " needs a name.");
    if (part.source.type === "empty") issues.push("Activity " + (index + 1) + " needs student content.");
    if (part.source.type === "homework_part") {
      for (const issue of homeworkCollectionPartValidationIssues(part.source.part)) {
        issues.push("Activity " + (index + 1) + ": " + issue);
      }
    }
  }
  issues.push(...trackMediaIssues(document).map((issue) => issue.message));
  if (issues.length === 0) {
    try {
      buildGradedTrackFreezeDocument(document);
    } catch (error) {
      issues.push(error instanceof Error && error.message.trim() ? error.message : "Fix incomplete activity content before assigning.");
    }
  }
  return [...new Set(issues)];
}

export function GradedTrackReviewStep({ document, canAssign, onPreview, onNavigate, onSave, onAssign }: Props) {
  const issues = trackReviewIssues(document);
  const itemCount = document.parts.reduce((total, part) => total + activityItemCount(part), 0);
  const totalPoints = trackScoringParts(document).reduce((total, part) => total + part.maxScore, 0);
  const mediaIssueCount = trackMediaIssues(document).length;
  const checks: Array<{ label: string; detail: string; ready: boolean; step: GradedTrackStep }> = [
    { label: "Track setup", detail: document.topic.trim() || document.level, ready: Boolean(document.title.trim()), step: "track-setup" },
    { label: "Activities", detail: `${document.parts.length} activities · ${itemCount} student items`, ready: document.parts.length > 0 && itemCount > 0, step: "track-activities" },
    { label: "Support", detail: document.support.learnerMessage.trim() ? "Learner support added" : "Optional support can be added", ready: true, step: "track-support" },
    { label: "Media", detail: mediaIssueCount === 0 ? "Required media is ready" : `${mediaIssueCount} media ${mediaIssueCount === 1 ? "issue" : "issues"}`, ready: mediaIssueCount === 0, step: "track-media" },
    { label: "Points & rewards", detail: `${totalPoints} total points · platform rewards apply automatically`, ready: true, step: "track-points" },
    { label: "Design", detail: `${document.design.theme} theme · ${document.design.contentWidth} layout`, ready: true, step: "track-design" },
  ];

  return (
    <div className="space-y-4">
      <section className={"rounded-2xl border p-4 " + (issues.length === 0 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
        <div className="flex items-start gap-3">
          <span className={"inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl " + (issues.length === 0 ? "bg-emerald-200 text-emerald-900" : "bg-amber-200 text-amber-900")}>
            {issues.length === 0 ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </span>
          <div>
            <p className="text-base font-extrabold text-stone-950">{issues.length === 0 ? "Learning Track is ready to assign" : "Finish the readiness checks"}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-stone-700">Assignment freezes this exact student experience for the class.</p>
          </div>
        </div>
        {issues.length > 0 ? <ul className="mt-4 space-y-2">{issues.map((issue) => <li key={issue} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-950">{issue}</li>)}</ul> : null}
      </section>

      <dl className="grid grid-cols-3 gap-2 text-xs">
        <Stat label="Activities" value={document.parts.length} />
        <Stat label="Student items" value={itemCount} />
        <Stat label="Points" value={totalPoints} />
      </dl>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-4 py-3"><h3 className="text-sm font-extrabold text-stone-950">Authoring checklist</h3></div>
        <div className="divide-y divide-stone-100">
          {checks.map((check) => (
            <div key={check.step} className="flex items-center gap-3 px-4 py-3">
              <span className={"inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full " + (check.ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>
                {check.ready ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1"><p className="text-xs font-extrabold text-stone-900">{check.label}</p><p className="truncate text-[11px] font-semibold text-stone-500">{check.detail}</p></div>
              <button type="button" onClick={() => onNavigate(check.step)} className="rounded-lg border border-stone-200 px-3 py-2 text-[11px] font-extrabold text-stone-700 hover:bg-stone-50">Review</button>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <PreviewButton label="Desktop" onClick={() => onPreview("desktop")}><Monitor className="h-4 w-4" /></PreviewButton>
        <PreviewButton label="Tablet" onClick={() => onPreview("tablet")}><Tablet className="h-4 w-4" /></PreviewButton>
        <PreviewButton label="Phone" onClick={() => onPreview("mobile")}><Smartphone className="h-4 w-4" /></PreviewButton>
      </div>

      <div className="grid gap-2 sm:grid-cols-[0.75fr_1.25fr]">
        <button type="button" onClick={onSave} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-sm font-extrabold text-stone-800"><Save className="h-4 w-4" />Save draft</button>
        <button type="button" disabled={!canAssign || issues.length > 0} onClick={onAssign} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"><ClipboardCheck className="h-4 w-4" />Assign this Learning Track</button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-stone-200 bg-white p-3"><dt className="font-bold text-stone-500">{label}</dt><dd className="mt-1 text-xl font-extrabold text-stone-950">{value}</dd></div>;
}

function PreviewButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white text-xs font-extrabold text-stone-800">{children}{label}</button>;
}
