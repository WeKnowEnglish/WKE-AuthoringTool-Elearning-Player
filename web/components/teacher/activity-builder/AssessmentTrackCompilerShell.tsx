"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ArrowLeft, PanelLeft, PanelLeftClose, Save } from "lucide-react";
import { listAssessmentParts, assessmentDefinitionNeedsNormalize, normalizeAssessmentDefinition, bumpAssessmentContentVersion, listAssessmentAssignIssues, type AssessmentPart } from "@/lib/assessment";
import {
  ACTIVITY_TRACK_MODE_COPY,
  resetAssessmentFromOrigin,
  persistActivityTrackDraft,
  seedGradedFromTemplate,
  seedPracticeComposition,
  type ActivityTrackDocument,
  type ActivityTrackMode,
} from "@/lib/activity-tracks";
import { patchAssessmentDefinitionPart } from "@/lib/activity-tracks/patch-assessment-part";
import { AssessmentPartChrome } from "@/components/teacher/activity-builder/AssessmentPartChrome";
import { AssessmentInspectorSection } from "@/components/teacher/activity-builder/AssessmentInspectorSection";
import { AssessmentPictureYesNoPartEditor } from "@/components/teacher/activity-builder/AssessmentPictureYesNoPartEditor";
import { AssessmentDefinitionMatchPartEditor } from "@/components/teacher/activity-builder/AssessmentDefinitionMatchPartEditor";
import { AssessmentShortAnswerReadingPartEditor } from "@/components/teacher/activity-builder/AssessmentShortAnswerReadingPartEditor";
import { AssessmentDialogueBankPartEditor } from "@/components/teacher/activity-builder/AssessmentDialogueBankPartEditor";
import { AssessmentStoryBankTitlePartEditor } from "@/components/teacher/activity-builder/AssessmentStoryBankTitlePartEditor";
import { AssessmentClozeChoicePartEditor } from "@/components/teacher/activity-builder/AssessmentClozeChoicePartEditor";
import { AssessmentClozeOpenPartEditor } from "@/components/teacher/activity-builder/AssessmentClozeOpenPartEditor";
import { AssessmentListeningCharacterMatchPartEditor } from "@/components/teacher/activity-builder/AssessmentListeningCharacterMatchPartEditor";
import { AssessmentListeningInformationPartEditor } from "@/components/teacher/activity-builder/AssessmentListeningInformationPartEditor";
import { AssessmentListeningItemMatchPartEditor } from "@/components/teacher/activity-builder/AssessmentListeningItemMatchPartEditor";
import { AssessmentListeningPictureChoicePartEditor } from "@/components/teacher/activity-builder/AssessmentListeningPictureChoicePartEditor";
import { AssessmentListeningColourPicturePartEditor } from "@/components/teacher/activity-builder/AssessmentListeningColourPicturePartEditor";
import { AssessmentSpeakingPictureDifferencesPartEditor } from "@/components/teacher/activity-builder/AssessmentSpeakingPictureDifferencesPartEditor";
import { AssessmentSpeakingQuestionExchangePartEditor } from "@/components/teacher/activity-builder/AssessmentSpeakingQuestionExchangePartEditor";
import { AssessmentSpeakingPictureStoryPartEditor } from "@/components/teacher/activity-builder/AssessmentSpeakingPictureStoryPartEditor";
import { AssessmentTrackStudentPreview } from "@/components/teacher/activity-builder/AssessmentTrackStudentPreview";
import { AssignAssessmentTrackOverlay } from "@/components/teacher/activity-builder/AssignAssessmentTrackOverlay";

type Props = {
  document: ActivityTrackDocument;
  onDocumentChange: (next: ActivityTrackDocument) => void;
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
const SETTINGS_WIDTH = 220;

function clampInspectorWidth(
  width: number,
  layoutWidth: number,
  settingsOpen: boolean,
) {
  const settingsWidth = settingsOpen ? SETTINGS_WIDTH : 0;
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

function partKindLabel(kind: AssessmentPart["kind"]): string {
  return kind.replaceAll("_", " ");
}

/**
 * Assessment track workspace: settings, live student preview, part timeline,
 * and part inspectors.
 */
export function AssessmentTrackCompilerShell({
  document: doc,
  onDocumentChange,
  classes = [],
  classLoadError = false,
}: Props) {
  const [saveFlash, setSaveFlash] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [selection, setSelection] = useState<Selection>({ type: "track" });
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignNotice, setAssignNotice] = useState<string | null>(null);
  const [inspectorWidth, setInspectorWidth] = useState(INSPECTOR_WIDTH_DEFAULT);
  const [inspectorResizing, setInspectorResizing] = useState(false);
  const [draftStatus, setDraftStatus] = useState<
    "saved" | "dirty" | "saving" | "local_only"
  >("saved");
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const inspectorDragRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  );
  const inspectorWidthRef = useRef(inspectorWidth);
  inspectorWidthRef.current = inspectorWidth;
  const pendingDraftRef = useRef<ActivityTrackDocument | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);

  const definition = useMemo(
    () =>
      doc.assessmentDefinition
        ? normalizeAssessmentDefinition(doc.assessmentDefinition)
        : null,
    [doc.assessmentDefinition],
  );

  useEffect(() => {
    if (!doc.assessmentDefinition) return;
    if (!assessmentDefinitionNeedsNormalize(doc.assessmentDefinition)) return;
    const next = {
      ...doc,
      assessmentDefinition: normalizeAssessmentDefinition(
        doc.assessmentDefinition,
      ),
    };
    onDocumentChange(next);
    pendingDraftRef.current = next;
    void persistActivityTrackDraft(next).then(({ cloudSaved }) => {
      setDraftStatus(cloudSaved ? "saved" : "local_only");
    });
    // Migrate legacy drafts once; avoid depending on commitDoc identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.assessmentDefinition]);

  const canAssign = Boolean(definition);
  const parts = useMemo(
    () => (definition ? listAssessmentParts(definition) : []),
    [definition],
  );
  const modeCopy = ACTIVITY_TRACK_MODE_COPY.assessment;
  const selectedPart =
    selection.type === "part"
      ? (parts.find((part) => part.id === selection.partId) ?? null)
      : null;
  const selectedSectionTitle = selectedPart
    ? (definition?.sections.find((section) =>
        section.parts.some((part) => part.id === selectedPart.id),
      )?.title ?? "Assessment")
    : null;

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

  const commitDoc = useCallback(
    (next: ActivityTrackDocument) => {
    onDocumentChange(next);
    pendingDraftRef.current = next;
    setDraftStatus("dirty");
    if (autosaveTimerRef.current != null) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      const pending = pendingDraftRef.current;
      if (!pending) return;
      setDraftStatus("saving");
      void persistActivityTrackDraft(pending).then(({ cloudSaved }) => {
        pendingDraftRef.current = null;
        setDraftStatus(cloudSaved ? "saved" : "local_only");
        autosaveTimerRef.current = null;
      });
    }, 600);
    },
    [onDocumentChange],
  );

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (pendingDraftRef.current) {
        void persistActivityTrackDraft(pendingDraftRef.current);
        pendingDraftRef.current = null;
      }
      if (draftStatus === "dirty" || draftStatus === "saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (autosaveTimerRef.current != null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      if (pendingDraftRef.current) {
        void persistActivityTrackDraft(pendingDraftRef.current);
        pendingDraftRef.current = null;
      }
    };
  }, [draftStatus]);

  const persist = useCallback(
    (next: ActivityTrackDocument) => {
      if (autosaveTimerRef.current != null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      pendingDraftRef.current = null;
      setDraftStatus("saving");
      void persistActivityTrackDraft(next).then(({ doc: saved, cloudSaved }) => {
        onDocumentChange(saved);
        setDraftStatus(cloudSaved ? "saved" : "local_only");
      });
      return next;
    },
    [onDocumentChange],
  );

  const handleSave = () => {
    if (!doc.assessmentDefinition) {
      persist(doc);
    } else {
      const nextDefinition = {
        ...doc.assessmentDefinition,
        contentVersion: bumpAssessmentContentVersion(
          doc.assessmentDefinition.contentVersion,
        ),
      };
      persist({
        ...doc,
        assessmentDefinition: nextDefinition,
      });
    }
    setSaveFlash(true);
    window.setTimeout(() => setSaveFlash(false), 1600);
  };

  const openAssign = () => {
    if (!doc.assessmentDefinition) return;
    const readiness = listAssessmentAssignIssues(
      normalizeAssessmentDefinition(doc.assessmentDefinition),
    );
    if (readiness.length > 0) {
      const preview = readiness
        .slice(0, 3)
        .map((item) => `${item.partTitle}: ${item.message}`)
        .join("\n");
      const more =
        readiness.length > 3 ? `\n(+${readiness.length - 3} more)` : "";
      window.alert(`Fix before assign:\n${preview}${more}`);
      return;
    }
    const nextDefinition = {
      ...doc.assessmentDefinition,
      contentVersion: bumpAssessmentContentVersion(
        doc.assessmentDefinition.contentVersion,
      ),
    };
    persist({
      ...doc,
      assessmentDefinition: nextDefinition,
    });
    setAssignOpen(true);
  };

  const updateSelectedPart = (nextPart: AssessmentPart) => {
    if (!definition) return;
    commitDoc({
      ...doc,
      assessmentDefinition: patchAssessmentDefinitionPart(
        definition,
        nextPart.id,
        nextPart,
      ),
    });
  };

  const handleModeChange = (nextMode: ActivityTrackMode) => {
    if (nextMode === doc.mode) return;
    if (nextMode === "practice") {
      const ok = window.confirm(
        "Switch to Practice? This loads the Learning Track compiler. Assessment content will be cleared.",
      );
      if (!ok) return;
      const composition = seedPracticeComposition({
        trackId: doc.id,
        title: doc.title,
      });
      persist({
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
      return;
    }
    if (nextMode === "graded") {
      const ok = window.confirm(
        "Switch to Graded? This clones Primary Homework Template One. Assessment content will be cleared.",
      );
      if (!ok) return;
      const graded = seedGradedFromTemplate({
        trackId: doc.id,
        title: doc.title,
        templateId: "homework-template-one",
      });
      persist({
        ...graded,
        createdAt: doc.createdAt,
      });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-stone-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            href="/teacher/activity-builder/tracks"
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-stone-300 px-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Tracks
          </Link>
          <input
            value={doc.title}
            onChange={(event) =>
              commitDoc({ ...doc, title: event.target.value })
            }
            className="min-w-[12rem] max-w-md truncate rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-extrabold text-stone-900 outline-none hover:border-stone-300 focus:border-stone-400"
            aria-label="Track title"
          />
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${modeBadgeClass("assessment")}`}
          >
            {modeCopy.title}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {draftStatus === "dirty" ? (
            <span className="text-xs font-bold text-amber-700">Unsaved…</span>
          ) : draftStatus === "saving" ? (
            <span className="text-xs font-bold text-stone-500">Saving…</span>
          ) : draftStatus === "local_only" ? (
            <span className="text-xs font-bold text-amber-700">Saved locally only</span>
          ) : saveFlash ? (
            <span className="text-xs font-bold text-emerald-700">Saved</span>
          ) : (
            <span className="text-xs font-bold text-stone-400">Saved to account</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            title="Save now and bump content version"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-stone-900 px-3 text-xs font-bold text-white hover:bg-stone-800"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
          <button
            type="button"
            disabled={!canAssign}
            title={
              canAssign
                ? "Freeze assessment content and assign to a class"
                : "Seed an assessment definition before assigning"
            }
            onClick={openAssign}
            className="inline-flex min-h-9 items-center rounded-lg border border-violet-700 bg-violet-700 px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-50 disabled:text-stone-400"
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
            ? "lg:grid-cols-[220px_minmax(0,1fr)_var(--inspector-w)]"
            : "lg:grid-cols-[minmax(0,1fr)_var(--inspector-w)]"
        } ${inspectorResizing ? "select-none" : ""}`}
      >
        <button
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          aria-expanded={settingsOpen}
          aria-label={
            settingsOpen ? "Collapse track settings" : "Expand track settings"
          }
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
              <div className="mt-2 grid grid-cols-1 gap-1.5">
                {(["practice", "graded", "assessment"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleModeChange(mode)}
                    className={`rounded-lg px-2 py-2 text-left text-xs font-bold ${
                      doc.mode === mode
                        ? mode === "assessment"
                          ? "bg-violet-600 text-white"
                          : mode === "graded"
                            ? "bg-amber-500 text-white"
                            : "bg-sky-600 text-white"
                        : "border border-stone-200 bg-stone-50 text-stone-700"
                    }`}
                  >
                    {ACTIVITY_TRACK_MODE_COPY[mode].title}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-stone-600">
                {modeCopy.blurb}
              </p>
              {doc.assessmentOrigin ? (
                <p className="mt-2 rounded-lg bg-violet-50 px-2.5 py-2 text-[11px] font-semibold text-violet-950">
                  Cloned from{" "}
                  <span className="font-extrabold">
                    {doc.assessmentOrigin.definitionId}
                  </span>
                  <span className="mt-0.5 block font-medium opacity-80">
                    content{" "}
                    {definition?.contentVersion ??
                      doc.assessmentOrigin.contentVersion}
                  </span>
                </p>
              ) : null}
            </div>

            {doc.assessmentOrigin ? (
              <button
                type="button"
                onClick={() => {
                  if (
                    !window.confirm(
                      "Reset all assessment content from the Primary A2 template? Edits will be lost.",
                    )
                  ) {
                    return;
                  }
                  persist(resetAssessmentFromOrigin(doc));
                  setSelection({ type: "track" });
                }}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
              >
                Reset from template
              </button>
            ) : null}

            <label className="block text-xs font-bold text-stone-800">
              Instructions
              <textarea
                value={doc.instructions}
                onChange={(event) =>
                  commitDoc({ ...doc, instructions: event.target.value })
                }
                rows={4}
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
              className="absolute inset-0 overflow-hidden bg-white"
              data-student-surface
            >
              <AssessmentTrackStudentPreview
                doc={doc}
                focusPartId={
                  selection.type === "part" ? selection.partId : null
                }
              />
            </div>
          </div>
        </section>

        <aside className="relative flex min-h-0 flex-col border-t border-stone-200 bg-white lg:border-t-0 lg:border-l">
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
              inspectorResizing ? "bg-violet-400/25" : "hover:bg-violet-400/20"
            }`}
          >
            <span
              aria-hidden
              className={`absolute top-1/2 left-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                inspectorResizing ? "bg-violet-500" : "bg-stone-300"
              }`}
            />
          </div>

          <div className="max-h-[min(40vh,280px)] shrink-0 overflow-y-auto border-b border-stone-200 px-4 pb-3 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
              Parts
            </p>
            {!definition ? (
              <p className="mt-3 text-xs font-semibold text-stone-500">
                No assessment definition loaded.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {definition.sections.map((section) => (
                  <div key={section.id}>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                      {section.title}
                    </p>
                    <ol className="space-y-1">
                      {section.parts.map((part) => {
                        const active =
                          selection.type === "part" &&
                          selection.partId === part.id;
                        return (
                          <li key={part.id}>
                            <button
                              type="button"
                              onClick={() =>
                                setSelection({ type: "part", partId: part.id })
                              }
                              className={`w-full rounded-lg border px-2.5 py-2 text-left ${
                                active
                                  ? "border-violet-700 bg-violet-700 text-white"
                                  : "border-stone-200 bg-stone-50 text-stone-800 hover:border-stone-400"
                              }`}
                            >
                              <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                                Part {part.partNumber}
                              </p>
                              <p className="mt-0.5 text-xs font-extrabold">
                                {part.title}
                              </p>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {selection.type === "track" ? (
              <div className="space-y-2 text-xs font-semibold leading-5 text-stone-600">
                <p>
                  {definition
                    ? `${definition.sections.length} sections · ${parts.length} parts · ~${definition.estimatedMinutes} min`
                    : "Seed a template to inspect parts."}
                </p>
                <p className="rounded-lg bg-violet-50 px-2.5 py-2 text-[11px] text-violet-950">
                  Select a part above to edit questions. Title and instructions
                  live under Part setup when a part is open.
                </p>
              </div>
            ) : selectedPart ? (
              <div className="space-y-3">
                {selectedPart.kind === "picture_yes_no" ? (
                  <AssessmentPictureYesNoPartEditor
                    part={selectedPart}
                    onChange={updateSelectedPart}
                  />
                ) : selectedPart.kind === "definition_match" ? (
                  <AssessmentDefinitionMatchPartEditor
                    part={selectedPart}
                    onChange={updateSelectedPart}
                  />
                ) : selectedPart.kind === "short_answer_reading" ? (
                  <AssessmentShortAnswerReadingPartEditor
                    part={selectedPart}
                    onChange={updateSelectedPart}
                  />
                ) : selectedPart.kind === "dialogue_bank" ? (
                  <AssessmentDialogueBankPartEditor
                    part={selectedPart}
                    onChange={updateSelectedPart}
                  />
                ) : selectedPart.kind === "story_bank_title" ? (
                  <AssessmentStoryBankTitlePartEditor
                    part={selectedPart}
                    onChange={updateSelectedPart}
                  />
                ) : selectedPart.kind === "cloze_choice" ? (
                  <AssessmentClozeChoicePartEditor
                    part={selectedPart}
                    onChange={updateSelectedPart}
                  />
                ) : selectedPart.kind === "cloze_open" ? (
                  <AssessmentClozeOpenPartEditor
                    part={selectedPart}
                    onChange={updateSelectedPart}
                  />
                ) : selectedPart.kind === "listening_character_match" ? (
                  <AssessmentListeningCharacterMatchPartEditor
                    part={selectedPart}
                    onChange={updateSelectedPart}
                  />
                ) : selectedPart.kind === "listening_information" ? (
                  <AssessmentListeningInformationPartEditor
                    part={selectedPart}
                    onChange={updateSelectedPart}
                  />
                ) : selectedPart.kind === "listening_item_match" ? (
                  <AssessmentListeningItemMatchPartEditor
                    part={selectedPart}
                    onChange={updateSelectedPart}
                  />
                ) : selectedPart.kind === "listening_picture_choice" ? (
                  <AssessmentListeningPictureChoicePartEditor
                    part={selectedPart}
                    onChange={updateSelectedPart}
                  />
                ) : selectedPart.kind === "listening_colour_picture" ? (
                  <AssessmentListeningColourPicturePartEditor
                    part={selectedPart}
                    onChange={updateSelectedPart}
                  />
                ) : selectedPart.kind === "speaking_picture_differences" ? (
                  <AssessmentSpeakingPictureDifferencesPartEditor
                    part={selectedPart}
                    onChange={updateSelectedPart}
                  />
                ) : selectedPart.kind === "speaking_question_exchange" ? (
                  <AssessmentSpeakingQuestionExchangePartEditor
                    part={selectedPart}
                    onChange={updateSelectedPart}
                  />
                ) : selectedPart.kind === "speaking_picture_story" ? (
                  <AssessmentSpeakingPictureStoryPartEditor
                    part={selectedPart}
                    onChange={updateSelectedPart}
                  />
                ) : (
                  <p className="rounded-lg border border-dashed border-stone-300 px-2.5 py-2 text-[11px] font-semibold text-stone-500">
                    No dedicated content editor for{" "}
                    <span className="font-extrabold capitalize">
                      {partKindLabel(selectedPart.kind)}
                    </span>{" "}
                    yet.
                  </p>
                )}

                <AssessmentInspectorSection title="Part setup" defaultOpen={false}>
                  <AssessmentPartChrome
                    part={selectedPart}
                    sectionTitle={selectedSectionTitle}
                    onChange={updateSelectedPart}
                  />
                </AssessmentInspectorSection>
              </div>
            ) : (
              <p className="text-xs font-semibold text-stone-500">
                Select a part from the list above.
              </p>
            )}
          </div>
        </aside>
      </div>

      <AssignAssessmentTrackOverlay
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        document={doc}
        classes={classes}
        classLoadError={classLoadError}
        onAssigned={(homeworkId) => {
          setAssignNotice(
            `Assigned. Review later from the class hub (homework ${homeworkId.slice(0, 8)}…).`,
          );
        }}
      />
    </div>
  );
}
