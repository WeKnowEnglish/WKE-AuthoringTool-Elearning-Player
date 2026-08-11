"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  ACTIVITY_TRACK_MODE_COPY,
  ACTIVITY_TRACK_PART_CATALOG,
  createEmptyPart,
  gradedPartKindsForOrigin,
  gradedSecondarySlotTaken,
  isPartKindAllowedForMode,
  loadActivityTrackDraft,
  partHasTemplateContent,
  persistActivityTrackDraft,
  renumberParts,
  resetGradedPartsFromOrigin,
  seedGradedFromTemplate,
  seedGradedPartFromKind,
  seedPracticeComposition,
  seedAssessmentFromTemplate,
  type ActivityTrackDocument,
  type ActivityTrackLevel,
  type ActivityTrackMode,
  type ActivityTrackPartKind,
} from "@/lib/activity-tracks";
import { getHomeworkTemplateDefinition } from "@/lib/homework-templates/registry";
import {
  assessmentDefinitionNeedsNormalize,
  normalizeAssessmentDefinition,
} from "@/lib/assessment";
import {
  LearningTrackCompilerWorkspace,
  type LearningTrackCompilerDraftSync,
} from "@/components/teacher/activity-builder/LearningTrackCompilerWorkspace";
import { AssignGradedTrackOverlay } from "@/components/teacher/activity-builder/AssignGradedTrackOverlay";
import { AssessmentTrackCompilerShell } from "@/components/teacher/activity-builder/AssessmentTrackCompilerShell";
import { GradedTrackStudentPreview } from "@/components/teacher/activity-builder/GradedTrackStudentPreview";
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
import { TrackCoverImageEditor } from "@/components/teacher/activity-builder/TrackCoverImageEditor";

type Props = {
  trackId: string;
  classes?: readonly { id: string; title: string }[];
  classLoadError?: boolean;
};

type Selection =
  | { type: "track" }
  | { type: "part"; partId: string };

const INSPECTOR_WIDTH_DEFAULT = 280;
const INSPECTOR_WIDTH_MIN = 240;
const INSPECTOR_WIDTH_MAX = 640;
const INSPECTOR_WIDTH_STORAGE_KEY = "activity-track-inspector-width-px";
const INSPECTOR_CENTER_MIN = 280;

function clampInspectorWidth(width: number, layoutWidth: number, settingsOpen: boolean) {
  const settingsWidth = settingsOpen ? 240 : 0;
  const layoutMax = Math.max(
    INSPECTOR_WIDTH_MIN,
    layoutWidth - settingsWidth - INSPECTOR_CENTER_MIN,
  );
  const max = Math.min(INSPECTOR_WIDTH_MAX, layoutMax);
  return Math.min(max, Math.max(INSPECTOR_WIDTH_MIN, Math.round(width)));
}

function modeBadgeClass(mode: ActivityTrackMode) {
  if (mode === "graded") return "bg-amber-100 text-amber-900";
  if (mode === "assessment") return "bg-violet-100 text-violet-900";
  return "bg-sky-100 text-sky-900";
}

export function ActivityTrackCompilerWorkspace({
  trackId,
  classes = [],
  classLoadError = false,
}: Props) {
  const [doc, setDoc] = useState<ActivityTrackDocument | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Selection>({ type: "track" });
  const [saveFlash, setSaveFlash] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignNotice, setAssignNotice] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [inspectorWidth, setInspectorWidth] = useState(INSPECTOR_WIDTH_DEFAULT);
  const [inspectorResizing, setInspectorResizing] = useState(false);
  const docRef = useRef<ActivityTrackDocument | null>(null);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const inspectorDragRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  );
  const inspectorWidthRef = useRef(inspectorWidth);
  inspectorWidthRef.current = inspectorWidth;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(INSPECTOR_WIDTH_STORAGE_KEY);
      if (!raw) return;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return;
      setInspectorWidth(
        clampInspectorWidth(parsed, window.innerWidth, true),
      );
    } catch {
      // Ignore storage failures (private mode, quota, etc.).
    }
  }, []);

  useEffect(() => {
    if (!inspectorResizing) return;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };
  }, [inspectorResizing]);

  const persistInspectorWidth = useCallback((width: number) => {
    try {
      window.localStorage.setItem(INSPECTOR_WIDTH_STORAGE_KEY, String(width));
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const onInspectorResizePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    inspectorDragRef.current = {
      startX: event.clientX,
      startWidth: inspectorWidth,
    };
    setInspectorResizing(true);
  };

  const onInspectorResizePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const drag = inspectorDragRef.current;
    if (!drag) return;
    const layoutWidth = layoutRef.current?.clientWidth ?? window.innerWidth;
    const next = clampInspectorWidth(
      drag.startWidth + (drag.startX - event.clientX),
      layoutWidth,
      settingsOpen,
    );
    setInspectorWidth(next);
  };

  const endInspectorResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!inspectorDragRef.current) return;
    inspectorDragRef.current = null;
    setInspectorResizing(false);
    persistInspectorWidth(inspectorWidthRef.current);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const loaded = await loadActivityTrackDraft(trackId);
      if (cancelled) return;
      if (!loaded) {
        setMissing(true);
        setLoading(false);
        return;
      }
      let next = loaded;
      if (loaded.mode === "practice" && !loaded.practiceComposition) {
        next = {
          ...loaded,
          practiceComposition: seedPracticeComposition({
            trackId: loaded.id,
            title: loaded.title,
          }),
        };
        void persistActivityTrackDraft(next);
      }
      if (loaded.mode === "assessment" && !loaded.assessmentDefinition) {
        next = {
          ...seedAssessmentFromTemplate({
            trackId: loaded.id,
            title: loaded.title,
          }),
          createdAt: loaded.createdAt,
          coverImageUrl: loaded.coverImageUrl ?? null,
          libraryId: loaded.libraryId,
          bankActivityId: loaded.bankActivityId,
        };
        void persistActivityTrackDraft(next);
      }
      if (
        next.mode === "assessment" &&
        next.assessmentDefinition &&
        assessmentDefinitionNeedsNormalize(next.assessmentDefinition)
      ) {
        next = {
          ...next,
          assessmentDefinition: normalizeAssessmentDefinition(
            next.assessmentDefinition,
          ),
        };
        void persistActivityTrackDraft(next);
      }
      setDoc(next);
      docRef.current = next;
      setMissing(false);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [trackId]);

  const persistDoc = useCallback((next: ActivityTrackDocument) => {
    setDoc(next);
    docRef.current = next;
    void persistActivityTrackDraft(next).then(({ doc: saved }) => {
      setDoc(saved);
      docRef.current = saved;
    });
    return next;
  }, []);

  const gradedAutosaveTimerRef = useRef<number | null>(null);
  const gradedPendingRef = useRef<ActivityTrackDocument | null>(null);

  useEffect(() => {
    return () => {
      if (gradedAutosaveTimerRef.current != null) {
        window.clearTimeout(gradedAutosaveTimerRef.current);
        gradedAutosaveTimerRef.current = null;
      }
      if (gradedPendingRef.current) {
        void persistActivityTrackDraft(gradedPendingRef.current);
        gradedPendingRef.current = null;
      }
    };
  }, []);

  const handlePracticeDraftSync = useCallback(
    (patch: LearningTrackCompilerDraftSync) => {
      const current = docRef.current;
      if (!current || current.mode !== "practice") return;
      const next: ActivityTrackDocument = {
        ...current,
        title: patch.composition.title || current.title,
        instructions: patch.composition.aim ?? current.instructions,
        estimatedMinutes: patch.composition.durationTargetMin,
        vocabListId: patch.composition.vocabListId ?? null,
        practiceComposition: patch.composition,
        libraryId: patch.libraryId,
        bankActivityId: patch.bankActivityId,
      };
      // Avoid write thrash when LTC remount syncs identical payload.
      const same =
        current.title === next.title &&
        current.instructions === next.instructions &&
        current.estimatedMinutes === next.estimatedMinutes &&
        current.vocabListId === next.vocabListId &&
        current.libraryId === next.libraryId &&
        current.bankActivityId === next.bankActivityId &&
        JSON.stringify(current.practiceComposition) ===
          JSON.stringify(next.practiceComposition);
      if (same) return;
      persistDoc(next);
    },
    [persistDoc],
  );

  if (loading || !doc) {
    return (
      <p className="px-6 py-10 text-sm font-semibold text-stone-500">Loading track…</p>
    );
  }

  if (missing) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-lg font-extrabold text-stone-900">Track not found</p>
        <p className="max-w-md text-sm text-stone-600">
          This draft is not in your account. Create a new track or open one from the
          list.
        </p>
        <Link
          href="/teacher/activity-builder/tracks"
          className="inline-flex min-h-11 items-center rounded-xl bg-stone-900 px-5 text-sm font-bold text-white"
        >
          Back to tracks
        </Link>
      </div>
    );
  }

  // Practice = full LTC host (live preview, publish, assign).
  if (doc.mode === "practice" && doc.practiceComposition) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <TrackCoverImageEditor
          value={doc.coverImageUrl ?? ""}
          title={doc.title}
          onChange={(coverImageUrl) => persistDoc({ ...doc, coverImageUrl: coverImageUrl || null })}
        />
        <LearningTrackCompilerWorkspace
          chrome="embedded"
          classes={classes}
          classLoadError={classLoadError}
          initialComposition={doc.practiceComposition}
          initialLibraryId={doc.libraryId}
          initialBankActivityId={doc.bankActivityId}
          coverImageUrl={doc.coverImageUrl ?? null}
          onDraftSync={handlePracticeDraftSync}
        />
      </div>
    );
  }

  // Assessment = Phase 0 shell (seeded Primary A2 definition; editors later).
  if (doc.mode === "assessment") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <TrackCoverImageEditor
          value={doc.coverImageUrl ?? ""}
          title={doc.title}
          onChange={(coverImageUrl) => persistDoc({ ...doc, coverImageUrl: coverImageUrl || null })}
        />
        <AssessmentTrackCompilerShell
          document={doc}
          classes={classes}
          classLoadError={classLoadError}
          onDocumentChange={(next) => {
            setDoc(next);
            docRef.current = next;
          }}
        />
      </div>
    );
  }

  const modeCopy = ACTIVITY_TRACK_MODE_COPY[doc.mode];
  const selectedPart =
    selection.type === "part"
      ? doc.parts.find((part) => part.id === selection.partId) ?? null
      : null;
  const templateParts = doc.parts.filter(partHasTemplateContent);
  const canAssignGraded = doc.mode === "graded" && templateParts.length > 0;
  const originDefinition = doc.gradedOrigin
    ? getHomeworkTemplateDefinition(doc.gradedOrigin.templateId)
    : null;
  const selectedSection =
    selectedPart?.source.type === "template_section"
      ? selectedPart.source.section
      : null;
  const selectedInstructions =
    typeof selectedSection?.instructions === "string"
      ? selectedSection.instructions
      : "";

  const patchDoc = (updater: (prev: ActivityTrackDocument) => ActivityTrackDocument) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      docRef.current = next;
      gradedPendingRef.current = next;
      if (gradedAutosaveTimerRef.current != null) {
        window.clearTimeout(gradedAutosaveTimerRef.current);
      }
      gradedAutosaveTimerRef.current = window.setTimeout(() => {
        const pending = gradedPendingRef.current;
        if (!pending) return;
        void persistActivityTrackDraft(pending);
        gradedPendingRef.current = null;
        gradedAutosaveTimerRef.current = null;
      }, 600);
      return next;
    });
  };

  const handleSave = () => {
    if (!doc) return;
    if (gradedAutosaveTimerRef.current != null) {
      window.clearTimeout(gradedAutosaveTimerRef.current);
      gradedAutosaveTimerRef.current = null;
    }
    gradedPendingRef.current = null;
    const saved = persistDoc(doc);
    setSaveFlash(true);
    window.setTimeout(() => setSaveFlash(false), 1600);
    void saved;
  };

  const handleModeChange = (nextMode: ActivityTrackMode) => {
    if (nextMode === doc.mode) return;
    if (nextMode === "practice") {
      const ok = window.confirm(
        "Switch to Practice? This loads the Learning Track compiler (Hobbies starter). Current track content will be cleared.",
      );
      if (!ok) return;
      const composition = seedPracticeComposition({
        trackId: doc.id,
        title: doc.title,
      });
      persistDoc({
        ...doc,
        mode: "practice",
        parts: [],
        gradedOrigin: null,
        assessmentDefinition: null,
        assessmentOrigin: null,
        practiceComposition: composition,
        instructions: composition.aim,
        estimatedMinutes: composition.durationTargetMin,
        vocabListId: composition.vocabListId ?? null,
      });
      setSelection({ type: "track" });
      return;
    }
    if (nextMode === "assessment") {
      const ok = window.confirm(
        "Switch to Assessment? This clones the Primary A2 Reading & Writing paper. Current track content will be cleared.",
      );
      if (!ok) return;
      const assessment = seedAssessmentFromTemplate({
        trackId: doc.id,
        title: doc.title,
      });
      persistDoc({
        ...assessment,
        createdAt: doc.createdAt,
        coverImageUrl: doc.coverImageUrl ?? null,
      });
      setSelection({ type: "track" });
      return;
    }
    const ok = window.confirm(
      "Switch to Graded? This clones Primary Homework Template One. Current track content will be cleared.",
    );
    if (!ok) return;
    const graded = seedGradedFromTemplate({
      trackId: doc.id,
      title: doc.title,
      templateId: "homework-template-one",
    });
    persistDoc({
      ...graded,
      createdAt: doc.createdAt,
      coverImageUrl: doc.coverImageUrl ?? null,
    });
    setSelection({ type: "track" });
  };

  const addPart = (kind: ActivityTrackPartKind) => {
    if (doc.mode === "graded") {
      const level = doc.gradedOrigin?.level;
      if (!level) return;
      if (!gradedPartKindsForOrigin(doc.gradedOrigin).includes(kind)) return;
      const part = seedGradedPartFromKind({
        kind,
        order: doc.parts.length + 1,
        level,
        existingParts: doc.parts,
      });
      if (!part) return;
      patchDoc((prev) => ({
        ...prev,
        parts: renumberParts([...prev.parts, part]),
      }));
      setSelection({ type: "part", partId: part.id });
      setAddOpen(false);
      return;
    }
    if (!isPartKindAllowedForMode(kind, doc.mode)) return;
    const part = createEmptyPart(kind, doc.parts.length + 1);
    patchDoc((prev) => ({
      ...prev,
      parts: renumberParts([...prev.parts, part]),
    }));
    setSelection({ type: "part", partId: part.id });
    setAddOpen(false);
  };

  const movePart = (partId: string, direction: -1 | 1) => {
    const index = doc.parts.findIndex((part) => part.id === partId);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= doc.parts.length) return;
    const next = [...doc.parts];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    patchDoc((prev) => ({ ...prev, parts: renumberParts(next) }));
  };

  const removePart = (partId: string) => {
    if (doc.mode === "graded" && doc.parts.length <= 1) return;
    patchDoc((prev) => ({
      ...prev,
      parts: renumberParts(prev.parts.filter((part) => part.id !== partId)),
    }));
    setSelection({ type: "track" });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-stone-100">
      <TrackCoverImageEditor
        value={doc.coverImageUrl ?? ""}
        title={doc.title}
        onChange={(coverImageUrl) => patchDoc((current) => ({ ...current, coverImageUrl: coverImageUrl || null }))}
      />
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            href="/teacher/activity-builder/tracks"
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-stone-300 px-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Tracks
          </Link>
          <ChevronRight className="hidden h-4 w-4 text-stone-400 sm:block" />
          <input
            value={doc.title}
            onChange={(event) =>
              patchDoc((prev) => ({ ...prev, title: event.target.value }))
            }
            className="min-w-[12rem] max-w-md truncate rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-extrabold text-stone-900 outline-none hover:border-stone-300 focus:border-stone-400"
            aria-label="Track title"
          />
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${modeBadgeClass(doc.mode)}`}
          >
            {modeCopy.title}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {saveFlash ? (
            <span className="text-xs font-bold text-emerald-700">Saved</span>
          ) : null}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-stone-900 px-3 text-xs font-bold text-white hover:bg-stone-800"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
          <button
            type="button"
            disabled={!canAssignGraded}
            title={
              canAssignGraded
                ? "Freeze cloned content and assign to a class"
                : "Clone a template with parts before assigning"
            }
            onClick={() => {
              persistDoc(doc);
              setAssignOpen(true);
            }}
            className="inline-flex min-h-9 items-center rounded-lg border border-amber-600 bg-amber-600 px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-50 disabled:text-stone-400"
          >
            Assign
          </button>
        </div>
      </header>

      {assignNotice ? (
        <button
          type="button"
          onClick={() => setAssignNotice(null)}
          className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-left text-xs font-bold text-emerald-900"
        >
          {assignNotice} ×
        </button>
      ) : null}

      <div
        ref={layoutRef}
        style={{ ["--inspector-w" as string]: `${inspectorWidth}px` }}
        className={`relative grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden ${
          settingsOpen
            ? "lg:grid-cols-[240px_minmax(0,1fr)_var(--inspector-w)]"
            : "lg:grid-cols-[minmax(0,1fr)_var(--inspector-w)]"
        } ${inspectorResizing ? "select-none" : ""}`}
      >
        <button
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          aria-expanded={settingsOpen}
          aria-label={settingsOpen ? "Collapse track settings" : "Expand track settings"}
          title={settingsOpen ? "Hide settings" : "Show settings"}
          className="absolute left-2 top-2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 shadow-sm hover:bg-stone-50"
        >
          {settingsOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </button>

        {settingsOpen ? (
        <aside className="min-h-0 space-y-4 overflow-y-auto border-b border-stone-200 bg-white p-4 pt-12 lg:border-b-0 lg:border-r">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
              Mode
            </p>
            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {(["practice", "graded", "assessment"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleModeChange(mode)}
                  className={`rounded-lg px-2 py-2 text-xs font-bold ${
                    doc.mode === mode
                      ? mode === "graded"
                        ? "bg-amber-500 text-white"
                        : mode === "assessment"
                          ? "bg-violet-600 text-white"
                          : "bg-sky-600 text-white"
                      : "border border-stone-200 bg-stone-50 text-stone-700"
                  }`}
                >
                  {mode === "practice"
                    ? "Practice"
                    : mode === "graded"
                      ? "Graded"
                      : "Assessment"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs font-semibold leading-5 text-stone-600">
              {modeCopy.blurb}
            </p>
            {originDefinition ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-semibold text-amber-950">
                Cloned from{" "}
                <span className="font-extrabold">{originDefinition.title}</span> (
                {originDefinition.level})
              </p>
            ) : null}
          </div>

          {doc.gradedOrigin ? (
            <button
              type="button"
              onClick={() => {
                if (
                  !window.confirm(
                    "Reset all parts from the original template? Your label and instruction edits will be lost.",
                  )
                ) {
                  return;
                }
                persistDoc(resetGradedPartsFromOrigin(doc));
                setSelection({ type: "track" });
              }}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
            >
              Reset from template
            </button>
          ) : null}

          <label className="block text-xs font-bold text-stone-800">
            Level
            <select
              value={doc.level}
              onChange={(event) =>
                patchDoc((prev) => ({
                  ...prev,
                  level: event.target.value as ActivityTrackLevel,
                }))
              }
              className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-sm font-semibold"
            >
              <option value="either">Primary or Secondary</option>
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
            </select>
          </label>

          <label className="block text-xs font-bold text-stone-800">
            Est. minutes
            <input
              type="number"
              min={1}
              max={180}
              value={doc.estimatedMinutes ?? ""}
              onChange={(event) => {
                const raw = event.target.value;
                patchDoc((prev) => ({
                  ...prev,
                  estimatedMinutes: raw === "" ? null : Number(raw) || null,
                }));
              }}
              placeholder="Optional"
              className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-sm font-semibold"
            />
          </label>

          <label className="block text-xs font-bold text-stone-800">
            Instructions
            <textarea
              value={doc.instructions}
              onChange={(event) =>
                patchDoc((prev) => ({ ...prev, instructions: event.target.value }))
              }
              rows={5}
              placeholder="What should students do?"
              className="mt-1.5 w-full resize-y rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-sm font-semibold leading-5"
            />
          </label>

          <button
            type="button"
            onClick={() => setSelection({ type: "track" })}
            className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-bold ${
              selection.type === "track"
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-200 bg-stone-50 text-stone-700"
            }`}
          >
            Track details
          </button>
        </aside>
        ) : null}

        <section className="flex min-h-0 flex-col overflow-hidden">
          <div className="relative min-h-0 flex-1 overflow-hidden bg-stone-200">
            <div
              className="absolute inset-0 overflow-y-auto overflow-x-hidden bg-white"
              data-student-surface
            >
              <GradedTrackStudentPreview
                doc={doc}
                focusPartId={
                  selection.type === "part" ? selection.partId : null
                }
              />
            </div>
          </div>

          <div className="border-t border-stone-200 bg-white px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
                Timeline
              </p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAddOpen((open) => !open)}
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-stone-900 px-2.5 text-xs font-bold text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add part
                </button>
                {addOpen ? (
                  <div className="absolute right-0 bottom-full z-20 mb-2 max-h-72 w-72 overflow-y-auto rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
                    {(doc.mode === "graded"
                      ? ACTIVITY_TRACK_PART_CATALOG.filter((entry) =>
                          gradedPartKindsForOrigin(doc.gradedOrigin).includes(
                            entry.kind,
                          ),
                        )
                      : ACTIVITY_TRACK_PART_CATALOG
                    ).map((entry) => {
                      const slotTaken =
                        doc.mode === "graded" &&
                        doc.gradedOrigin?.level === "secondary" &&
                        gradedSecondarySlotTaken(doc.parts, entry.kind);
                      const allowed =
                        doc.mode === "graded"
                          ? !slotTaken
                          : isPartKindAllowedForMode(entry.kind, doc.mode);
                      return (
                        <button
                          key={entry.kind}
                          type="button"
                          disabled={!allowed}
                          title={
                            slotTaken
                              ? "This Secondary part is already on the track"
                              : allowed
                                ? entry.description
                                : "Available in Graded homework mode only"
                          }
                          onClick={() => addPart(entry.kind)}
                          className={`mb-1 w-full rounded-lg px-2.5 py-2 text-left last:mb-0 ${
                            allowed
                              ? "hover:bg-stone-100"
                              : "cursor-not-allowed opacity-40"
                          }`}
                        >
                          <p className="text-xs font-extrabold text-stone-900">
                            {entry.label}
                            {entry.gradedOnly ? (
                              <span className="ml-1 text-[10px] font-bold uppercase text-amber-700">
                                Graded
                              </span>
                            ) : null}
                          </p>
                          <p className="text-[11px] font-semibold text-stone-500">
                            {slotTaken ? "Already on this track" : entry.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            {doc.parts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-stone-300 px-3 py-4 text-center text-xs font-semibold text-stone-500">
                No parts yet — add a quiz, flashcards, or scene shell.
              </p>
            ) : (
              <ol className="flex gap-2 overflow-x-auto pb-1">
                {doc.parts.map((part, index) => {
                  const active =
                    selection.type === "part" && selection.partId === part.id;
                  return (
                    <li key={part.id} className="shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setSelection({ type: "part", partId: part.id })
                        }
                        className={`min-w-[8.5rem] rounded-xl border px-3 py-2 text-left ${
                          active
                            ? "border-stone-900 bg-stone-900 text-white"
                            : "border-stone-200 bg-stone-50 text-stone-800 hover:border-stone-400"
                        }`}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                          Part {index + 1}
                        </p>
                        <p className="mt-0.5 text-xs font-extrabold">{part.label}</p>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>

        <aside className="relative min-h-0 overflow-y-auto border-t border-stone-200 bg-white p-4 lg:border-t-0 lg:border-l">
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize inspector panel"
            aria-valuemin={INSPECTOR_WIDTH_MIN}
            aria-valuemax={INSPECTOR_WIDTH_MAX}
            aria-valuenow={inspectorWidth}
            title="Drag to resize"
            onPointerDown={onInspectorResizePointerDown}
            onPointerMove={onInspectorResizePointerMove}
            onPointerUp={endInspectorResize}
            onPointerCancel={endInspectorResize}
            className={`absolute top-0 bottom-0 left-0 z-20 hidden w-3 -translate-x-1/2 cursor-col-resize touch-none lg:block ${
              inspectorResizing ? "bg-sky-400/25" : "hover:bg-sky-400/20"
            }`}
          >
            <span
              aria-hidden
              className={`absolute top-1/2 left-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                inspectorResizing ? "bg-sky-500" : "bg-stone-300"
              }`}
            />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
            Inspector
          </p>
          {selectedPart ? (
            <div className="mt-3 space-y-3">
              <label className="block text-xs font-bold text-stone-800">
                Part label
                <input
                  value={selectedPart.label}
                  onChange={(event) => {
                    const label = event.target.value;
                    patchDoc((prev) => ({
                      ...prev,
                      parts: prev.parts.map((part) =>
                        part.id === selectedPart.id ? { ...part, label } : part,
                      ),
                    }));
                  }}
                  className="mt-1.5 w-full rounded-lg border border-stone-300 px-2.5 py-2 text-sm font-semibold"
                />
              </label>
              {selectedPart.source.type === "template_section" ? (
                <label className="block text-xs font-bold text-stone-800">
                  Section instructions
                  <textarea
                    value={selectedInstructions}
                    onChange={(event) => {
                      const instructions = event.target.value;
                      patchDoc((prev) => ({
                        ...prev,
                        parts: prev.parts.map((part) => {
                          if (
                            part.id !== selectedPart.id ||
                            part.source.type !== "template_section"
                          ) {
                            return part;
                          }
                          return {
                            ...part,
                            source: {
                              ...part.source,
                              section: {
                                ...part.source.section,
                                instructions,
                              },
                            },
                          };
                        }),
                      }));
                    }}
                    rows={4}
                    className="mt-1.5 w-full resize-y rounded-lg border border-stone-300 px-2.5 py-2 text-sm font-semibold leading-5"
                  />
                </label>
              ) : null}

              {selectedPart.source.type === "template_section"
                ? (() => {
                    const onSectionChange = (nextSection: Record<string, unknown>) => {
                      const partId = selectedPart.id;
                      patchDoc((prev) => ({
                        ...prev,
                        parts: prev.parts.map((part) => {
                          if (
                            part.id !== partId ||
                            part.source.type !== "template_section"
                          ) {
                            return part;
                          }
                          return {
                            ...part,
                            source: {
                              ...part.source,
                              section: nextSection,
                            },
                          };
                        }),
                      }));
                    };
                    if (selectedPart.kind === "picture_cloze") {
                      return (
                        <PictureClozeSectionEditor
                          section={selectedPart.source.section}
                          onChange={onSectionChange}
                        />
                      );
                    }
                    if (selectedPart.kind === "word_annotation") {
                      return (
                        <WordAnnotationSectionEditor
                          section={selectedPart.source.section}
                          onChange={onSectionChange}
                        />
                      );
                    }
                    if (selectedPart.kind === "sentence_columns") {
                      return (
                        <SentenceColumnsSectionEditor
                          section={selectedPart.source.section}
                          onChange={onSectionChange}
                        />
                      );
                    }
                    if (selectedPart.kind === "verb_table") {
                      return (
                        <VerbTableSectionEditor
                          section={selectedPart.source.section}
                          onChange={onSectionChange}
                        />
                      );
                    }
                    if (selectedPart.kind === "picture_writing") {
                      return (
                        <PictureWritingSectionEditor
                          section={selectedPart.source.section}
                          onChange={onSectionChange}
                        />
                      );
                    }
                    if (selectedPart.kind === "question_writing") {
                      return (
                        <QuestionWritingSectionEditor
                          section={selectedPart.source.section}
                          onChange={onSectionChange}
                        />
                      );
                    }
                    if (selectedPart.kind === "secondary_sequence") {
                      return (
                        <SecondarySequenceSectionEditor
                          section={selectedPart.source.section}
                          onChange={onSectionChange}
                        />
                      );
                    }
                    if (selectedPart.kind === "secondary_corrections") {
                      return (
                        <SecondaryCorrectionsSectionEditor
                          section={selectedPart.source.section}
                          onChange={onSectionChange}
                        />
                      );
                    }
                    if (selectedPart.kind === "secondary_dialogue") {
                      return (
                        <SecondaryDialogueSectionEditor
                          section={selectedPart.source.section}
                          onChange={onSectionChange}
                        />
                      );
                    }
                    if (selectedPart.kind === "secondary_questions") {
                      return (
                        <SecondaryQuestionsSectionEditor
                          section={selectedPart.source.section}
                          onChange={onSectionChange}
                        />
                      );
                    }
                    if (selectedPart.kind === "speaking_prompt") {
                      return (
                        <SecondarySpeakingSectionEditor
                          section={selectedPart.source.section}
                          onChange={onSectionChange}
                        />
                      );
                    }
                    return (
                      <p className="rounded-lg bg-stone-50 px-3 py-2 text-[11px] font-semibold text-stone-500">
                        Labels and instructions still freeze on assign for this part
                        kind.
                      </p>
                    );
                  })()
                : null}
              <p className="rounded-lg bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-600">
                Kind:{" "}
                <span className="font-extrabold text-stone-900">
                  {selectedPart.kind}
                </span>
                <br />
                Source:{" "}
                {selectedPart.source.type === "template_section"
                  ? "cloned template section (frozen on assign)"
                  : "empty shell"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => movePart(selectedPart.id, -1)}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-stone-300 px-2.5 text-xs font-bold"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  Up
                </button>
                <button
                  type="button"
                  onClick={() => movePart(selectedPart.id, 1)}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-stone-300 px-2.5 text-xs font-bold"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  Down
                </button>
                <button
                  type="button"
                  disabled={doc.mode === "graded" && doc.parts.length <= 1}
                  title={
                    doc.mode === "graded" && doc.parts.length <= 1
                      ? "Keep at least one part on a Graded track"
                      : undefined
                  }
                  onClick={() => {
                    if (!window.confirm(`Remove “${selectedPart.label}”?`)) return;
                    removePart(selectedPart.id);
                  }}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-red-200 px-2.5 text-xs font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
                {selectedPart.source.type === "template_section" ? (
                  <p className="text-[11px] font-semibold text-stone-500">
                    Removing drops this part from student homework on the next assign.
                    Use Reset from template to restore the full clone.
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-3 text-sm font-semibold text-stone-600">
              <p>
                Select a timeline part to edit its label and instructions. Assign freezes
                the full cloned pack for students and teacher review.
              </p>
              <button
                type="button"
                className="font-bold text-sky-700 underline"
                onClick={() => handleModeChange("practice")}
              >
                Switch to Practice
              </button>
            </div>
          )}
        </aside>
      </div>

      <AssignGradedTrackOverlay
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        document={doc}
        classes={classes}
        classLoadError={classLoadError}
        onAssigned={(homeworkId, classId) => {
          setAssignNotice(
            `Assigned. Review later from the class hub (homework ${homeworkId.slice(0, 8)}…).`,
          );
          void classId;
        }}
      />
    </div>
  );
}
