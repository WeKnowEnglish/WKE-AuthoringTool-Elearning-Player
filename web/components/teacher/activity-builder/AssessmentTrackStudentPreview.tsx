"use client";

import { PrimaryA2AssessmentPilot } from "@/components/assessment/PrimaryA2AssessmentPilot";
import type { ActivityTrackDocument } from "@/lib/activity-tracks";

type Props = {
  doc: ActivityTrackDocument;
  /** Selected assessment part id — jumps the student preview to that part. */
  focusPartId?: string | null;
};

/**
 * Live student assessment surface for Assessment tracks — same definition
 * clone the teacher is editing (freeze/assign embeds this later).
 */
export function AssessmentTrackStudentPreview({
  doc,
  focusPartId = null,
}: Props) {
  const definition = doc.assessmentDefinition;

  if (doc.mode !== "assessment" || !definition) {
    return (
      <div className="flex h-full min-h-[16rem] items-center justify-center bg-[radial-gradient(circle_at_top,_#fafaf9,_#e7e5e4_70%)] p-6">
        <div className="w-full max-w-md rounded-2xl border border-dashed border-stone-300 bg-white/90 px-6 py-10 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
            Student preview
          </p>
          <p className="mt-2 text-lg font-extrabold text-stone-900">
            Seed an assessment template
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-stone-600">
            Assessment tracks need a cloned Primary A2 English Check before the
            student view can load here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-100">
      <PrimaryA2AssessmentPilot
        key={doc.id}
        definition={definition}
        mode="authoring-preview"
        focusPartId={focusPartId}
      />
    </div>
  );
}
