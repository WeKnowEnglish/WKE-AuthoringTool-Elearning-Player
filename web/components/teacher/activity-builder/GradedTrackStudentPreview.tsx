"use client";

import { useMemo } from "react";
import { HomeworkTemplateOnePilot } from "@/components/pilots/HomeworkTemplateOnePilot";
import { SecondaryHomeworkOneShell } from "@/components/secondary/SecondaryHomeworkOneShell";
import {
  partHasHomeworkContent,
  type ActivityTrackDocument,
} from "@/lib/activity-tracks";
import { buildGradedTrackFreezeDocument } from "@/lib/class-homework/freeze-graded-track";
import { HomeworkCollectionPlayer } from "@/components/homework/HomeworkCollectionPlayer";

type Props = {
  doc: ActivityTrackDocument;
  /** Selected track part id — jumps the student preview to that part. */
  focusPartId?: string | null;
};

function previewErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "This draft can’t be previewed until every part is valid.";
}

/**
 * Live student homework surface for Graded tracks — same freeze shape as assign.
 */
export function GradedTrackStudentPreview({
  doc,
  focusPartId = null,
}: Props) {
  const homeworkPartCount = doc.parts.filter(partHasHomeworkContent).length;

  const preview = useMemo(() => {
    if (doc.mode !== "graded" || !doc.gradedOrigin || homeworkPartCount < 1) {
      return { status: "empty" as const };
    }
    try {
      const freeze = buildGradedTrackFreezeDocument(doc);
      return { status: "ready" as const, freeze };
    } catch (error) {
      return { status: "error" as const, message: previewErrorMessage(error) };
    }
  }, [doc, homeworkPartCount]);

  if (preview.status === "empty") {
    return (
      <div className="flex h-full min-h-[16rem] items-center justify-center bg-[radial-gradient(circle_at_top,_#fafaf9,_#e7e5e4_70%)] p-6">
        <div className="w-full max-w-md rounded-2xl border border-dashed border-stone-300 bg-white/90 px-6 py-10 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
            Student preview
          </p>
          <p className="mt-2 text-lg font-extrabold text-stone-900">
            Add a homework activity
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-stone-600">
            Start with a reusable activity type or add parts from a Primary or
            Secondary preset.
          </p>
        </div>
      </div>
    );
  }

  if (preview.status === "error") {
    return (
      <div className="flex h-full min-h-[16rem] items-center justify-center bg-[radial-gradient(circle_at_top,_#fafaf9,_#e7e5e4_70%)] p-6">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
            Preview paused
          </p>
          <p className="mt-2 text-base font-extrabold text-amber-950">
            Fix the part content to preview
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-amber-900/80">
            {preview.message}
          </p>
        </div>
      </div>
    );
  }

  const { freeze } = preview;
  const focusedFreezePart = focusPartId
    ? freeze.parts.find((part) => part.id === focusPartId)
    : null;
  const focusSectionId = focusedFreezePart?.sectionId ?? null;
  const partLabels = Object.fromEntries(
    freeze.parts.map((part) => [part.sectionId, part.label]),
  );

  const focusedCollectionPart = focusPartId
    ? freeze.collectionDocument?.parts.find((part) => part.id === focusPartId)
    : null;
  if (
    freeze.collectionDocument &&
    (focusedCollectionPart || (!freeze.primaryDocument && !freeze.secondaryDocument))
  ) {
    return (
      <HomeworkCollectionPlayer
        document={freeze.collectionDocument}
        mode="authoring-preview"
        focusPartId={focusedCollectionPart?.id ?? null}
      />
    );
  }

  if (freeze.level === "primary" && freeze.primaryDocument) {
    return (
      <HomeworkTemplateOnePilot
        key={`${freeze.trackId}:primary`}
        mode="authoring-preview"
        document={freeze.primaryDocument}
        focusSectionId={focusSectionId}
      />
    );
  }

  if (freeze.level === "secondary" && freeze.secondaryDocument) {
    return (
      <SecondaryHomeworkOneShell
        key={`${freeze.trackId}:secondary`}
        mode="authoring-preview"
        content={freeze.secondaryDocument}
        focusPartId={focusSectionId}
        partLabels={partLabels}
        title={freeze.title}
        subtitle={freeze.instructions || undefined}
        visiblePartIds={freeze.parts.map((part) => part.sectionId)}
      />
    );
  }

  return (
    <div className="flex h-full min-h-[16rem] items-center justify-center p-6 text-sm font-semibold text-stone-600">
      Freeze built, but no student document was produced.
    </div>
  );
}
