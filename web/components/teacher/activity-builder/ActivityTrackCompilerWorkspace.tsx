"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  gradedPartKindsForOrigin,
  loadActivityTrackDraft,
  persistActivityTrackDraft,
  renumberParts,
  resetGradedPartsFromOrigin,
  seedGradedFromTemplate,
  seedGradedPartFromKind,
  seedPracticeComposition,
  seedAssessmentFromTemplate,
  type ActivityTrackDocument,
  type ActivityTrackMode,
  type ActivityTrackPartKind,
} from "@/lib/activity-tracks";
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
import { GradedTrackAuthoringWorkspace } from "@/components/teacher/activity-builder/GradedTrackAuthoringWorkspace";
import type { GradedAuthoringStep } from "@/components/teacher/activity-builder/GradedTrackAuthoringTree";

type Props = {
  trackId: string;
  classes?: readonly { id: string; title: string }[];
  classLoadError?: boolean;
};

type Selection =
  | { type: "track" }
  | { type: "part"; partId: string };

export function ActivityTrackCompilerWorkspace({
  trackId,
  classes = [],
  classLoadError = false,
}: Props) {
  const [doc, setDoc] = useState<ActivityTrackDocument | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Selection>({ type: "track" });
  const [authoringStep, setAuthoringStep] =
    useState<GradedAuthoringStep>("track-setup");
  const [saveFlash, setSaveFlash] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignNotice, setAssignNotice] = useState<string | null>(null);
  const docRef = useRef<ActivityTrackDocument | null>(null);

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
      <LearningTrackCompilerWorkspace
        chrome="embedded"
        classes={classes}
        classLoadError={classLoadError}
        initialComposition={doc.practiceComposition}
        initialLibraryId={doc.libraryId}
        initialBankActivityId={doc.bankActivityId}
        coverImageUrl={doc.coverImageUrl ?? null}
        savedGradedPartCount={doc.modeArchive?.graded?.parts.length ?? 0}
        onRestoreGraded={() => handleModeChange("graded")}
        onCoverImageChange={(coverImageUrl) =>
          persistDoc({ ...doc, coverImageUrl: coverImageUrl || null })
        }
        onDraftSync={handlePracticeDraftSync}
      />
    );
  }

  // Assessment = Phase 0 shell (seeded Primary A2 definition; editors later).
  if (doc.mode === "assessment") {
    return (
      <AssessmentTrackCompilerShell
        document={doc}
        classes={classes}
        classLoadError={classLoadError}
        onDocumentChange={(next) => {
          setDoc(next);
          docRef.current = next;
        }}
      />
    );
  }

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
    const archive = doc.modeArchive ?? {};

    if (nextMode === "practice") {
      const ok = window.confirm(
        "Switch to Practice? Your graded homework will be saved so you can switch back without losing it.",
      );
      if (!ok) return;
      const nextArchive = { ...archive };
      if (doc.mode === "graded") {
        nextArchive.graded = {
          parts: doc.parts,
          gradedOrigin: doc.gradedOrigin,
          instructions: doc.instructions,
          estimatedMinutes: doc.estimatedMinutes,
          level: doc.level,
        };
      }
      const composition =
        archive.practice ??
        seedPracticeComposition({
          trackId: doc.id,
          title: doc.title,
        });
      persistDoc({
        ...doc,
        mode: "practice",
        modeArchive: nextArchive,
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
      setAuthoringStep("track-setup");
      return;
    }
    if (nextMode === "assessment") {
      const ok = window.confirm(
        "Switch to Assessment? Your current track will be saved so you can switch back later.",
      );
      if (!ok) return;
      const nextArchive = { ...archive };
      if (doc.mode === "graded") {
        nextArchive.graded = {
          parts: doc.parts,
          gradedOrigin: doc.gradedOrigin,
          instructions: doc.instructions,
          estimatedMinutes: doc.estimatedMinutes,
          level: doc.level,
        };
      } else if (doc.mode === "practice" && doc.practiceComposition) {
        nextArchive.practice = doc.practiceComposition;
      }
      const assessment = seedAssessmentFromTemplate({
        trackId: doc.id,
        title: doc.title,
      });
      persistDoc({
        ...assessment,
        createdAt: doc.createdAt,
        coverImageUrl: doc.coverImageUrl ?? null,
        modeArchive: nextArchive,
      });
      setSelection({ type: "track" });
      setAuthoringStep("track-setup");
      return;
    }
    const ok = window.confirm(
      archive.graded
        ? "Switch to Graded homework? Your saved graded parts will be restored."
        : "Switch to Graded? This starts from the Primary Homework Template unless you had graded content saved from an earlier switch.",
    );
    if (!ok) return;
    const nextArchive = { ...archive };
    if (doc.mode === "practice" && doc.practiceComposition) {
      nextArchive.practice = doc.practiceComposition;
    }
    if (archive.graded) {
      persistDoc({
        ...doc,
        mode: "graded",
        modeArchive: nextArchive,
        parts: archive.graded.parts,
        gradedOrigin: archive.graded.gradedOrigin,
        instructions: archive.graded.instructions,
        estimatedMinutes: archive.graded.estimatedMinutes,
        level: archive.graded.level,
        practiceComposition: null,
        assessmentDefinition: null,
        assessmentOrigin: null,
      });
    } else {
      const graded = seedGradedFromTemplate({
        trackId: doc.id,
        title: doc.title,
        templateId: "homework-template-one",
      });
      persistDoc({
        ...graded,
        createdAt: doc.createdAt,
        coverImageUrl: doc.coverImageUrl ?? null,
        modeArchive: nextArchive,
      });
    }
    setSelection({ type: "track" });
    setAuthoringStep("track-setup");
  };

  const addPart = (kind: ActivityTrackPartKind) => {
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
    setAuthoringStep("part-content");
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
    if (doc.parts.length <= 1) return;
    patchDoc((prev) => ({
      ...prev,
      parts: renumberParts(prev.parts.filter((part) => part.id !== partId)),
    }));
    setSelection({ type: "track" });
    setAuthoringStep("track-activities");
  };

  const duplicateHomeworkPart = (partId: string) => {
    const index = doc.parts.findIndex((part) => part.id === partId);
    const original = index >= 0 ? doc.parts[index] : null;
    if (!original) return;
    const nextId = crypto.randomUUID();
    const clone = (() => {
      if (original.source.type === "homework_part") {
        const clonedContent = structuredClone(original.source.part);
        clonedContent.id = nextId;
        clonedContent.title = `${clonedContent.title} copy`;
        return {
          ...original,
          id: nextId,
          label: clonedContent.title,
          source: { type: "homework_part" as const, part: clonedContent },
        };
      }
      if (original.source.type === "template_section") {
        const sectionId = `${original.source.sectionId}-${nextId.slice(0, 8)}`;
        const section = structuredClone(original.source.section);
        section.id = sectionId;
        section.partId = sectionId;
        return {
          ...original,
          id: sectionId,
          label: `${original.label} copy`,
          source: {
            type: "template_section" as const,
            sectionId,
            section,
          },
        };
      }
      return null;
    })();
    if (!clone) return;
    const next = [...doc.parts];
    next.splice(index + 1, 0, clone);
    patchDoc((prev) => ({ ...prev, parts: renumberParts(next) }));
    setSelection({ type: "part", partId: clone.id });
    setAuthoringStep("part-content");
  };

  return (
    <>
      <GradedTrackAuthoringWorkspace
        document={doc}
        selection={selection}
        step={authoringStep}
        saveFlash={saveFlash}
        assignNotice={assignNotice}
        onDismissAssignNotice={() => setAssignNotice(null)}
        onSelectionChange={(nextSelection, nextStep) => {
          setSelection(nextSelection);
          setAuthoringStep(nextStep);
        }}
        onPatchDocument={patchDoc}
        onSave={handleSave}
        onModeChange={handleModeChange}
        onAddPart={addPart}
        onMovePart={movePart}
        onDuplicatePart={duplicateHomeworkPart}
        onRemovePart={removePart}
        onResetFromOrigin={() => {
          persistDoc(resetGradedPartsFromOrigin(doc));
          setSelection({ type: "track" });
          setAuthoringStep("track-activities");
        }}
        onOpenAssign={() => {
          persistDoc(doc);
          setAssignOpen(true);
        }}
      />
      <AssignGradedTrackOverlay
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        document={doc}
        classes={classes}
        classLoadError={classLoadError}
        onAssigned={(homeworkId, classId) => {
          setAssignNotice(
            "Assigned. Review later from the class hub (homework " +
              homeworkId.slice(0, 8) +
              "…).",
          );
          void classId;
        }}
      />
    </>
  );
}
