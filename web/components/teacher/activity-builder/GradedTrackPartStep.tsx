"use client";

import {
  ACTIVITY_TRACK_PART_CATALOG,
  type ActivityTrackDocument,
  type ActivityTrackPart,
} from "@/lib/activity-tracks";
import type { HomeworkCollectionPart } from "@/lib/homework-collections";
import type { GradedAuthoringStep } from "@/components/teacher/activity-builder/GradedTrackAuthoringTree";
import { HomeworkCollectionPartEditor } from "@/components/teacher/activity-builder/HomeworkCollectionPartEditor";
import { PictureClozeSectionEditor } from "@/components/teacher/activity-builder/PictureClozeSectionEditor";
import { PictureWritingSectionEditor } from "@/components/teacher/activity-builder/PictureWritingSectionEditor";
import { QuestionWritingSectionEditor } from "@/components/teacher/activity-builder/QuestionWritingSectionEditor";
import { SecondaryCorrectionsSectionEditor } from "@/components/teacher/activity-builder/SecondaryCorrectionsSectionEditor";
import { SecondaryDialogueSectionEditor } from "@/components/teacher/activity-builder/SecondaryDialogueSectionEditor";
import { SecondaryQuestionsSectionEditor } from "@/components/teacher/activity-builder/SecondaryQuestionsSectionEditor";
import { SecondarySequenceSectionEditor } from "@/components/teacher/activity-builder/SecondarySequenceSectionEditor";
import { SecondarySpeakingSectionEditor } from "@/components/teacher/activity-builder/SecondarySpeakingSectionEditor";
import { SentenceColumnsSectionEditor } from "@/components/teacher/activity-builder/SentenceColumnsSectionEditor";
import { VerbTableSectionEditor } from "@/components/teacher/activity-builder/VerbTableSectionEditor";
import { WordAnnotationSectionEditor } from "@/components/teacher/activity-builder/WordAnnotationSectionEditor";

type PartStep = Extract<
  GradedAuthoringStep,
  "part-setup" | "part-content" | "part-review"
>;

type Props = {
  document: ActivityTrackDocument;
  part: ActivityTrackPart;
  step: PartStep;
  onPatch: (
    updater: (current: ActivityTrackDocument) => ActivityTrackDocument,
  ) => void;
};

function partTypeLabel(part: ActivityTrackPart) {
  return (
    ACTIVITY_TRACK_PART_CATALOG.find((entry) => entry.kind === part.kind)?.label ??
    part.kind
  );
}

export function GradedTrackPartStep({
  document,
  part,
  step,
  onPatch,
}: Props) {
  const patchHomeworkPart = (nextPart: HomeworkCollectionPart) => {
    onPatch((current) => ({
      ...current,
      parts: current.parts.map((entry) =>
        entry.id === part.id && entry.source.type === "homework_part"
          ? {
              ...entry,
              label: nextPart.title,
              source: { type: "homework_part", part: nextPart },
            }
          : entry,
      ),
    }));
  };

  const patchSection = (nextSection: Record<string, unknown>) => {
    onPatch((current) => ({
      ...current,
      parts: current.parts.map((entry) =>
        entry.id === part.id && entry.source.type === "template_section"
          ? {
              ...entry,
              source: { ...entry.source, section: nextSection },
            }
          : entry,
      ),
    }));
  };

  const renderSetup = () => {
    if (part.source.type === "homework_part") {
      return (
        <HomeworkCollectionPartEditor
          part={part.source.part}
          onChange={patchHomeworkPart}
          view="setup"
        />
      );
    }
    const section =
      part.source.type === "template_section" ? part.source.section : null;
    const instructions =
      section && typeof section.instructions === "string"
        ? section.instructions
        : "";
    return (
      <div className="space-y-4">
        <section className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-teal-800">
            Student directions
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-teal-950">
            Name this activity clearly and tell students what to do.
          </p>
        </section>
        <label className="block text-xs font-bold text-stone-800">
          Activity label
          <input
            value={part.label}
            onChange={(event) => {
              const label = event.target.value;
              onPatch((current) => ({
                ...current,
                parts: current.parts.map((entry) =>
                  entry.id === part.id ? { ...entry, label } : entry,
                ),
              }));
            }}
            className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold"
          />
        </label>
        {section ? (
          <label className="block text-xs font-bold text-stone-800">
            Student instructions
            <textarea
              value={instructions}
              onChange={(event) =>
                patchSection({
                  ...section,
                  instructions: event.target.value,
                })
              }
              rows={4}
              className="mt-1.5 w-full resize-y rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-semibold leading-5"
            />
          </label>
        ) : null}
      </div>
    );
  };

  const renderContent = () => {
    if (part.source.type === "homework_part") {
      return (
        <HomeworkCollectionPartEditor
          part={part.source.part}
          onChange={patchHomeworkPart}
          view="content"
        />
      );
    }
    if (part.source.type !== "template_section") return renderSetup();
    const section = part.source.section;
    if (part.kind === "picture_cloze") {
      return <PictureClozeSectionEditor section={section} onChange={patchSection} />;
    }
    if (part.kind === "word_annotation") {
      return <WordAnnotationSectionEditor section={section} onChange={patchSection} />;
    }
    if (part.kind === "sentence_columns") {
      return <SentenceColumnsSectionEditor section={section} onChange={patchSection} />;
    }
    if (part.kind === "verb_table") {
      return <VerbTableSectionEditor section={section} onChange={patchSection} />;
    }
    if (part.kind === "picture_writing") {
      return <PictureWritingSectionEditor section={section} onChange={patchSection} />;
    }
    if (part.kind === "question_writing") {
      return <QuestionWritingSectionEditor section={section} onChange={patchSection} />;
    }
    if (part.kind === "secondary_sequence") {
      return <SecondarySequenceSectionEditor section={section} onChange={patchSection} />;
    }
    if (part.kind === "secondary_corrections") {
      return <SecondaryCorrectionsSectionEditor section={section} onChange={patchSection} />;
    }
    if (part.kind === "secondary_dialogue") {
      return <SecondaryDialogueSectionEditor section={section} onChange={patchSection} />;
    }
    if (part.kind === "secondary_questions") {
      return <SecondaryQuestionsSectionEditor section={section} onChange={patchSection} />;
    }
    if (part.kind === "speaking_prompt") {
      return <SecondarySpeakingSectionEditor section={section} onChange={patchSection} />;
    }
    return renderSetup();
  };

  const renderReview = () => {
    if (part.source.type === "homework_part") {
      return (
        <HomeworkCollectionPartEditor
          part={part.source.part}
          onChange={patchHomeworkPart}
          view="review"
        />
      );
    }
    const ready = Boolean(part.label.trim()) && part.source.type === "template_section";
    const instructions =
      part.source.type === "template_section" &&
      typeof part.source.section.instructions === "string"
        ? part.source.section.instructions
        : "";
    return (
      <section
        className={
          "rounded-2xl border p-4 " +
          (ready
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50")
        }
      >
        <p
          className={
            "text-xs font-extrabold uppercase tracking-wide " +
            (ready ? "text-emerald-800" : "text-amber-800")
          }
        >
          {ready ? "Ready to assign" : "Needs attention"}
        </p>
        <p className="mt-1 text-base font-extrabold text-stone-950">
          {part.label || "Untitled activity"}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-white p-3">
            <dt className="font-bold text-stone-500">Activity type</dt>
            <dd className="mt-1 font-extrabold text-stone-950">
              {partTypeLabel(part)}
            </dd>
          </div>
          <div className="rounded-xl bg-white p-3">
            <dt className="font-bold text-stone-500">Assignment</dt>
            <dd className="mt-1 font-extrabold text-stone-950">
              Frozen on assign
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs font-semibold leading-5 text-stone-700">
          {instructions.trim()
            ? "Student directions are present and the live preview is focused on this activity."
            : "Review the activity content in the live student viewport before assigning."}
        </p>
      </section>
    );
  };

  if (!document.parts.some((entry) => entry.id === part.id)) return null;
  if (step === "part-setup") return renderSetup();
  if (step === "part-content") return renderContent();
  return renderReview();
}
