"use client";

import Link from "next/link";
import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  GripVertical,
  Monitor,
  Pencil,
  Save,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";
import {
  ACTIVITY_TRACK_MODE_COPY,
  ACTIVITY_TRACK_PART_CATALOG,
  activityItemNoun,
  gradedPartKindsForOrigin,
  partHasHomeworkContent,
  type ActivityTrackDocument,
  type ActivityTrackMode,
  type ActivityTrackPart,
  type ActivityTrackPartKind,
} from "@/lib/activity-tracks";
import {
  GradedTrackAuthoringTree,
  type GradedAuthoringSelection,
  type GradedAuthoringStep,
  type GradedPartStep,
  type GradedTrackStep,
} from "@/components/teacher/activity-builder/GradedTrackAuthoringTree";
import { GradedTrackSetupStep } from "@/components/teacher/activity-builder/GradedTrackSetupStep";
import { GradedTrackActivitiesStep } from "@/components/teacher/activity-builder/GradedTrackActivitiesStep";
import { GradedTrackPartStep } from "@/components/teacher/activity-builder/GradedTrackPartStep";
import {
  GradedTrackReviewStep,
  trackReviewIssues,
} from "@/components/teacher/activity-builder/GradedTrackReviewStep";
import { LiveActivityTrackPreview } from "@/components/teacher/activity-builder/LiveActivityTrackPreview";
import { GradedTrackSupportStep } from "@/components/teacher/activity-builder/GradedTrackSupportStep";
import { GradedTrackMediaStep } from "@/components/teacher/activity-builder/GradedTrackMediaStep";
import { GradedTrackPointsStep } from "@/components/teacher/activity-builder/GradedTrackPointsStep";
import { GradedTrackDesignStep } from "@/components/teacher/activity-builder/GradedTrackDesignStep";

type Props = {
  document: ActivityTrackDocument;
  selection: GradedAuthoringSelection;
  step: GradedAuthoringStep;
  saveFlash: boolean;
  assignNotice?: string | null;
  onDismissAssignNotice: () => void;
  onSelectionChange: (
    selection: GradedAuthoringSelection,
    step: GradedAuthoringStep,
  ) => void;
  onPatchDocument: (
    updater: (current: ActivityTrackDocument) => ActivityTrackDocument,
  ) => void;
  onSave: () => void;
  onModeChange: (mode: ActivityTrackMode) => void;
  onAddPart: (kind: ActivityTrackPartKind) => void;
  onMovePart: (partId: string, direction: -1 | 1) => void;
  onDuplicatePart: (partId: string) => void;
  onRemovePart: (partId: string) => void;
  onResetFromOrigin: () => void;
  onOpenAssign: () => void;
};

type StepTarget = {
  selection: GradedAuthoringSelection;
  step: GradedAuthoringStep;
};

function modeBadgeClass(mode: ActivityTrackMode) {
  if (mode === "graded") return "bg-amber-100 text-amber-900";
  if (mode === "assessment") return "bg-violet-100 text-violet-900";
  return "bg-sky-100 text-sky-900";
}

function partTypeLabel(part: ActivityTrackPart) {
  return (
    ACTIVITY_TRACK_PART_CATALOG.find((entry) => entry.kind === part.kind)?.label ??
    part.kind
  );
}

function sameTarget(
  target: StepTarget,
  selection: GradedAuthoringSelection,
  step: GradedAuthoringStep,
) {
  if (target.step !== step || target.selection.type !== selection.type) return false;
  if (target.selection.type === "track" || selection.type === "track") {
    return target.selection.type === selection.type;
  }
  return target.selection.partId === selection.partId;
}

export function GradedTrackAuthoringWorkspace({
  document: track,
  selection,
  step,
  saveFlash,
  assignNotice = null,
  onDismissAssignNotice,
  onSelectionChange,
  onPatchDocument,
  onSave,
  onModeChange,
  onAddPart,
  onMovePart,
  onDuplicatePart,
  onRemovePart,
  onResetFromOrigin,
  onOpenAssign,
}: Props) {
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );
  const [addOpen, setAddOpen] = useState(false);
  const [editorPercent, setEditorPercent] = useState(55);
  const layoutRef = useRef<HTMLDivElement | null>(null);

  const selectedPart =
    selection.type === "part"
      ? track.parts.find((part) => part.id === selection.partId) ?? null
      : null;
  const selectedPartIndex = selectedPart
    ? track.parts.findIndex((part) => part.id === selectedPart.id)
    : -1;
  const canAssign =
    track.mode === "graded" && track.parts.some(partHasHomeworkContent);
  const modeCopy = ACTIVITY_TRACK_MODE_COPY[track.mode];
  const reviewIssues = useMemo(() => trackReviewIssues(track), [track]);
  const readyToAssign = canAssign && reviewIssues.length === 0;

  const workflow = useMemo<StepTarget[]>(
    () => [
      { selection: { type: "track" }, step: "track-setup" },
      { selection: { type: "track" }, step: "track-activities" },
      ...track.parts.flatMap(
        (part): StepTarget[] => [
          {
            selection: { type: "part", partId: part.id },
            step: "part-setup",
          },
          {
            selection: { type: "part", partId: part.id },
            step: "part-content",
          },
          {
            selection: { type: "part", partId: part.id },
            step: "part-review",
          },
        ],
      ),
      { selection: { type: "track" }, step: "track-support" },
      { selection: { type: "track" }, step: "track-media" },
      { selection: { type: "track" }, step: "track-points" },
      { selection: { type: "track" }, step: "track-design" },
      { selection: { type: "track" }, step: "track-review" },
    ],
    [track.parts],
  );
  const currentIndex = Math.max(
    0,
    workflow.findIndex((target) => sameTarget(target, selection, step)),
  );
  const previousTarget = workflow[currentIndex - 1] ?? null;
  const nextTarget = workflow[currentIndex + 1] ?? null;

  const selectTrack = (nextStep: GradedTrackStep) => {
    onSelectionChange({ type: "track" }, nextStep);
    setMobileView("edit");
  };
  const selectPart = (partId: string, nextStep: GradedPartStep) => {
    onSelectionChange({ type: "part", partId }, nextStep);
    setMobileView("edit");
  };
  const navigate = (target: StepTarget) => {
    onSelectionChange(target.selection, target.step);
    setMobileView("edit");
  };
  const preview = (device: "desktop" | "tablet" | "mobile") => {
    setPreviewDevice(device);
    setMobileView("preview");
  };

  const clampEditorPercent = (percent: number) => {
    const width = layoutRef.current?.getBoundingClientRect().width ?? 1200;
    const minimum = Math.max(38, Math.min(58, (480 / width) * 100));
    const maximum = Math.min(70, Math.max(minimum, ((width - 340) / width) * 100));
    return Math.min(maximum, Math.max(minimum, percent));
  };

  const resizeEditor = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const bounds = layoutRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setEditorPercent(clampEditorPercent(((event.clientX - bounds.left) / bounds.width) * 100));
  };
  const confirmRemove = (partId: string) => {
    const part = track.parts.find((entry) => entry.id === partId);
    if (!part || !window.confirm("Remove “" + part.label + "”?")) return;
    onRemovePart(partId);
  };

  const stageMeta = (() => {
    if (step === "track-setup") {
      return { eyebrow: "Step 1", title: "Track setup", tone: "text-teal-100" };
    }
    if (step === "track-activities") {
      return { eyebrow: "Step 2", title: "Activity sequence", tone: "text-sky-100" };
    }
    if (step === "track-support") {
      return { eyebrow: "Step 3", title: "Support", tone: "text-cyan-100" };
    }
    if (step === "track-media") {
      return { eyebrow: "Step 4", title: "Media", tone: "text-indigo-100" };
    }
    if (step === "track-points") {
      return { eyebrow: "Step 5", title: "Points & rewards", tone: "text-amber-100" };
    }
    if (step === "track-design") {
      return { eyebrow: "Step 6", title: "Design", tone: "text-violet-100" };
    }
    if (step === "track-review") {
      return {
        eyebrow: "Step 7",
        title: "Review and assign",
        tone: "text-emerald-100",
      };
    }
    const partNumber = selectedPartIndex >= 0 ? selectedPartIndex + 1 : 0;
    return {
      eyebrow: "Activity " + partNumber + " of " + track.parts.length,
      title:
        step === "part-setup"
          ? "Setup and directions"
          : step === "part-content"
            ? selectedPart
              ? `${activityItemNoun(selectedPart).replace(/^./, (letter) => letter.toUpperCase())}s`
              : "Student content"
            : "Review activity",
      tone: "text-sky-100",
    };
  })();

  const stageContent =
    step === "track-setup" ? (
      <GradedTrackSetupStep
        document={track}
        onPatch={onPatchDocument}
        onModeChange={onModeChange}
      />
    ) : step === "track-activities" ? (
      <GradedTrackActivitiesStep
        document={track}
        onAdd={() => setAddOpen(true)}
        onEdit={(partId) => selectPart(partId, "part-content")}
        onMove={onMovePart}
        onDuplicate={onDuplicatePart}
        onRemove={confirmRemove}
        onResetFromOrigin={onResetFromOrigin}
      />
    ) : step === "track-support" ? (
      <GradedTrackSupportStep
        document={track}
        onPatch={onPatchDocument}
        onEditActivity={(partId) => selectPart(partId, "part-setup")}
      />
    ) : step === "track-media" ? (
      <GradedTrackMediaStep
        document={track}
        onEditActivity={(partId) => selectPart(partId, "part-content")}
        onOpenDesign={() => selectTrack("track-design")}
      />
    ) : step === "track-points" ? (
      <GradedTrackPointsStep
        document={track}
        onPatch={onPatchDocument}
        onEditActivity={(partId) => selectPart(partId, "part-content")}
      />
    ) : step === "track-design" ? (
      <GradedTrackDesignStep
        document={track}
        onPatch={onPatchDocument}
        onExpandPreview={() => setEditorPercent(clampEditorPercent(40))}
      />
    ) : step === "track-review" ? (
      <GradedTrackReviewStep
        document={track}
        canAssign={canAssign}
        onPreview={preview}
        onNavigate={selectTrack}
        onSave={onSave}
        onAssign={onOpenAssign}
      />
    ) : selectedPart ? (
      <GradedTrackPartStep
        document={track}
        part={selectedPart}
        step={step}
        onPatch={onPatchDocument}
      />
    ) : (
      <GradedTrackActivitiesStep
        document={track}
        onAdd={() => setAddOpen(true)}
        onEdit={(partId) => selectPart(partId, "part-content")}
        onMove={onMovePart}
        onDuplicate={onDuplicatePart}
        onRemove={confirmRemove}
        onResetFromOrigin={onResetFromOrigin}
      />
    );

  const tree = (
    <GradedTrackAuthoringTree
      document={track}
      selection={selection}
      step={step}
      onSelectTrack={selectTrack}
      onSelectPart={selectPart}
      onAddPart={() => setAddOpen(true)}
      onMovePart={onMovePart}
      onDuplicatePart={onDuplicatePart}
      onRemovePart={confirmRemove}
    />
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-stone-100">
      <header className="flex items-center justify-between gap-2 border-b border-stone-200 bg-white px-2.5 py-2 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            href="/teacher/activity-builder/tracks"
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-stone-300 px-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tracks</span>
          </Link>
          <input
            value={track.title}
            onChange={(event) =>
              onPatchDocument((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            className="min-w-0 flex-1 truncate rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-sm font-extrabold text-stone-950 outline-none hover:border-stone-300 focus:border-stone-400 sm:max-w-sm sm:text-base"
            aria-label="Track title"
          />
          <span
            className={
              "hidden rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide md:inline-flex " +
              modeBadgeClass(track.mode)
            }
          >
            {modeCopy.title}
          </span>
        </div>

        <div className="hidden items-center gap-1 rounded-xl bg-stone-100 p-1 min-[900px]:flex">
          <button
            type="button"
            onClick={() => selectTrack("track-setup")}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-bold text-teal-800 shadow-sm"
          >
            <Pencil className="h-3.5 w-3.5" />
            Create
          </button>
          <button
            type="button"
            onClick={() => preview(previewDevice)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-stone-600"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
          <button
            type="button"
            disabled={!readyToAssign}
            onClick={onOpenAssign}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-stone-600 disabled:opacity-40"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            Assign
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {saveFlash ? (
            <span className="hidden text-xs font-bold text-emerald-700 sm:inline">
              Saved
            </span>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-stone-900 px-2.5 text-xs font-bold text-white sm:px-3"
          >
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            type="button"
            disabled={!readyToAssign}
            onClick={onOpenAssign}
            className="inline-flex min-h-9 items-center rounded-lg bg-amber-600 px-2.5 text-xs font-bold text-white disabled:bg-stone-200 disabled:text-stone-500 sm:px-3"
          >
            Assign
          </button>
        </div>
      </header>

      {assignNotice ? (
        <button
          type="button"
          onClick={onDismissAssignNotice}
          className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-left text-xs font-bold text-emerald-900"
        >
          {assignNotice} ×
        </button>
      ) : null}

      <div className="grid grid-cols-2 gap-1 border-b border-stone-200 bg-white p-1.5 min-[900px]:hidden">
        <button
          type="button"
          onClick={() => setMobileView("edit")}
          className={
            "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-extrabold " +
            (mobileView === "edit"
              ? "bg-teal-700 text-white"
              : "text-stone-500")
          }
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => setMobileView("preview")}
          className={
            "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-extrabold " +
            (mobileView === "preview"
              ? "bg-teal-700 text-white"
              : "text-stone-500")
          }
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>
      </div>

      <div
        ref={layoutRef}
        style={{ "--editor-column": `${editorPercent}%` } as CSSProperties}
        className="grid min-h-0 min-w-0 flex-1 grid-cols-1 overflow-hidden min-[900px]:grid-cols-[var(--editor-column)_0.5rem_minmax(0,1fr)]"
      >
        <section
          className={
            (mobileView === "edit" ? "block " : "hidden ") +
            "min-h-0 min-w-0 overflow-y-auto bg-[#2f8f8b] min-[900px]:block"
          }
        >
          <div className="min-h-full min-[900px]:grid min-[900px]:grid-cols-[13rem_minmax(0,1fr)]">
            <aside className="sticky top-0 hidden min-h-full self-start bg-[#075d5a] p-3 min-[900px]:block">
              {tree}
            </aside>
            <div className="min-w-0 p-3 sm:p-4">
              <details className="mb-3 rounded-xl bg-[#075d5a] p-3 min-[900px]:hidden">
                <summary className="cursor-pointer list-none text-xs font-extrabold text-white">
                  Authoring steps · {stageMeta.title}
                </summary>
                <div className="mt-4 border-t border-white/10 pt-3">{tree}</div>
              </details>

              <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={
                      "text-[10px] font-extrabold uppercase tracking-[0.16em] " +
                      stageMeta.tone
                    }
                  >
                    {stageMeta.eyebrow}
                  </p>
                  <h1 className="mt-1 truncate text-xl font-black text-white">
                    {stageMeta.title}
                  </h1>
                  {selectedPart ? (
                    <p className="mt-1 truncate text-xs font-semibold text-white/75">
                      {selectedPart.label} · {partTypeLabel(selectedPart)}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-stone-500 shadow-sm">
                  {currentIndex + 1} of {workflow.length}
                </span>
              </div>

              <div className="min-w-0 rounded-2xl bg-white p-4 shadow-lg shadow-teal-950/10 sm:p-5">
                {stageContent}
              </div>

              <div className="sticky bottom-0 z-10 mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/20 bg-[#2f8f8b]/95 p-2 backdrop-blur">
                <button
                  type="button"
                  disabled={!previousTarget}
                  onClick={() => previousTarget && navigate(previousTarget)}
                  className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-stone-300 bg-white px-3 text-xs font-extrabold text-stone-700 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                {nextTarget ? (
                  <button
                    type="button"
                    onClick={() => navigate(nextTarget)}
                    className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-teal-700 px-4 text-xs font-extrabold text-white"
                  >
                    Save & continue
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!readyToAssign}
                    onClick={onOpenAssign}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-amber-600 px-4 text-xs font-extrabold text-white disabled:bg-stone-200 disabled:text-stone-500"
                  >
                    Assign
                    <ClipboardCheck className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <div
          role="separator"
          aria-label="Resize teacher editor and student preview"
          aria-orientation="vertical"
          aria-valuemin={38}
          aria-valuemax={70}
          aria-valuenow={Math.round(editorPercent)}
          tabIndex={0}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={resizeEditor}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              setEditorPercent((current) => clampEditorPercent(current - 2));
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              setEditorPercent((current) => clampEditorPercent(current + 2));
            }
          }}
          className="group hidden cursor-col-resize items-center justify-center bg-stone-300 outline-none hover:bg-teal-600 focus:bg-teal-600 min-[900px]:flex"
        >
          <GripVertical className="h-5 w-5 text-stone-500 group-hover:text-white group-focus:text-white" />
        </div>

        <section
          className={
            (mobileView === "preview" ? "flex " : "hidden ") +
            "min-h-0 min-w-0 flex-col border-l border-stone-200 bg-stone-200 min-[900px]:flex"
          }
        >
          <div className="flex min-h-12 items-center justify-between gap-3 border-b border-stone-200 bg-white px-3 py-2">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-stone-500">
                Live student viewport
              </p>
              <p className="text-xs font-bold text-stone-900">
                {previewDevice === "mobile"
                  ? "390px mobile"
                  : previewDevice === "tablet"
                    ? "768px tablet"
                    : "1024px desktop"}
              </p>
            </div>
            <div className="grid grid-cols-3 rounded-xl bg-stone-100 p-1">
              {(
                [
                  ["desktop", "Desktop", Monitor],
                  ["tablet", "Tablet", Tablet],
                  ["mobile", "Mobile", Smartphone],
                ] as const
              ).map(([device, label, DeviceIcon]) => (
                <button
                  key={device}
                  type="button"
                  onClick={() => setPreviewDevice(device)}
                  aria-pressed={previewDevice === device}
                  aria-label={`${label} student viewport`}
                  className={
                    "inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-bold " +
                    (previewDevice === device
                      ? "bg-teal-800 text-white shadow-sm"
                      : "text-stone-500")
                  }
                >
                  <DeviceIcon className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 p-2 sm:p-3">
            <LiveActivityTrackPreview
              document={track}
              focusPartId={selectedPart?.id ?? null}
              device={previewDevice}
            />
          </div>
        </section>
      </div>

      {addOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add activity"
        >
          <button
            type="button"
            onClick={() => setAddOpen(false)}
            aria-label="Close add activity"
            className="absolute inset-0 bg-stone-950/50"
          />
          <section className="relative z-10 max-h-[80dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-sky-700">
                  Student activity
                </p>
                <h2 className="mt-1 text-lg font-black text-stone-950">
                  Choose an activity type
                </h2>
                <p className="mt-1 text-xs font-semibold text-stone-600">
                  Every option opens its complete authoring editor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                aria-label="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 text-stone-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ACTIVITY_TRACK_PART_CATALOG.filter((entry) =>
                gradedPartKindsForOrigin(track.gradedOrigin).includes(entry.kind),
              ).map((entry) => (
                <button
                  key={entry.kind}
                  type="button"
                  onClick={() => {
                    onAddPart(entry.kind);
                    setAddOpen(false);
                  }}
                  className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-left hover:border-sky-400 hover:bg-sky-50"
                >
                  <span className="block text-sm font-extrabold text-stone-950">
                    {entry.label}
                  </span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-stone-600">
                    {entry.description}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
