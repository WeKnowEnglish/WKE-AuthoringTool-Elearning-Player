"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  compileAndSaveLearningTrackToLibrary,
  listActivityLibraryEntries,
  listStudioVocabularyLists,
  postLearningTrackPackToLessonPlayerInbox,
  type StudioVocabularyListRef,
} from "@/lib/activity-library";
import {
  listStudioExploreHotspots,
  type StudioExploreHotspotsRef,
} from "@/lib/hotspots";
import { downloadTextFile } from "@/lib/activity-builder/games/mc-quiz";
import { VocabularyListWorkspace } from "@/components/teacher/activity-builder/VocabularyListWorkspace";
import { AudioClipControls } from "@/components/teacher/activity-builder/AudioClipControls";
import { TrackCoverImageEditor } from "@/components/teacher/activity-builder/TrackCoverImageEditor";
import {
  AuthoringItemPager,
  useAuthoringItemIndex,
} from "@/components/teacher/activity-builder/AuthoringItemPager";
import { FitScaleViewport } from "@/components/ui/FitScaleViewport";
import {
  HOBBIES_DEFAULT_VOCAB_LIST_ID,
  LEARNING_TRACK_BEAT_KIND_OPTIONS,
  LEARNING_TRACK_BEAT_LABELS,
  beatSupportsFixture,
  beatSupportsLibrary,
  clampMcOptionCount,
  compileLearningTrackAsync,
  createBeatInstance,
  defaultFlashcardsSettings,
  defaultLetterMixupSettings,
  defaultListenAndChooseSettings,
  defaultExploreHotspotsSettings,
  defaultLanguageInFocusSettings,
  defaultMultipleChoiceSettings,
  defaultLineMatchSettings,
  defaultTrueFalseSettings,
  defaultSentenceScrambleSettings,
  defaultFillBlanksSettings,
  defaultMemorySettings,
  defaultCrosswordSettings,
  fixtureIdForKind,
  libraryFormatForBeatKind,
  listHotspotPanelsFromScreens,
  listLifExamplesFromScreens,
  listListenItemsFromScreens,
  listMcQuizItemsFromScreens,
  resolveAfterBridgePlan,
  addHotspotDialogueTurnCard,
  removeHotspotDialogueTurnCard,
  patchHotspotDialogueTurnCard,
  patchHotspotPanelTitle,
  upsertLifExampleOverlay,
  upsertListenItemOverlay,
  upsertMcItemOverlay,
  vocabCompileFormatForBeatKind,
  type LearningTrackBeatKind,
  type LearningTrackBeatPlan,
  type LearningTrackBeatPresentation,
  type LearningTrackBeatSource,
  type LearningTrackComposition,
  type LearningTrackFlashcardsSettings,
  type LearningTrackLetterMixupSettings,
  type LearningTrackListenAndChooseSettings,
  type LearningTrackExploreHotspotsSettings,
  type LearningTrackLanguageInFocusSettings,
  type LearningTrackLessonPlayerPack,
  type LearningTrackMultipleChoiceSettings,
  type LearningTrackLineMatchSettings,
  type LearningTrackTrueFalseSettings,
  type LearningTrackSentenceScrambleSettings,
  type LearningTrackFillBlanksSettings,
  type LearningTrackMemorySettings,
  type LearningTrackCrosswordSettings,
  HOBBIES_DAY_1_COMPOSITION,
} from "@/lib/learning-tracks/composer";
import {
  GAMES_FLASHCARD_FACES,
  type GamesFlashcardFace,
} from "@/lib/activity-builder/games/types-flashcards";
import type { LessonScreenRow } from "@/lib/lesson/types";
import { AssignStudioActivityHomeworkOverlay } from "@/components/teacher/AssignStudioActivityHomeworkOverlay";
import "./ltc-workspace.css";

/** Debounce before recompiling after beat/source edits. */
const COMPILE_DEBOUNCE_MS = 450;

const LTC_INSPECTOR_WIDTH_DEFAULT = 280;
const LTC_INSPECTOR_WIDTH_MIN = 240;
const LTC_INSPECTOR_WIDTH_MAX = 640;
const LTC_INSPECTOR_WIDTH_STORAGE_KEY = "ltc-inspector-width-px";
const LTC_LEFT_SETTINGS_WIDTH = 240;
const LTC_CENTER_MIN = 280;

function clampLtcInspectorWidth(width: number, layoutWidth: number) {
  const layoutMax = Math.max(
    LTC_INSPECTOR_WIDTH_MIN,
    layoutWidth - LTC_LEFT_SETTINGS_WIDTH - LTC_CENTER_MIN,
  );
  const max = Math.min(LTC_INSPECTOR_WIDTH_MAX, layoutMax);
  return Math.min(max, Math.max(LTC_INSPECTOR_WIDTH_MIN, Math.round(width)));
}

const FLASHCARD_FACE_LABELS: Record<GamesFlashcardFace, string> = {
  word: "Word",
  definition: "Definition",
  example: "Example sentence",
  picture: "Picture",
};

function orderFlashcardFaces(faces: GamesFlashcardFace[]): GamesFlashcardFace[] {
  return GAMES_FLASHCARD_FACES.filter((face) => faces.includes(face));
}

function toggleFlashcardFace(
  settings: LearningTrackFlashcardsSettings,
  side: "front" | "back",
  face: GamesFlashcardFace,
): LearningTrackFlashcardsSettings {
  const primaryKey = side === "front" ? "frontFaces" : "backFaces";
  const otherKey = side === "front" ? "backFaces" : "frontFaces";
  const onPrimary = settings[primaryKey].includes(face);
  if (onPrimary) {
    if (settings[primaryKey].length <= 1) return settings;
    return {
      ...settings,
      frontFaces: orderFlashcardFaces(
        primaryKey === "frontFaces"
          ? settings.frontFaces.filter((item) => item !== face)
          : settings.frontFaces,
      ),
      backFaces: orderFlashcardFaces(
        primaryKey === "backFaces"
          ? settings.backFaces.filter((item) => item !== face)
          : settings.backFaces,
      ),
    };
  }
  return {
    ...settings,
    [primaryKey]: orderFlashcardFaces([...settings[primaryKey], face]),
    [otherKey]: orderFlashcardFaces(settings[otherKey].filter((item) => item !== face)),
  };
}

const LessonPlayer = dynamic(
  () =>
    import("@/components/lesson/LessonPlayer").then((m) => ({
      default: m.LessonPlayer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <p className="text-sm font-semibold ltc-muted">Loading Lesson Player…</p>
      </div>
    ),
  },
);

type CompiledState = {
  pack: LearningTrackLessonPlayerPack | null;
  beatPlan: LearningTrackBeatPlan[];
  error: string | null;
  compiling: boolean;
  /** Bumps when screens change so the in-process player remounts. */
  generation: number;
};

type SourceActivityOption = {
  id: string;
  name: string;
};

type SourceOptions = {
  activities: SourceActivityOption[];
  vocabLists: StudioVocabularyListRef[];
};

function SkeletonBlock({ label }: { label: string }) {
  return (
    <div className="ltc-skeleton rounded-lg border px-3 py-3">
      <p className="ltc-subtle text-[10px] font-semibold uppercase tracking-wide">{label}</p>
      <div className="mt-2 space-y-2">
        <div className="ltc-skeleton-bar h-2.5 w-3/4 rounded" />
        <div className="ltc-skeleton-bar h-2.5 w-1/2 rounded" />
        <div className="ltc-skeleton-bar h-8 w-full rounded" />
      </div>
    </div>
  );
}

/** Accordion section for left/right LTC settings cards. */
function CollapsibleSettingsPanel({
  sectionId,
  title,
  openSectionId,
  onOpenSection,
  children,
}: {
  sectionId: string;
  title: string;
  openSectionId: string | null;
  onOpenSection: (id: string | null) => void;
  children: ReactNode;
}) {
  const open = openSectionId === sectionId;
  return (
    <div className="ltc-panel rounded-lg border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-black/[0.03]"
        aria-expanded={open}
        onClick={() => onOpenSection(open ? null : sectionId)}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide ltc-label">
          {title}
        </span>
        <span className="text-[10px] ltc-subtle" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open ? (
        <div className="border-t border-[var(--ltc-border)] px-3 py-3">{children}</div>
      ) : null}
    </div>
  );
}

/** Structure that requires a full beat recompile (not title/aim metadata). */
function compositionStructureKey(composition: LearningTrackComposition): string {
  return JSON.stringify({
    id: composition.id,
    packId: composition.packId,
    trackIndex: composition.trackIndex,
    vocabListId: composition.vocabListId ?? null,
    durationTargetMin: composition.durationTargetMin,
    cefr: composition.cefr ?? null,
    beats: composition.beats,
  });
}

export type LearningTrackCompilerDraftSync = {
  composition: LearningTrackComposition;
  libraryId: string | null;
  bankActivityId: string | null;
};

export type LearningTrackCompilerWorkspaceProps = {
  classes?: readonly { id: string; title: string }[];
  classLoadError?: boolean;
  /**
   * `standalone` — legacy LTC route chrome.
   * `embedded` — Track Builder Practice mode (same body, Track Builder header).
   */
  chrome?: "standalone" | "embedded";
  initialComposition?: LearningTrackComposition;
  initialLibraryId?: string | null;
  initialBankActivityId?: string | null;
  coverImageUrl?: string | null;
  onCoverImageChange?: (url: string) => void;
  /** Persist composition + bank refs onto the Track Builder draft. */
  onDraftSync?: (patch: LearningTrackCompilerDraftSync) => void;
};

/**
 * Timeline Learning Track Compiler — live Lesson Player preview + beat inspector.
 * Used standalone at /learning-tracks (redirect) and embedded in Track Builder Practice.
 */
export function LearningTrackCompilerWorkspace({
  classes = [],
  classLoadError = false,
  chrome = "standalone",
  initialComposition,
  initialLibraryId = null,
  initialBankActivityId = null,
  coverImageUrl = null,
  onCoverImageChange,
  onDraftSync,
}: LearningTrackCompilerWorkspaceProps = {}) {
  const embedded = chrome === "embedded";
  const [composition, setComposition] = useState<LearningTrackComposition>(() =>
    structuredClone(initialComposition ?? HOBBIES_DAY_1_COMPOSITION),
  );
  const [selectedBeatId, setSelectedBeatId] = useState<string | null>(null);
  const [leftOpenSectionId, setLeftOpenSectionId] = useState<string | null>(null);
  const [rightOpenSectionId, setRightOpenSectionId] = useState<string | null>(null);
  const [hotspotPanelOpenId, setHotspotPanelOpenId] = useState<string | null>(null);
  const [previewScreenIndex, setPreviewScreenIndex] = useState(0);
  const [libraryId, setLibraryId] = useState<string | null>(initialLibraryId);
  const [bankActivityId, setBankActivityId] = useState<string | null>(
    initialBankActivityId,
  );
  const [bankActivityTitle, setBankActivityTitle] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [addKind, setAddKind] = useState<LearningTrackBeatKind>("flashcards");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [compiled, setCompiled] = useState<CompiledState>({
    pack: null,
    beatPlan: [],
    error: null,
    compiling: true,
    generation: 0,
  });
  const [sourceOptions, setSourceOptions] = useState<SourceOptions>({
    activities: [],
    vocabLists: [],
  });
  const [vocabOverlay, setVocabOverlay] = useState<null | {
    mode: "create" | "edit";
    libraryId: string | null;
  }>(null);

  const { pack, beatPlan } = compiled;
  const trackAssignable =
    Boolean(pack) &&
    !compiled.error &&
    !compiled.compiling &&
    (pack?.screens.length ?? 0) > 0;
  const structureKey = useMemo(
    () => compositionStructureKey(composition),
    [composition],
  );

  const onDraftSyncRef = useRef(onDraftSync);
  useEffect(() => {
    onDraftSyncRef.current = onDraftSync;
  }, [onDraftSync]);

  const [inspectorWidth, setInspectorWidth] = useState(LTC_INSPECTOR_WIDTH_DEFAULT);
  const [inspectorResizing, setInspectorResizing] = useState(false);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const inspectorDragRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  );
  const inspectorWidthRef = useRef(inspectorWidth);
  inspectorWidthRef.current = inspectorWidth;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LTC_INSPECTOR_WIDTH_STORAGE_KEY);
      if (!raw) return;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return;
      setInspectorWidth(clampLtcInspectorWidth(parsed, window.innerWidth));
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
      window.localStorage.setItem(LTC_INSPECTOR_WIDTH_STORAGE_KEY, String(width));
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
    const next = clampLtcInspectorWidth(
      drag.startWidth + (drag.startX - event.clientX),
      layoutWidth,
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

  // Keep Track Builder localStorage draft aligned with LTC composition + bank refs.
  useEffect(() => {
    if (!onDraftSyncRef.current) return;
    onDraftSyncRef.current({
      composition,
      libraryId,
      bankActivityId,
    });
  }, [composition, libraryId, bankActivityId]);

  const selectedBeat = useMemo(
    () => beatPlan.find((beat) => beat.id === selectedBeatId) ?? beatPlan[0] ?? null,
    [beatPlan, selectedBeatId],
  );

  const selectedCompositionBeat = useMemo(
    () =>
      composition.beats.find((beat) => beat.id === selectedBeatId) ??
      composition.beats[0] ??
      null,
    [composition.beats, selectedBeatId],
  );

  /** Keep start screen on the selected beat after a structure recompile. */
  const selectedBeatIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedBeatIdRef.current = selectedBeat?.id ?? null;
  }, [selectedBeat?.id]);

  useEffect(() => {
    setRightOpenSectionId(null);
    setHotspotPanelOpenId(null);
  }, [selectedBeat?.id]);

  const previewScreens = useMemo((): LessonScreenRow[] => {
    if (!pack) return [];
    return pack.screens.map((payload, index) => ({
      id: `ltc-preview-${pack.id}-${index}`,
      lesson_id: `ltc-preview-${pack.id}`,
      order_index: index,
      screen_type: "interaction",
      payload,
    }));
  }, [pack]);

  // Full recompile only when beats / vocab source / track structure change.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setCompiled((current) => ({ ...current, compiling: true }));
      void (async () => {
        try {
          const result = await compileLearningTrackAsync(composition);
          if (cancelled) return;
          const startScreen =
            result.beatPlan.find((beat) => beat.id === selectedBeatIdRef.current)
              ?.screenStart ?? 0;
          setCompiled((current) => ({
            pack: result.pack,
            beatPlan: result.beatPlan,
            error: null,
            compiling: false,
            generation: current.generation + 1,
          }));
          setPreviewScreenIndex(startScreen);
        } catch (error) {
          if (cancelled) return;
          setCompiled((current) => ({
            pack: null,
            beatPlan: [],
            error: error instanceof Error ? error.message : "Compile failed.",
            compiling: false,
            generation: current.generation,
          }));
        }
      })();
    }, COMPILE_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // structureKey fingerprints beat/source fields; composition is read for the compile call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey]);

  // Vocabulary lists are a track-level choice, so load them regardless of selection.
  const refreshVocabLists = async () => {
    try {
      const vocabLists = await listStudioVocabularyLists();
      setSourceOptions((current) => ({ ...current, vocabLists }));
    } catch (error) {
      setSourceOptions((current) => ({ ...current, vocabLists: [] }));
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not load vocabulary lists from Activity Bank.",
      );
    }
  };

  useEffect(() => {
    void refreshVocabLists();
  }, []);

  useEffect(() => {
    const beatKind = selectedCompositionBeat?.kind ?? null;
    const activityFormat = beatKind ? libraryFormatForBeatKind(beatKind) : null;
    let cancelled = false;
    void (async () => {
      if (!beatKind || !activityFormat || !beatSupportsLibrary(beatKind)) {
        if (!cancelled) {
          setSourceOptions((current) => ({ ...current, activities: [] }));
        }
        return;
      }

      try {
        if (activityFormat === "explore_hotspots") {
          const bankRows: StudioExploreHotspotsRef[] = await listStudioExploreHotspots();
          if (!cancelled) {
            setSourceOptions((current) => ({
              ...current,
              activities: bankRows.map((row) => ({ id: row.id, name: row.name })),
            }));
          }
          return;
        }

        const local = await listActivityLibraryEntries(activityFormat);
        if (!cancelled) {
          setSourceOptions((current) => ({
            ...current,
            activities: local.map((entry) => ({ id: entry.id, name: entry.name })),
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setSourceOptions((current) => ({ ...current, activities: [] }));
          setNotice(
            error instanceof Error
              ? error.message
              : "Could not load Activity Bank items for this beat.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCompositionBeat]);

  const trackVocabLabel = useMemo(() => {
    if (!composition.vocabListId) return "no track list";
    if (composition.vocabListId === HOBBIES_DEFAULT_VOCAB_LIST_ID) return "Hobbies (built-in)";
    return (
      sourceOptions.vocabLists.find((entry) => entry.id === composition.vocabListId)?.name ??
      "the track vocabulary list"
    );
  }, [composition.vocabListId, sourceOptions.vocabLists]);

  const editBeats = (
    mutate: (beats: LearningTrackComposition["beats"]) => LearningTrackComposition["beats"],
  ) => {
    setComposition((current) => {
      const next = structuredClone(current);
      next.beats = mutate([...next.beats]);
      return next;
    });
  };

  const updateSelectedBeatSource = (
    source: LearningTrackBeatSource,
    label?: string,
  ) => {
    if (!selectedCompositionBeat) return;
    editBeats((beats) =>
      beats.map((beat) =>
        beat.id === selectedCompositionBeat.id
          ? { ...beat, source, ...(label ? { label } : {}) }
          : beat,
      ),
    );
  };

  const updateSelectedPresentation = (
    patch: Partial<LearningTrackBeatPresentation>,
  ) => {
    if (!selectedCompositionBeat) return;
    editBeats((beats) =>
      beats.map((beat) =>
        beat.id === selectedCompositionBeat.id
          ? {
              ...beat,
              presentation: {
                ...beat.presentation,
                afterBridge: beat.presentation?.afterBridge,
                ...patch,
              },
            }
          : beat,
      ),
    );
  };

  const selectedFlashcardsSettings: LearningTrackFlashcardsSettings | null =
    selectedCompositionBeat?.kind === "flashcards"
      ? {
          ...defaultFlashcardsSettings(),
          ...selectedCompositionBeat.presentation?.flashcards,
          frontFaces:
            selectedCompositionBeat.presentation?.flashcards?.frontFaces
              ?.length
              ? selectedCompositionBeat.presentation.flashcards.frontFaces
              : defaultFlashcardsSettings().frontFaces,
          backFaces:
            selectedCompositionBeat.presentation?.flashcards?.backFaces?.length
              ? selectedCompositionBeat.presentation.flashcards.backFaces
              : defaultFlashcardsSettings().backFaces,
        }
      : null;

  const selectedMcSettings: LearningTrackMultipleChoiceSettings | null =
    selectedCompositionBeat?.kind === "multiple_choice"
      ? {
          ...defaultMultipleChoiceSettings(),
          ...selectedCompositionBeat.presentation?.multipleChoice,
          optionCount: clampMcOptionCount(
            selectedCompositionBeat.presentation?.multipleChoice?.optionCount ??
              defaultMultipleChoiceSettings().optionCount,
          ),
        }
      : null;

  const selectedLetterSettings: LearningTrackLetterMixupSettings | null =
    selectedCompositionBeat?.kind === "letter_mixup"
      ? {
          ...defaultLetterMixupSettings(),
          ...selectedCompositionBeat.presentation?.letterMixup,
        }
      : null;

  const selectedListenSettings: LearningTrackListenAndChooseSettings | null =
    selectedCompositionBeat?.kind === "listen_and_choose"
      ? {
          ...defaultListenAndChooseSettings(),
          ...selectedCompositionBeat.presentation?.listenAndChoose,
        }
      : null;

  const selectedHotspotsSettings: LearningTrackExploreHotspotsSettings | null =
    selectedCompositionBeat?.kind === "explore_hotspots"
      ? {
          ...defaultExploreHotspotsSettings(),
          ...selectedCompositionBeat.presentation?.exploreHotspots,
        }
      : null;

  const selectedLifSettings: LearningTrackLanguageInFocusSettings | null =
    selectedCompositionBeat?.kind === "language_in_focus"
      ? {
          ...defaultLanguageInFocusSettings(),
          ...selectedCompositionBeat.presentation?.languageInFocus,
        }
      : null;

  const selectedLineMatchSettings: LearningTrackLineMatchSettings | null =
    selectedCompositionBeat?.kind === "line_match"
      ? {
          ...defaultLineMatchSettings(),
          ...selectedCompositionBeat.presentation?.lineMatch,
        }
      : null;

  const selectedTrueFalseSettings: LearningTrackTrueFalseSettings | null =
    selectedCompositionBeat?.kind === "true_false"
      ? {
          ...defaultTrueFalseSettings(),
          ...selectedCompositionBeat.presentation?.trueFalse,
        }
      : null;

  const selectedSentenceScrambleSettings: LearningTrackSentenceScrambleSettings | null =
    selectedCompositionBeat?.kind === "sentence_scramble"
      ? {
          ...defaultSentenceScrambleSettings(),
          ...selectedCompositionBeat.presentation?.sentenceScramble,
        }
      : null;

  const selectedFillBlanksSettings: LearningTrackFillBlanksSettings | null =
    selectedCompositionBeat?.kind === "fill_blanks"
      ? {
          ...defaultFillBlanksSettings(),
          ...selectedCompositionBeat.presentation?.fillBlanks,
        }
      : null;

  const selectedMemorySettings: LearningTrackMemorySettings | null =
    selectedCompositionBeat?.kind === "memory"
      ? {
          ...defaultMemorySettings(),
          ...selectedCompositionBeat.presentation?.memory,
        }
      : null;

  const selectedCrosswordSettings: LearningTrackCrosswordSettings | null =
    selectedCompositionBeat?.kind === "crossword"
      ? {
          ...defaultCrosswordSettings(),
          ...selectedCompositionBeat.presentation?.crossword,
        }
      : null;

  const selectedMcItems = useMemo(() => {
    if (!selectedMcSettings || !selectedBeat || !pack) return [];
    return listMcQuizItemsFromScreens(
      pack.screens.slice(selectedBeat.screenStart, selectedBeat.screenEnd),
    );
  }, [pack, selectedBeat, selectedMcSettings]);

  const selectedListenItems = useMemo(() => {
    if (!selectedListenSettings || !selectedBeat || !pack) return [];
    return listListenItemsFromScreens(
      pack.screens.slice(selectedBeat.screenStart, selectedBeat.screenEnd),
    );
  }, [pack, selectedBeat, selectedListenSettings]);

  const selectedHotspotPanels = useMemo(() => {
    if (!selectedHotspotsSettings || !selectedBeat || !pack) return [];
    return listHotspotPanelsFromScreens(
      pack.screens.slice(selectedBeat.screenStart, selectedBeat.screenEnd),
      selectedHotspotsSettings,
    );
  }, [pack, selectedBeat, selectedHotspotsSettings]);

  const selectedLifExamples = useMemo(() => {
    if (!selectedLifSettings || !selectedBeat || !pack) return [];
    return listLifExamplesFromScreens(
      pack.screens.slice(selectedBeat.screenStart, selectedBeat.screenEnd),
    );
  }, [pack, selectedBeat, selectedLifSettings]);

  const [mcItemIndex, setMcItemIndex] = useAuthoringItemIndex(
    selectedMcItems.length,
    selectedBeat?.id ?? "mc",
  );
  const [listenItemIndex, setListenItemIndex] = useAuthoringItemIndex(
    selectedListenItems.length,
    selectedBeat?.id ?? "listen",
  );
  const [lifExampleIndex, setLifExampleIndex] = useAuthoringItemIndex(
    selectedLifExamples.length,
    selectedBeat?.id ?? "lif",
  );

  // Prefer the Questions / Examples inspector when switching to multi-item beats.
  useEffect(() => {
    const kind = selectedCompositionBeat?.kind;
    if (kind === "multiple_choice") {
      setRightOpenSectionId("mc-questions");
      return;
    }
    if (kind === "listen_and_choose") {
      setRightOpenSectionId("listen-questions");
      return;
    }
    if (kind === "language_in_focus") {
      setRightOpenSectionId("lif-questions");
    }
  }, [selectedCompositionBeat?.id, selectedCompositionBeat?.kind]);

  const updateHotspotsSettings = (
    next: LearningTrackExploreHotspotsSettings,
  ) => {
    updateSelectedPresentation({ exploreHotspots: next });
  };

  const patchMcItemOverlay = (
    itemId: string,
    patch: Parameters<typeof upsertMcItemOverlay>[2],
  ) => {
    if (!selectedMcSettings) return;
    const itemOverlays = upsertMcItemOverlay(
      selectedMcSettings.itemOverlays,
      itemId,
      patch,
    );
    updateSelectedPresentation({
      multipleChoice: {
        ...selectedMcSettings,
        ...(itemOverlays ? { itemOverlays } : { itemOverlays: undefined }),
      },
    });
  };

  const patchListenItemOverlay = (
    itemIndex: number,
    patch: Parameters<typeof upsertListenItemOverlay>[2],
  ) => {
    if (!selectedListenSettings) return;
    const itemOverlays = upsertListenItemOverlay(
      selectedListenSettings.itemOverlays,
      itemIndex,
      patch,
    );
    updateSelectedPresentation({
      listenAndChoose: {
        ...selectedListenSettings,
        ...(itemOverlays ? { itemOverlays } : { itemOverlays: undefined }),
      },
    });
  };

  const patchLifExampleOverlay = (
    exampleId: string,
    patch: Parameters<typeof upsertLifExampleOverlay>[2],
  ) => {
    if (!selectedLifSettings) return;
    const exampleOverlays = upsertLifExampleOverlay(
      selectedLifSettings.exampleOverlays,
      exampleId,
      patch,
    );
    updateSelectedPresentation({
      languageInFocus: {
        ...selectedLifSettings,
        ...(exampleOverlays
          ? { exampleOverlays }
          : { exampleOverlays: undefined }),
      },
    });
  };

  const setSourceMode = (mode: LearningTrackBeatSource["type"]) => {
    if (!selectedCompositionBeat) return;
    const { kind } = selectedCompositionBeat;
    if (mode === "fixture") {
      const fixtureId = fixtureIdForKind(kind);
      if (fixtureId) {
        updateSelectedBeatSource(
          { type: "fixture", fixtureId },
          LEARNING_TRACK_BEAT_LABELS[kind],
        );
      }
      return;
    }
    if (mode === "vocab_compile") {
      const format = vocabCompileFormatForBeatKind(kind);
      if (format) {
        updateSelectedBeatSource({
          type: "vocab_compile",
          listId: HOBBIES_DEFAULT_VOCAB_LIST_ID,
          format,
        });
      }
      return;
    }
    const format = libraryFormatForBeatKind(kind);
    const first = sourceOptions.activities[0];
    if (format && first) {
      updateSelectedBeatSource(
        { type: "library", libraryId: first.id, format },
        first.name,
      );
    } else {
      setNotice(`No saved ${LEARNING_TRACK_BEAT_LABELS[kind].toLowerCase()} activities yet.`);
    }
  };

  const moveBeatTo = (from: number, to: number) => {
    if (from === to) return;
    editBeats((beats) => {
      if (to < 0 || to >= beats.length) return beats;
      const [moved] = beats.splice(from, 1);
      if (!moved) return beats;
      beats.splice(to, 0, moved);
      return beats;
    });
  };

  const removeBeat = (index: number) => {
    if (composition.beats.length <= 1) {
      setNotice("Keep at least one activity in the track.");
      return;
    }
    const removed = composition.beats[index];
    editBeats((beats) => {
      beats.splice(index, 1);
      return beats;
    });
    setNotice(
      `Removed ${removed?.label ?? LEARNING_TRACK_BEAT_LABELS[removed!.kind]} from the track.`,
    );
  };

  const addBeat = () => {
    const beat = createBeatInstance(addKind, undefined, composition.vocabListId);
    editBeats((beats) => {
      beats.push(beat);
      return beats;
    });
    setSelectedBeatId(beat.id);
    const fromTrackVocab = beat.source.type === "vocab_compile" && composition.vocabListId;
    setNotice(
      `Added ${LEARNING_TRACK_BEAT_LABELS[addKind]}${
        fromTrackVocab ? ` from ${trackVocabLabel}.` : "."
      }`,
    );
  };

  const updateTrack = (patch: Partial<LearningTrackComposition>) => {
    setComposition((current) => ({ ...current, ...patch }));
    // Title/aim/CEFR are pack metadata — patch the live pack without a full recompile.
    if (
      patch.title !== undefined ||
      patch.aim !== undefined ||
      patch.durationTargetMin !== undefined ||
      patch.cefr !== undefined ||
      patch.packTitle !== undefined
    ) {
      setCompiled((current) => {
        if (!current.pack) return current;
        return {
          ...current,
          pack: {
            ...current.pack,
            ...(patch.title !== undefined ? { title: patch.title } : {}),
            ...(patch.aim !== undefined ? { aim: patch.aim } : {}),
            ...(patch.durationTargetMin !== undefined
              ? { duration_target_min: patch.durationTargetMin }
              : {}),
            ...(patch.cefr !== undefined
              ? patch.cefr
                ? { cefr: patch.cefr }
                : { cefr: undefined }
              : {}),
            ...(patch.packTitle !== undefined ? { pack_title: patch.packTitle } : {}),
          },
        };
      });
    }
  };

  /** Re-point every vocabulary-driven beat at the track list. */
  const applyTrackVocabToBeats = (listId: string) => {
    const needsUpdate = (beat: LearningTrackComposition["beats"][number]) =>
      vocabCompileFormatForBeatKind(beat.kind) !== null &&
      !(beat.source.type === "vocab_compile" && beat.source.listId === listId);

    const changed = composition.beats.filter(needsUpdate).length;

    editBeats((beats) =>
      beats.map((beat) => {
        const format = vocabCompileFormatForBeatKind(beat.kind);
        if (!format || !needsUpdate(beat)) return beat;
        return { ...beat, source: { type: "vocab_compile", listId, format } };
      }),
    );

    setNotice(
      changed > 0
        ? `Pointed ${changed} activit${changed === 1 ? "y" : "ies"} at ${trackVocabLabel}.`
        : "All vocabulary activities already use the track list.",
    );
  };

  const selectBeat = (beat: LearningTrackBeatPlan) => {
    setSelectedBeatId(beat.id);
    setPreviewScreenIndex(beat.screenStart);
  };

  const previewBridge = (beat: LearningTrackBeatPlan) => {
    const screenIndex = beat.afterBridge?.screenIndex;
    if (typeof screenIndex !== "number") return;
    setSelectedBeatId(beat.id);
    setPreviewScreenIndex(screenIndex);
    setNotice(`Previewing the report after “${beat.label}”.`);
  };

  const saveCompiled = async () => {
    setBusy(true);
    try {
      const { entry } = await compileAndSaveLearningTrackToLibrary({
        libraryId,
        composition,
      });
      setLibraryId(entry.id);
      setNotice(`Saved “${entry.name}” to Activity Library.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const exportCompiled = async () => {
    setBusy(true);
    try {
      const { entry, pack: next, filename } = await compileAndSaveLearningTrackToLibrary({
        libraryId,
        composition,
      });
      setLibraryId(entry.id);
      downloadTextFile(JSON.stringify(next, null, 2), filename);
      setNotice(`Exported ${filename}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  const playExternal = async () => {
    setBusy(true);
    try {
      const { entry, pack: next, filename } = await compileAndSaveLearningTrackToLibrary({
        libraryId,
        composition,
      });
      setLibraryId(entry.id);
      const { playUrl } = await postLearningTrackPackToLessonPlayerInbox({
        pack: next,
        filename,
      });
      const studentLike = new URL(playUrl, window.location.origin);
      studentLike.searchParams.set("embed", "1");
      window.open(studentLike.toString(), "_blank", "noopener,noreferrer");
      setNotice("Opened full-screen student view.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not open Lesson Player.");
    } finally {
      setBusy(false);
    }
  };

  const publishToBank = async (options?: {
    openAssignAfter?: boolean;
  }): Promise<string | null> => {
    if (compiled.error || !pack || pack.screens.length < 1) {
      setNotice("Fix compile errors and wait for a playable track before publishing.");
      return null;
    }
    setBusy(true);
    try {
      const { entry, pack: next, filename, composition: saved } =
        await compileAndSaveLearningTrackToLibrary({
          libraryId,
          composition,
        });
      setLibraryId(entry.id);
      setComposition(saved);
      setNotice("Publishing to My Activity Bank…");
      if (!next.screens?.length) {
        throw new Error("Compiled track has no playable screens.");
      }
      const response = await fetch("/api/studio/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          id: bankActivityId,
          format: "learning_track",
          pack: next,
          authoring: saved,
          title: saved.title || next.title,
          filename,
          source: {
            libraryId: entry.id,
            via: embedded ? "track_builder_practice" : "learning_track_compiler",
            coverImageUrl,
          },
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        id?: string;
        title?: string;
        bankPath?: string;
        error?: string;
      } | null;
      if (!response.ok || !payload?.ok || !payload.id) {
        throw new Error(payload?.error || `Publish failed (${response.status}).`);
      }
      setBankActivityId(payload.id);
      setBankActivityTitle(payload.title ?? saved.title ?? next.title);
      setNotice(
        options?.openAssignAfter
          ? `Saved “${payload.title ?? next.title}” to My Activity Bank. Choose a class to assign.`
          : `Saved “${payload.title ?? next.title}” to My Activity Bank.${
              classes.length > 0
                ? " Use Assign homework to give it to a class."
                : payload.bankPath
                  ? " Create a class, then assign from here or Activity Bank."
                  : ""
            }`,
      );
      if (options?.openAssignAfter) {
        if (classes.length === 0 || classLoadError) {
          setNotice(
            classLoadError
              ? "Track saved, but classes could not be loaded. Retry or assign from Activity Bank."
              : "Track saved. Create a private class first, then assign homework.",
          );
        } else {
          setAssignOpen(true);
        }
      }
      return payload.id;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Publish failed.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const assignHomework = async () => {
    if (!trackAssignable) {
      setNotice("Fix compile errors and wait for a playable track before assigning.");
      return;
    }
    if (classes.length === 0 || classLoadError) {
      setNotice(
        classLoadError
          ? "Could not load classes. Refresh and try again."
          : "Create a private class first, then assign homework.",
      );
      return;
    }
    // Republish so homework freezes the latest compile, not a stale bank row.
    await publishToBank({ openAssignAfter: true });
  };

  const canUseFixture = selectedCompositionBeat
    ? beatSupportsFixture(selectedCompositionBeat.kind)
    : false;
  const canUseVocab = selectedCompositionBeat
    ? vocabCompileFormatForBeatKind(selectedCompositionBeat.kind) !== null
    : false;
  const canUseLibrary = selectedCompositionBeat
    ? beatSupportsLibrary(selectedCompositionBeat.kind)
    : false;

  return (
    <main data-ltc-root className="flex min-h-0 flex-1 flex-col">
      <header className="ltc-header sticky top-0 z-30 flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-3">
        <Link
          href={
            embedded
              ? "/teacher/activity-builder/tracks"
              : "/teacher/activity-builder"
          }
          className="ltc-link text-sm hover:underline"
        >
          {embedded ? "← Tracks" : "← Activity Builder"}
        </Link>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="ltc-fg text-lg font-semibold">
              {embedded ? "Track builder" : "Learning Track Compiler"}
            </h1>
            {embedded ? (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-900">
                Practice
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs ltc-subtle">
            {embedded
              ? `Practice track · ${composition.title}`
              : `Timeline MVP · ${composition.title}`}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="ltc-btn rounded-lg px-3 py-1.5 text-sm disabled:opacity-40"
            disabled={busy || !pack || compiled.compiling}
            onClick={() => {
              setCompiled((current) => ({
                ...current,
                generation: current.generation + 1,
              }));
              setPreviewScreenIndex(selectedBeat?.screenStart ?? 0);
              setNotice("Preview remounted.");
            }}
          >
            Refresh preview
          </button>
          <button
            type="button"
            className="ltc-btn-primary rounded-lg px-3 py-1.5 text-sm disabled:opacity-40"
            disabled={busy}
            onClick={() => void saveCompiled()}
          >
            Save
          </button>
          <button
            type="button"
            className="ltc-btn rounded-lg px-3 py-1.5 text-sm disabled:opacity-40"
            disabled={busy}
            onClick={() => void exportCompiled()}
          >
            Export
          </button>
          <button
            type="button"
            className="ltc-btn-accent rounded-lg px-3 py-1.5 text-sm disabled:opacity-40"
            disabled={busy || !trackAssignable}
            onClick={() => void publishToBank()}
            title={
              !trackAssignable
                ? "Fix compile errors and wait for a playable track"
                : bankActivityId
                  ? "Update this track in My Activity Bank"
                  : "Save this track to My Activity Bank"
            }
          >
            {bankActivityId ? "Update in Bank" : "Publish to Bank"}
          </button>
          <button
            type="button"
            className="ltc-btn-primary rounded-lg px-3 py-1.5 text-sm disabled:opacity-40"
            disabled={busy || !trackAssignable || classes.length === 0 || classLoadError}
            onClick={() => void assignHomework()}
            title={
              classLoadError
                ? "Classes could not be loaded"
                : classes.length === 0
                  ? "Create a private class first"
                  : !trackAssignable
                    ? "Fix compile errors and wait for a playable track"
                    : "Publish latest compile, then assign as homework"
            }
          >
            Assign
          </button>
          <button
            type="button"
            className="ltc-btn rounded-lg px-3 py-1.5 text-sm disabled:opacity-40"
            disabled={busy}
            onClick={() => void playExternal()}
          >
            Open in tab
          </button>
        </div>
      </header>

      {compiled.error ? (
        <p className="ltc-error-banner shrink-0 border-b px-4 py-2 text-sm">
          {compiled.error}
        </p>
      ) : notice ? (
        <button
          type="button"
          className="ltc-notice-banner shrink-0 border-b px-4 py-2 text-left text-sm"
          onClick={() => setNotice(null)}
        >
          {notice} ×
        </button>
      ) : null}

      <div
        ref={layoutRef}
        style={{ ["--inspector-w" as string]: `${inspectorWidth}px` }}
        className={`grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_var(--inspector-w)] ${
          inspectorResizing ? "select-none" : ""
        }`}
      >
        {/* Left: track settings */}
        <aside className="min-h-0 space-y-3 overflow-y-auto border-b border-[var(--ltc-border)] p-3 lg:border-b-0 lg:border-r">
          <CollapsibleSettingsPanel
            sectionId="track"
            title="Track"
            openSectionId={leftOpenSectionId}
            onOpenSection={setLeftOpenSectionId}
          >
            <label className="block text-[11px] ltc-muted">
              Title
              <input
                type="text"
                className="ltc-input mt-1 w-full rounded border px-2 py-1.5 text-xs"
                value={composition.title}
                onChange={(event) => updateTrack({ title: event.target.value })}
              />
            </label>
            <label className="mt-2 block text-[11px] ltc-muted">
              Aim
              <textarea
                rows={3}
                className="ltc-input mt-1 w-full resize-y rounded border px-2 py-1.5 text-xs leading-snug"
                value={composition.aim}
                onChange={(event) => updateTrack({ aim: event.target.value })}
              />
            </label>
            {onCoverImageChange ? (
              <div className="mt-3 border-t border-[var(--ltc-border)] pt-3">
                <TrackCoverImageEditor
                  value={coverImageUrl ?? ""}
                  title={composition.title}
                  onChange={onCoverImageChange}
                />
              </div>
            ) : null}
            <p className="mt-2 text-[11px] ltc-muted">
              Target {composition.durationTargetMin} min
              {composition.cefr ? ` · ${composition.cefr}` : ""}
            </p>
          </CollapsibleSettingsPanel>

          <CollapsibleSettingsPanel
            sectionId="track-vocab"
            title="Track vocabulary"
            openSectionId={leftOpenSectionId}
            onOpenSection={setLeftOpenSectionId}
          >
            <label className="block text-[11px] ltc-muted">
              Source list
              <select
                className="ltc-input mt-1 w-full rounded border px-2 py-1.5 text-xs"
                value={composition.vocabListId ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  updateTrack({ vocabListId: value || undefined });
                }}
              >
                <option value="">No track list (per-activity sources)</option>
                <option value={HOBBIES_DEFAULT_VOCAB_LIST_ID}>Hobbies — built-in Day 1</option>
                {sourceOptions.vocabLists.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                className="ltc-btn-primary flex-1 rounded px-2 py-1.5 text-[11px]"
                onClick={() => setVocabOverlay({ mode: "create", libraryId: null })}
              >
                Create
              </button>
              <button
                type="button"
                className="ltc-btn flex-1 rounded px-2 py-1.5 text-[11px] disabled:opacity-40"
                disabled={
                  !composition.vocabListId ||
                  composition.vocabListId === HOBBIES_DEFAULT_VOCAB_LIST_ID
                }
                title={
                  composition.vocabListId === HOBBIES_DEFAULT_VOCAB_LIST_ID
                    ? "Built-in hobbies list can’t be edited — Create a copy instead."
                    : !composition.vocabListId
                      ? "Select a saved vocabulary list to edit."
                      : "Edit the selected vocabulary list"
                }
                onClick={() => {
                  if (
                    !composition.vocabListId ||
                    composition.vocabListId === HOBBIES_DEFAULT_VOCAB_LIST_ID
                  ) {
                    return;
                  }
                  setVocabOverlay({
                    mode: "edit",
                    libraryId: composition.vocabListId,
                  });
                }}
              >
                Edit
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-snug ltc-subtle">
              {composition.vocabListId
                ? `New flashcards, multiple choice, and letter scramble activities are generated from ${trackVocabLabel}.`
                : "Create or choose a list so new vocabulary activities are generated automatically."}
            </p>
            {composition.vocabListId && (
              <button
                type="button"
                className="mt-2 w-full ltc-btn-accent rounded px-2 py-1.5 text-[11px]"
                onClick={() => applyTrackVocabToBeats(composition.vocabListId!)}
              >
                Apply to existing activities
              </button>
            )}
          </CollapsibleSettingsPanel>

          <CollapsibleSettingsPanel
            sectionId="duration-cefr"
            title="Duration / CEFR"
            openSectionId={leftOpenSectionId}
            onOpenSection={setLeftOpenSectionId}
          >
            <SkeletonBlock label="Coming soon" />
          </CollapsibleSettingsPanel>
        </aside>

        {/* Center: Lesson Player preview */}
        <section className="flex min-h-0 min-w-0 flex-col ltc-preview-shell">
          <div className="relative min-h-0 flex-1 overflow-hidden ltc-preview-stage">
            {compiled.error ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="ltc-warn-text max-w-md text-sm">{compiled.error}</p>
              </div>
            ) : pack && previewScreens.length > 0 ? (
              <div className="absolute inset-0 overflow-hidden bg-white" data-student-surface>
                <FitScaleViewport
                  resetKey={`${compiled.generation}:${pack.id}:${previewScreenIndex}`}
                  className="flex h-full w-full items-center justify-center overflow-hidden bg-white"
                >
                  <LessonPlayer
                    key={`${compiled.generation}:${pack.id}:${previewScreenIndex}`}
                    lessonId={`ltc-preview-${pack.id}`}
                    lessonTitle={pack.title}
                    screens={previewScreens}
                    mode="preview"
                    previewAudience="authoring"
                    immersiveLayout
                    embedNaturalHeight
                    initialScreenIndex={Math.min(
                      previewScreenIndex,
                      Math.max(0, previewScreens.length - 1),
                    )}
                  />
                </FitScaleViewport>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <p className="text-sm ltc-subtle">
                  {compiled.compiling ? "Compiling track…" : "No screens to preview yet."}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right settings */}
        <aside className="relative min-h-0 space-y-3 overflow-y-auto border-t border-[var(--ltc-border)] p-3 lg:border-l lg:border-t-0">
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize settings panel"
            aria-valuemin={LTC_INSPECTOR_WIDTH_MIN}
            aria-valuemax={LTC_INSPECTOR_WIDTH_MAX}
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
                inspectorResizing ? "bg-sky-500" : "bg-[var(--ltc-border)]"
              }`}
            />
          </div>
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-wide ltc-label">
              Selected activity
            </h2>
            {selectedBeat ? (
              <>
                <p className="mt-2 text-sm font-medium ltc-fg">{selectedBeat.label}</p>
                <p className="mt-1 font-mono text-[11px] ltc-subtle">
                  {selectedBeat.kind}
                  {selectedCompositionBeat
                    ? ` · ${selectedCompositionBeat.source.type}`
                    : ""}
                </p>
                {selectedBeat.afterBridge && (
                  <p className="mt-2 text-[11px] leading-snug ltc-notice-banner">
                    After → report + encourage → {selectedBeat.afterBridge.nextBeatLabel}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-xs ltc-subtle">Pick an activity on the timeline.</p>
            )}
          </div>
          {selectedCompositionBeat ? (
            <CollapsibleSettingsPanel
              sectionId="activity-source"
              title="Activity source"
              openSectionId={rightOpenSectionId}
              onOpenSection={setRightOpenSectionId}
            >
              <label className="block text-[11px] ltc-muted">
                Source mode
                <select
                  className="ltc-input mt-1 w-full rounded border px-2 py-1.5 text-xs"
                  value={selectedCompositionBeat.source.type}
                  onChange={(event) =>
                    setSourceMode(event.target.value as LearningTrackBeatSource["type"])
                  }
                >
                  {canUseFixture && <option value="fixture">Demo fixture</option>}
                  {canUseVocab && <option value="vocab_compile">Vocabulary list</option>}
                  {canUseLibrary && (
                    <option value="library">
                      {selectedCompositionBeat.kind === "explore_hotspots"
                        ? "Activity Bank scene"
                        : "Library activity"}
                    </option>
                  )}
                </select>
              </label>

              {selectedCompositionBeat.source.type === "fixture" && (
                <p className="mt-2 text-[11px] leading-snug ltc-subtle">
                  Built-in source:{" "}
                  <span className="font-mono ltc-muted">
                    {selectedCompositionBeat.source.fixtureId}
                  </span>
                </p>
              )}

              {selectedCompositionBeat.source.type === "vocab_compile" && (
                <label className="mt-2 block text-[11px] ltc-muted">
                  Vocabulary list
                  <select
                    className="ltc-input mt-1 w-full rounded border px-2 py-1.5 text-xs"
                    value={selectedCompositionBeat.source.listId}
                    onChange={(event) => {
                      const listId = event.target.value;
                      if (selectedCompositionBeat.source.type !== "vocab_compile") return;
                      const entry = sourceOptions.vocabLists.find(
                        (candidate) => candidate.id === listId,
                      );
                      updateSelectedBeatSource(
                        {
                          ...selectedCompositionBeat.source,
                          listId,
                        },
                        entry?.name,
                      );
                    }}
                  >
                    <option value={HOBBIES_DEFAULT_VOCAB_LIST_ID}>
                      Hobbies — built-in Day 1
                    </option>
                    {sourceOptions.vocabLists.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {selectedCompositionBeat.source.type === "library" && (
                <div className="mt-2 space-y-2">
                  <label className="block text-[11px] ltc-muted">
                    Saved activity
                    <select
                      className="ltc-input mt-1 w-full rounded border px-2 py-1.5 text-xs"
                      value={selectedCompositionBeat.source.libraryId}
                      onChange={(event) => {
                        const libraryId = event.target.value;
                        if (selectedCompositionBeat.source.type !== "library") return;
                        const entry = sourceOptions.activities.find(
                          (candidate) => candidate.id === libraryId,
                        );
                        updateSelectedBeatSource(
                          {
                            ...selectedCompositionBeat.source,
                            libraryId,
                          },
                          entry?.name,
                        );
                      }}
                    >
                      {sourceOptions.activities.length === 0 ? (
                        <option value="">No saved activities yet</option>
                      ) : null}
                      {sourceOptions.activities.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedCompositionBeat.kind === "explore_hotspots" ? (
                    <p className="text-[11px] leading-snug ltc-subtle">
                      From Activity Bank.{" "}
                      <Link
                        href="/teacher/activity-builder/hotspots"
                        className="ltc-link underline"
                      >
                        Open Explore hotspots
                      </Link>{" "}
                      to author and save a scene.
                    </p>
                  ) : null}
                </div>
              )}

              {!canUseVocab && !canUseLibrary && (
                <p className="mt-2 text-[11px] leading-snug ltc-subtle">
                  Language in Focus remains fixture-only until its authoring format
                  is added to the Activity Bank.
                </p>
              )}
            </CollapsibleSettingsPanel>
          ) : (
            <CollapsibleSettingsPanel
              sectionId="activity-source"
              title="Activity source"
              openSectionId={rightOpenSectionId}
              onOpenSection={setRightOpenSectionId}
            >
              <SkeletonBlock label="Select an activity" />
            </CollapsibleSettingsPanel>
          )}

          {selectedFlashcardsSettings ? (
            <CollapsibleSettingsPanel
              sectionId="flashcards-settings"
              title="Flashcards settings"
              openSectionId={rightOpenSectionId}
              onOpenSection={setRightOpenSectionId}
            >
              <p className="text-[11px] leading-snug ltc-subtle">
                Applies to every card in this activity when generated from a vocabulary
                list.
              </p>
              {selectedCompositionBeat?.source.type !== "vocab_compile" && (
                <p className="mt-2 text-[11px] leading-snug ltc-notice-banner">
                  Switch source mode to Vocabulary list to use these settings in the
                  preview.
                </p>
              )}
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs ltc-fg">
                <input
                  type="checkbox"
                  className="rounded border"
                  checked={selectedFlashcardsSettings.shuffleCards}
                  onChange={(event) =>
                    updateSelectedPresentation({
                      flashcards: {
                        ...selectedFlashcardsSettings,
                        shuffleCards: event.target.checked,
                      },
                    })
                  }
                />
                Shuffle cards
              </label>
              {(
                [
                  ["front", "Front of card"],
                  ["back", "Back of card"],
                ] as const
              ).map(([side, sideLabel]) => (
                <fieldset key={side} className="mt-3">
                  <legend className="text-[11px] font-medium ltc-muted">{sideLabel}</legend>
                  <div className="mt-1.5 space-y-1">
                    {GAMES_FLASHCARD_FACES.map((face) => {
                      const checked = selectedFlashcardsSettings[
                        side === "front" ? "frontFaces" : "backFaces"
                      ].includes(face);
                      return (
                        <label
                          key={`${side}-${face}`}
                          className="flex cursor-pointer items-center gap-2 text-xs ltc-fg"
                        >
                          <input
                            type="checkbox"
                            className="rounded border"
                            checked={checked}
                            onChange={() =>
                              updateSelectedPresentation({
                                flashcards: toggleFlashcardFace(
                                  selectedFlashcardsSettings,
                                  side,
                                  face,
                                ),
                              })
                            }
                          />
                          {FLASHCARD_FACE_LABELS[face]}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </CollapsibleSettingsPanel>
          ) : null}

          {selectedMcSettings ? (
            <>
            <CollapsibleSettingsPanel
              sectionId="mc-settings"
              title="Multiple choice settings"
              openSectionId={rightOpenSectionId}
              onOpenSection={setRightOpenSectionId}
            >
              <p className="text-[11px] leading-snug ltc-subtle">
                Applies to every question in this activity when generated from a
                vocabulary list.
              </p>
              {selectedCompositionBeat?.source.type !== "vocab_compile" && (
                <p className="mt-2 text-[11px] leading-snug ltc-notice-banner">
                  Switch source mode to Vocabulary list to use these settings in the
                  preview.
                </p>
              )}
              <label className="mt-3 block text-[11px] ltc-muted">
                Question prompt
                <input
                  type="text"
                  className="ltc-input mt-1 w-full rounded border px-2 py-1.5 text-xs"
                  value={selectedMcSettings.masterQuestion}
                  onChange={(event) =>
                    updateSelectedPresentation({
                      multipleChoice: {
                        ...selectedMcSettings,
                        masterQuestion: event.target.value,
                      },
                    })
                  }
                />
              </label>
              <label className="mt-3 block text-[11px] ltc-muted">
                Options per question
                <select
                  className="ltc-input mt-1 w-full rounded border px-2 py-1.5 text-xs"
                  value={selectedMcSettings.optionCount}
                  onChange={(event) =>
                    updateSelectedPresentation({
                      multipleChoice: {
                        ...selectedMcSettings,
                        optionCount: clampMcOptionCount(Number(event.target.value)),
                      },
                    })
                  }
                >
                  {[2, 3, 4, 5, 6].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs ltc-fg">
                <input
                  type="checkbox"
                  className="rounded border"
                  checked={selectedMcSettings.shuffleOptions}
                  onChange={(event) =>
                    updateSelectedPresentation({
                      multipleChoice: {
                        ...selectedMcSettings,
                        shuffleOptions: event.target.checked,
                      },
                    })
                  }
                />
                Shuffle answer options
              </label>
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs ltc-fg">
                <input
                  type="checkbox"
                  className="rounded border"
                  checked={selectedMcSettings.autoAdvanceOnPass}
                  onChange={(event) =>
                    updateSelectedPresentation({
                      multipleChoice: {
                        ...selectedMcSettings,
                        autoAdvanceOnPass: event.target.checked,
                      },
                    })
                  }
                />
                Auto-advance when correct
              </label>
              <div className="mt-3 border-t border-stone-200/80 pt-3">
                <AudioClipControls
                  label="Prompt audio (optional)"
                  hint="Pack-wide clip for questions that don’t already have word audio. Record, upload, or pick from your library."
                  value={selectedMcSettings.promptAudioUrl ?? ""}
                  onChange={(url) =>
                    updateSelectedPresentation({
                      multipleChoice: {
                        ...selectedMcSettings,
                        ...(url.trim()
                          ? { promptAudioUrl: url.trim() }
                          : { promptAudioUrl: undefined }),
                      },
                    })
                  }
                />
              </div>
            </CollapsibleSettingsPanel>

              <CollapsibleSettingsPanel
                sectionId="mc-questions"
                title="Questions"
                openSectionId={rightOpenSectionId}
                onOpenSection={setRightOpenSectionId}
              >
                <p className="text-[11px] leading-snug ltc-subtle">
                  Override question text, option labels, correct answer, or prompt
                  audio for individual items. Leave a field alone to keep the
                  compiled value.
                </p>
              {selectedMcItems.length > 0 ? (
                <div className="mt-3">
                    <AuthoringItemPager
                      tone="ltc"
                      stickyNav
                      count={selectedMcItems.length}
                      index={mcItemIndex}
                      onIndexChange={setMcItemIndex}
                      label="Question"
                    >
                      {(() => {
                        const item = selectedMcItems[mcItemIndex];
                        if (!item) return null;
                        const overlay = selectedMcSettings.itemOverlays?.find(
                          (entry) => entry.itemId === item.itemId,
                        );
                        const question = overlay?.question ?? item.question;
                        const correctOptionId =
                          overlay?.correctOptionId ?? item.correctOptionId;
                        const promptAudioUrl =
                          overlay?.promptAudioUrl ?? item.promptAudioUrl;
                        const correctLabel =
                          item.options.find(
                            (option) => option.id === correctOptionId,
                          )?.label ?? item.itemId;
                        return (
                          <div className="space-y-2">
                            <p className="text-[11px] font-medium ltc-fg">
                              Correct:{" "}
                              <span className="font-normal ltc-subtle">
                                {correctLabel}
                              </span>
                            </p>
                            <label className="block text-[11px] ltc-muted">
                              Question text
                              <input
                                type="text"
                                className="ltc-input mt-1 w-full rounded border px-2 py-1.5 text-xs"
                                value={question}
                                onChange={(event) =>
                                  patchMcItemOverlay(item.itemId, {
                                    question: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <div className="space-y-1.5">
                              <p className="text-[11px] ltc-muted">
                                Options{" "}
                                <span className="font-normal ltc-subtle">
                                  (radio = correct answer)
                                </span>
                              </p>
                              {item.options.map((option) => (
                                <div
                                  key={option.id}
                                  className="flex items-center gap-2 text-[11px] ltc-muted"
                                >
                                  <input
                                    type="radio"
                                    name={`ltc-mc-correct-${item.itemId}`}
                                    className="shrink-0"
                                    checked={correctOptionId === option.id}
                                    onChange={() =>
                                      patchMcItemOverlay(item.itemId, {
                                        correctOptionId: option.id,
                                      })
                                    }
                                    aria-label={`Mark option ${option.id} as correct`}
                                  />
                                  <span className="w-4 shrink-0 font-semibold uppercase ltc-label">
                                    {option.id}
                                  </span>
                                  <input
                                    type="text"
                                    className="ltc-input min-w-0 flex-1 rounded border px-2 py-1 text-xs"
                                    value={
                                      overlay?.optionLabels?.[option.id] ??
                                      option.label
                                    }
                                    onChange={(event) =>
                                      patchMcItemOverlay(item.itemId, {
                                        optionLabel: {
                                          optionId: option.id,
                                          label: event.target.value,
                                        },
                                      })
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                            <AudioClipControls
                              label="Prompt audio"
                              hint="Overrides word audio and the pack-wide clip for this question only."
                              value={promptAudioUrl}
                              onChange={(url) =>
                                patchMcItemOverlay(item.itemId, {
                                  promptAudioUrl: url.trim() ? url : null,
                                })
                              }
                            />
                          </div>
                        );
                      })()}
                    </AuthoringItemPager>
                  </div>
                ) : selectedCompositionBeat?.source.type === "vocab_compile" ? (
                  <p className="mt-3 text-[11px] leading-snug ltc-subtle">
                    Per-question editors appear after the preview compiles.
                  </p>
                ) : (
                  <p className="mt-3 text-[11px] leading-snug ltc-subtle">
                    Switch source mode to Vocabulary list, then wait for the
                    preview to compile.
                  </p>
                )}
              </CollapsibleSettingsPanel>
            </>
          ) : null}

          {selectedLetterSettings ? (
            <CollapsibleSettingsPanel
              sectionId="letter-settings"
              title="Letter scramble settings"
              openSectionId={rightOpenSectionId}
              onOpenSection={setRightOpenSectionId}
            >
              <p className="text-[11px] leading-snug ltc-subtle">
                Applies to every item in this activity when generated from a vocabulary
                list.
              </p>
              {selectedCompositionBeat?.source.type !== "vocab_compile" && (
                <p className="mt-2 text-[11px] leading-snug ltc-notice-banner">
                  Switch source mode to Vocabulary list to use these settings in the
                  preview.
                </p>
              )}
              <label className="mt-3 block text-[11px] ltc-muted">
                Prompt
                <input
                  type="text"
                  className="ltc-input mt-1 w-full rounded border px-2 py-1.5 text-xs"
                  value={selectedLetterSettings.prompt}
                  onChange={(event) =>
                    updateSelectedPresentation({
                      letterMixup: {
                        ...selectedLetterSettings,
                        prompt: event.target.value,
                      },
                    })
                  }
                />
              </label>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs ltc-fg">
                <input
                  type="checkbox"
                  className="rounded border"
                  checked={selectedLetterSettings.shuffleLetters}
                  onChange={(event) =>
                    updateSelectedPresentation({
                      letterMixup: {
                        ...selectedLetterSettings,
                        shuffleLetters: event.target.checked,
                      },
                    })
                  }
                />
                Shuffle letters
              </label>
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs ltc-fg">
                <input
                  type="checkbox"
                  className="rounded border"
                  checked={selectedLetterSettings.caseSensitive}
                  onChange={(event) =>
                    updateSelectedPresentation({
                      letterMixup: {
                        ...selectedLetterSettings,
                        caseSensitive: event.target.checked,
                      },
                    })
                  }
                />
                Case sensitive
              </label>
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs ltc-fg">
                <input
                  type="checkbox"
                  className="rounded border"
                  checked={selectedLetterSettings.autoAdvanceOnPass}
                  onChange={(event) =>
                    updateSelectedPresentation({
                      letterMixup: {
                        ...selectedLetterSettings,
                        autoAdvanceOnPass: event.target.checked,
                      },
                    })
                  }
                />
                Auto-advance when correct
              </label>
              <div className="mt-3 border-t border-stone-200/80 pt-3">
                <AudioClipControls
                  label="Word audio (optional)"
                  hint="Pack-wide clip for items that don’t already have word audio from the vocabulary list."
                  value={selectedLetterSettings.imageAudioUrl ?? ""}
                  onChange={(url) =>
                    updateSelectedPresentation({
                      letterMixup: {
                        ...selectedLetterSettings,
                        ...(url.trim()
                          ? { imageAudioUrl: url.trim() }
                          : { imageAudioUrl: undefined }),
                      },
                    })
                  }
                />
              </div>
            </CollapsibleSettingsPanel>
          ) : null}

          {selectedListenSettings ? (
            <CollapsibleSettingsPanel
              sectionId="listen-questions"
              title="Questions"
              openSectionId={rightOpenSectionId}
              onOpenSection={setRightOpenSectionId}
            >
              <p className="text-[11px] leading-snug ltc-subtle">
                Edit each question prompt, attach prompt audio, and control
                auto-play. Without a clip, Lesson Player uses TTS from the dialog
                text.
              </p>
              {selectedListenItems.length > 0 ? (
                <div className="mt-3">
                  <AuthoringItemPager
                    tone="ltc"
                    stickyNav
                    count={selectedListenItems.length}
                    index={listenItemIndex}
                    onIndexChange={setListenItemIndex}
                    label="Question"
                  >
                    {(() => {
                      const item = selectedListenItems[listenItemIndex];
                      if (!item || !selectedListenSettings) return null;
                      const overlay = selectedListenSettings.itemOverlays?.find(
                        (entry) => entry.itemIndex === item.itemIndex,
                      );
                      const bodyText = overlay?.bodyText ?? item.bodyText;
                      const promptAudioUrl =
                        overlay?.promptAudioUrl ?? item.promptAudioUrl;
                      const autoPlay = overlay?.autoPlay ?? item.autoPlay;
                      return (
                        <div className="space-y-2">
                          <label className="block text-[11px] ltc-muted">
                            Question prompt
                            <input
                              type="text"
                              className="ltc-input mt-1 w-full rounded border px-2 py-1.5 text-xs"
                              value={bodyText}
                              onChange={(event) =>
                                patchListenItemOverlay(item.itemIndex, {
                                  bodyText: event.target.value,
                                })
                              }
                            />
                          </label>
                          {item.dialogText.trim() ? (
                            <p className="text-[11px] leading-snug ltc-subtle">
                              Dialog: {item.dialogText.trim().slice(0, 90)}
                              {item.dialogText.trim().length > 90 ? "…" : ""}
                            </p>
                          ) : null}
                          <AudioClipControls
                            label="Prompt audio"
                            hint="Replaces TTS for this dialog when set."
                            value={promptAudioUrl}
                            onChange={(url) =>
                              patchListenItemOverlay(item.itemIndex, {
                                promptAudioUrl: url.trim() ? url : null,
                              })
                            }
                          />
                          <label className="flex cursor-pointer items-center gap-2 text-xs ltc-fg">
                            <input
                              type="checkbox"
                              className="rounded border"
                              checked={autoPlay}
                              onChange={(event) =>
                                patchListenItemOverlay(item.itemIndex, {
                                  autoPlay: event.target.checked,
                                })
                              }
                            />
                            Auto-play prompt
                          </label>
                        </div>
                      );
                    })()}
                  </AuthoringItemPager>
                </div>
              ) : (
                <p className="mt-3 text-[11px] leading-snug ltc-subtle">
                  Items appear after the preview compiles.
                </p>
              )}
            </CollapsibleSettingsPanel>
          ) : null}

          {selectedHotspotsSettings ? (
            <CollapsibleSettingsPanel
              sectionId="hotspots-settings"
              title="Hotspot click content"
              openSectionId={rightOpenSectionId}
              onOpenSection={setRightOpenSectionId}
            >
              <p className="text-[11px] leading-snug ltc-subtle">
                Stage what appears when a hotspot is tapped. Today that is
                dialogue cards (speaker + text + optional audio). More card types
                can plug into the same list later.
              </p>
              {selectedHotspotPanels.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {selectedHotspotPanels.map((panel) => (
                    <CollapsibleSettingsPanel
                      key={panel.dialogueId}
                      sectionId={panel.dialogueId}
                      title={panel.dialogueTitle || panel.dialogueId}
                      openSectionId={hotspotPanelOpenId}
                      onOpenSection={setHotspotPanelOpenId}
                    >
                      <label className="block text-[11px] ltc-muted">
                        Panel title
                        <input
                          type="text"
                          className="ltc-input mt-1 w-full rounded border px-2 py-1.5 text-xs"
                          value={panel.dialogueTitle}
                          onChange={(event) =>
                            updateHotspotsSettings(
                              patchHotspotPanelTitle(
                                selectedHotspotsSettings,
                                panel.dialogueId,
                                event.target.value,
                                panel.cards,
                              ),
                            )
                          }
                        />
                      </label>
                      <ul className="mt-2 space-y-2">
                        {panel.cards.map((card, cardIndex) => {
                          if (card.type !== "dialogue_turn") return null;
                          return (
                            <li
                              key={card.id}
                              className="rounded border border-stone-200/70 bg-white/70 px-2 py-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wide ltc-label">
                                  Dialogue card {cardIndex + 1}
                                </p>
                                <button
                                  type="button"
                                  className="ltc-btn rounded px-1.5 py-0.5 text-[10px] disabled:opacity-40"
                                  disabled={panel.cards.length <= 1}
                                  onClick={() =>
                                    updateHotspotsSettings(
                                      removeHotspotDialogueTurnCard(
                                        selectedHotspotsSettings,
                                        panel.dialogueId,
                                        card.id,
                                        panel.cards,
                                        panel.dialogueTitle,
                                      ),
                                    )
                                  }
                                >
                                  Remove
                                </button>
                              </div>
                              <label className="mt-1.5 block text-[11px] ltc-muted">
                                Speaker
                                <input
                                  type="text"
                                  className="ltc-input mt-1 w-full rounded border px-2 py-1 text-xs"
                                  value={card.speaker}
                                  placeholder="Optional"
                                  onChange={(event) =>
                                    updateHotspotsSettings(
                                      patchHotspotDialogueTurnCard(
                                        selectedHotspotsSettings,
                                        panel.dialogueId,
                                        card.id,
                                        { speaker: event.target.value },
                                        panel.cards,
                                        panel.dialogueTitle,
                                      ),
                                    )
                                  }
                                />
                              </label>
                              <label className="mt-1.5 block text-[11px] ltc-muted">
                                Shown text
                                <textarea
                                  rows={2}
                                  className="ltc-input mt-1 w-full resize-y rounded border px-2 py-1 text-xs leading-snug"
                                  value={card.text}
                                  onChange={(event) =>
                                    updateHotspotsSettings(
                                      patchHotspotDialogueTurnCard(
                                        selectedHotspotsSettings,
                                        panel.dialogueId,
                                        card.id,
                                        { text: event.target.value },
                                        panel.cards,
                                        panel.dialogueTitle,
                                      ),
                                    )
                                  }
                                />
                              </label>
                              <label className="mt-1.5 block text-[11px] ltc-muted">
                                Speak text (optional)
                                <input
                                  type="text"
                                  className="ltc-input mt-1 w-full rounded border px-2 py-1 text-xs"
                                  value={card.speakText ?? ""}
                                  placeholder="TTS line when no audio clip"
                                  onChange={(event) =>
                                    updateHotspotsSettings(
                                      patchHotspotDialogueTurnCard(
                                        selectedHotspotsSettings,
                                        panel.dialogueId,
                                        card.id,
                                        {
                                          speakText: event.target.value
                                            ? event.target.value
                                            : null,
                                        },
                                        panel.cards,
                                        panel.dialogueTitle,
                                      ),
                                    )
                                  }
                                />
                              </label>
                              <div className="mt-1.5">
                                <AudioClipControls
                                  label="Card audio"
                                  hint="Replaces TTS for this card only."
                                  value={card.audioUrl ?? ""}
                                  onChange={(url) =>
                                    updateHotspotsSettings(
                                      patchHotspotDialogueTurnCard(
                                        selectedHotspotsSettings,
                                        panel.dialogueId,
                                        card.id,
                                        {
                                          audioUrl: url.trim() ? url : null,
                                        },
                                        panel.cards,
                                        panel.dialogueTitle,
                                      ),
                                    )
                                  }
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      <button
                        type="button"
                        className="ltc-btn mt-2 w-full rounded px-2 py-1.5 text-[11px]"
                        onClick={() =>
                          updateHotspotsSettings(
                            addHotspotDialogueTurnCard(
                              selectedHotspotsSettings,
                              panel.dialogueId,
                              panel.cards,
                              panel.dialogueTitle,
                            ),
                          )
                        }
                      >
                        Add dialogue card
                      </button>
                    </CollapsibleSettingsPanel>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-[11px] leading-snug ltc-subtle">
                  Hotspot panels appear after the preview compiles.
                </p>
              )}
            </CollapsibleSettingsPanel>
          ) : null}

          {selectedLifSettings ? (
            <CollapsibleSettingsPanel
              sectionId="lif-questions"
              title="Listen examples"
              openSectionId={rightOpenSectionId}
              onOpenSection={setRightOpenSectionId}
            >
              <p className="text-[11px] leading-snug ltc-subtle">
                Record or attach a clip for each Listen example. Without a clip,
                Lesson Player uses TTS from the sentence.
              </p>
              {selectedLifExamples.length > 0 ? (
                <div className="mt-3">
                  <AuthoringItemPager
                    tone="ltc"
                    stickyNav
                    count={selectedLifExamples.length}
                    index={lifExampleIndex}
                    onIndexChange={setLifExampleIndex}
                    label="Example"
                  >
                    {(() => {
                      const example = selectedLifExamples[lifExampleIndex];
                      if (!example || !selectedLifSettings) return null;
                      const overlay = selectedLifSettings.exampleOverlays?.find(
                        (entry) => entry.exampleId === example.exampleId,
                      );
                      const audioUrl = overlay?.audioUrl ?? example.audioUrl;
                      return (
                        <div className="space-y-2">
                          <p className="text-[11px] font-medium ltc-fg">
                            {example.tabLabel}
                          </p>
                          {example.listenPreview ? (
                            <p className="text-[11px] leading-snug ltc-subtle">
                              {example.listenPreview}
                            </p>
                          ) : null}
                          <AudioClipControls
                            label="Listen audio"
                            hint="Replaces TTS when the student taps Listen."
                            value={audioUrl}
                            onChange={(url) =>
                              patchLifExampleOverlay(example.exampleId, {
                                audioUrl: url.trim() ? url : null,
                              })
                            }
                          />
                        </div>
                      );
                    })()}
                  </AuthoringItemPager>
                </div>
              ) : (
                <p className="mt-3 text-[11px] leading-snug ltc-subtle">
                  Listen examples appear after the preview compiles.
                </p>
              )}
            </CollapsibleSettingsPanel>
          ) : null}

          {selectedLineMatchSettings ? (
            <CollapsibleSettingsPanel
              sectionId="line-match-settings"
              title="Line match settings"
              openSectionId={rightOpenSectionId}
              onOpenSection={setRightOpenSectionId}
            >
              <p className="text-[11px] leading-snug ltc-subtle">
                Applies to every screen in this activity when generated from a
                vocabulary list.
              </p>
              {selectedCompositionBeat?.source.type !== "vocab_compile" && (
                <p className="mt-2 text-[11px] leading-snug ltc-notice-banner">
                  Switch source mode to Vocabulary list to use these settings in the
                  preview.
                </p>
              )}
              <label className="mt-3 block text-[11px] ltc-muted">
                Instruction text
                <input
                  type="text"
                  className="ltc-input mt-1 w-full rounded border px-2 py-1.5 text-xs"
                  value={selectedLineMatchSettings.bodyText}
                  onChange={(event) =>
                    updateSelectedPresentation({
                      lineMatch: {
                        ...selectedLineMatchSettings,
                        bodyText: event.target.value,
                      },
                    })
                  }
                />
              </label>
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs ltc-fg">
                <input
                  type="checkbox"
                  className="rounded border"
                  checked={selectedLineMatchSettings.autoAdvanceOnPass}
                  onChange={(event) =>
                    updateSelectedPresentation({
                      lineMatch: {
                        ...selectedLineMatchSettings,
                        autoAdvanceOnPass: event.target.checked,
                      },
                    })
                  }
                />
                Auto-advance when correct
              </label>
            </CollapsibleSettingsPanel>
          ) : null}

          {selectedTrueFalseSettings ? (
            <CollapsibleSettingsPanel
              sectionId="true-false-settings"
              title="True / false settings"
              openSectionId={rightOpenSectionId}
              onOpenSection={setRightOpenSectionId}
            >
              <p className="text-[11px] leading-snug ltc-subtle">
                Applies to every item in this activity when generated from a vocabulary
                list.
              </p>
              {selectedCompositionBeat?.source.type !== "vocab_compile" && (
                <p className="mt-2 text-[11px] leading-snug ltc-notice-banner">
                  Switch source mode to Vocabulary list to use these settings in the
                  preview.
                </p>
              )}
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs ltc-fg">
                <input
                  type="checkbox"
                  className="rounded border"
                  checked={selectedTrueFalseSettings.autoAdvanceOnPass}
                  onChange={(event) =>
                    updateSelectedPresentation({
                      trueFalse: {
                        ...selectedTrueFalseSettings,
                        autoAdvanceOnPass: event.target.checked,
                      },
                    })
                  }
                />
                Auto-advance when correct
              </label>
            </CollapsibleSettingsPanel>
          ) : null}

          {selectedSentenceScrambleSettings ? (
            <CollapsibleSettingsPanel
              sectionId="sentence-scramble-settings"
              title="Sentence scramble settings"
              openSectionId={rightOpenSectionId}
              onOpenSection={setRightOpenSectionId}
            >
              <p className="text-[11px] leading-snug ltc-subtle">
                Applies to every item in this activity when generated from a vocabulary
                list.
              </p>
              {selectedCompositionBeat?.source.type !== "vocab_compile" && (
                <p className="mt-2 text-[11px] leading-snug ltc-notice-banner">
                  Switch source mode to Vocabulary list to use these settings in the
                  preview.
                </p>
              )}
              <label className="mt-3 block text-[11px] ltc-muted">
                Instruction text
                <input
                  type="text"
                  className="ltc-input mt-1 w-full rounded border px-2 py-1.5 text-xs"
                  value={selectedSentenceScrambleSettings.bodyText}
                  onChange={(event) =>
                    updateSelectedPresentation({
                      sentenceScramble: {
                        ...selectedSentenceScrambleSettings,
                        bodyText: event.target.value,
                      },
                    })
                  }
                />
              </label>
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs ltc-fg">
                <input
                  type="checkbox"
                  className="rounded border"
                  checked={selectedSentenceScrambleSettings.autoAdvanceOnPass}
                  onChange={(event) =>
                    updateSelectedPresentation({
                      sentenceScramble: {
                        ...selectedSentenceScrambleSettings,
                        autoAdvanceOnPass: event.target.checked,
                      },
                    })
                  }
                />
                Auto-advance when correct
              </label>
            </CollapsibleSettingsPanel>
          ) : null}

          {selectedFillBlanksSettings ? (
            <CollapsibleSettingsPanel
              sectionId="fill-blanks-settings"
              title="Fill in the blanks settings"
              openSectionId={rightOpenSectionId}
              onOpenSection={setRightOpenSectionId}
            >
              <p className="text-[11px] leading-snug ltc-subtle">
                Applies to every item in this activity when generated from a vocabulary
                list.
              </p>
              {selectedCompositionBeat?.source.type !== "vocab_compile" && (
                <p className="mt-2 text-[11px] leading-snug ltc-notice-banner">
                  Switch source mode to Vocabulary list to use these settings in the
                  preview.
                </p>
              )}
              <label className="mt-3 block text-[11px] ltc-muted">
                Instruction text
                <input
                  type="text"
                  className="ltc-input mt-1 w-full rounded border px-2 py-1.5 text-xs"
                  value={selectedFillBlanksSettings.bodyText}
                  onChange={(event) =>
                    updateSelectedPresentation({
                      fillBlanks: {
                        ...selectedFillBlanksSettings,
                        bodyText: event.target.value,
                      },
                    })
                  }
                />
              </label>
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs ltc-fg">
                <input
                  type="checkbox"
                  className="rounded border"
                  checked={selectedFillBlanksSettings.autoAdvanceOnPass}
                  onChange={(event) =>
                    updateSelectedPresentation({
                      fillBlanks: {
                        ...selectedFillBlanksSettings,
                        autoAdvanceOnPass: event.target.checked,
                      },
                    })
                  }
                />
                Auto-advance when correct
              </label>
            </CollapsibleSettingsPanel>
          ) : null}

          {selectedMemorySettings ? (
            <CollapsibleSettingsPanel
              sectionId="memory-settings"
              title="Memory settings"
              openSectionId={rightOpenSectionId}
              onOpenSection={setRightOpenSectionId}
            >
              <p className="text-[11px] leading-snug ltc-subtle">
                Choose the text students match to each vocabulary picture.
              </p>
              {selectedCompositionBeat?.source.type !== "vocab_compile" && (
                <p className="mt-2 text-[11px] leading-snug ltc-notice-banner">
                  Switch source mode to Vocabulary list to use this setting in the
                  preview.
                </p>
              )}
              <label className="mt-3 block text-[11px] ltc-muted">
                Text side
                <select
                  className="ltc-input mt-1 w-full rounded border px-2 py-1.5 text-xs"
                  value={selectedMemorySettings.textMode}
                  onChange={(event) =>
                    updateSelectedPresentation({
                      memory: {
                        textMode: event.target.value as LearningTrackMemorySettings["textMode"],
                      },
                    })
                  }
                >
                  <option value="word">Word vs picture</option>
                  <option value="definition">Definition vs picture</option>
                  <option value="example">Example sentence vs picture</option>
                </select>
              </label>
              <p className="mt-2 text-[10px] leading-snug ltc-subtle">
                Words without a picture or the selected text are skipped at compile.
              </p>
            </CollapsibleSettingsPanel>
          ) : null}

          {selectedCrosswordSettings ? (
            <CollapsibleSettingsPanel
              sectionId="crossword-settings"
              title="Crossword settings"
              openSectionId={rightOpenSectionId}
              onOpenSection={setRightOpenSectionId}
            >
              <p className="text-[11px] leading-snug ltc-subtle">
                Choose which vocabulary-list field becomes each clue.
              </p>
              {selectedCompositionBeat?.source.type !== "vocab_compile" && (
                <p className="mt-2 text-[11px] leading-snug ltc-notice-banner">
                  Switch source mode to Vocabulary list to use this setting in the
                  preview.
                </p>
              )}
              <label className="mt-3 block text-[11px] ltc-muted">
                Clue source
                <select
                  className="ltc-input mt-1 w-full rounded border px-2 py-1.5 text-xs"
                  value={selectedCrosswordSettings.clueMode}
                  onChange={(event) =>
                    updateSelectedPresentation({
                      crossword: {
                        clueMode: event.target.value as LearningTrackCrosswordSettings["clueMode"],
                      },
                    })
                  }
                >
                  <option value="definition_or_example">
                    Definition, then example
                  </option>
                  <option value="definition">Definition only</option>
                  <option value="example">Example sentence only</option>
                </select>
              </label>
            </CollapsibleSettingsPanel>
          ) : null}

          {!selectedFlashcardsSettings &&
          !selectedMcSettings &&
          !selectedLetterSettings &&
          !selectedListenSettings &&
          !selectedHotspotsSettings &&
          !selectedLifSettings &&
          !selectedLineMatchSettings &&
          !selectedTrueFalseSettings &&
          !selectedSentenceScrambleSettings &&
          !selectedFillBlanksSettings &&
          !selectedMemorySettings &&
          !selectedCrosswordSettings &&
          selectedCompositionBeat ? (
            <CollapsibleSettingsPanel
              sectionId="activity-settings"
              title="Activity settings"
              openSectionId={rightOpenSectionId}
              onOpenSection={setRightOpenSectionId}
            >
              <SkeletonBlock label="No activity-specific settings for this beat yet." />
            </CollapsibleSettingsPanel>
          ) : null}

          <CollapsibleSettingsPanel
            sectionId="bridge"
            title="Bridge / transition"
            openSectionId={rightOpenSectionId}
            onOpenSection={setRightOpenSectionId}
          >
            <SkeletonBlock label="Coming soon" />
          </CollapsibleSettingsPanel>
          <CollapsibleSettingsPanel
            sectionId="icon-portal"
            title="Icon / portal"
            openSectionId={rightOpenSectionId}
            onOpenSection={setRightOpenSectionId}
          >
            <SkeletonBlock label="Coming soon" />
          </CollapsibleSettingsPanel>
        </aside>
      </div>

      {/* Timeline */}
      <footer className="ltc-footer shrink-0 border-t px-3 py-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide ltc-label">
            Track timeline
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] ltc-subtle">
              {composition.beats.length} activities
              {pack ? ` · ${pack.screens.length} screens` : ""} · drag to reorder
            </p>
            <select
              className="ltc-input rounded border px-2 py-1 text-xs"
              value={addKind}
              aria-label="Activity type to add"
              onChange={(event) => setAddKind(event.target.value as LearningTrackBeatKind)}
            >
              {LEARNING_TRACK_BEAT_KIND_OPTIONS.map((kind) => (
                <option key={kind} value={kind}>
                  {LEARNING_TRACK_BEAT_LABELS[kind]}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="ltc-btn-primary rounded px-2.5 py-1 text-xs"
              onClick={addBeat}
            >
              Add activity
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {composition.beats.map((compositionBeat, index) => {
            const planned = beatPlan.find((entry) => entry.id === compositionBeat.id);
            const label = compositionBeat.label ?? LEARNING_TRACK_BEAT_LABELS[compositionBeat.kind];
            const bridge =
              planned?.afterBridge ??
              resolveAfterBridgePlan(compositionBeat, composition.beats[index + 1]);
            const active = compositionBeat.id === (selectedBeat?.id ?? selectedBeatId);
            const dragging = dragIndex === index;
            return (
              <div
                key={compositionBeat.id}
                className={`flex shrink-0 items-stretch gap-2 ${dragging ? "opacity-50" : ""}`}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragEnd={() => setDragIndex(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragIndex !== null) moveBeatTo(dragIndex, index);
                  setDragIndex(null);
                }}
              >
                <div
                  className="ltc-beat w-44 rounded-lg border px-3 py-2 transition"
                  data-active={active ? "true" : "false"}
                >
                  <button
                    type="button"
                    className="w-full cursor-grab text-left active:cursor-grabbing"
                    onClick={() => planned && selectBeat(planned)}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide ltc-subtle">
                      Activity {index + 1}
                    </p>
                    <p className="mt-0.5 text-sm font-medium ltc-fg">{label}</p>
                    <p className="mt-1 text-[11px] ltc-subtle">
                      {planned && planned.screenCount > 0
                        ? `${planned.screenCount} screen${planned.screenCount === 1 ? "" : "s"}`
                        : compositionBeat.kind}
                    </p>
                  </button>
                  <div className="mt-2 flex items-center gap-1">
                    <button
                      type="button"
                      className="ltc-btn-ghost rounded px-1.5 py-0.5 text-[11px] disabled:opacity-30"
                      disabled={index === 0}
                      aria-label={`Move ${label} earlier`}
                      onClick={() => moveBeatTo(index, index - 1)}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className="ltc-btn-ghost rounded px-1.5 py-0.5 text-[11px] disabled:opacity-30"
                      disabled={index >= composition.beats.length - 1}
                      aria-label={`Move ${label} later`}
                      onClick={() => moveBeatTo(index, index + 1)}
                    >
                      →
                    </button>
                    <button
                      type="button"
                      className="ml-auto ltc-btn-ghost rounded px-1.5 py-0.5 text-[11px] ltc-danger disabled:opacity-30"
                      disabled={composition.beats.length <= 1}
                      aria-label={`Remove ${label}`}
                      onClick={() => removeBeat(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {bridge && (
                  <button
                    type="button"
                    onClick={() => planned && previewBridge(planned)}
                    className="ltc-bridge flex w-16 flex-col items-center justify-center rounded-lg border border-dashed px-1 text-center"
                    title={bridge.intent}
                  >
                    <span className="text-[9px] font-semibold uppercase tracking-wide ltc-label">
                      Report
                    </span>
                    <span className="ltc-bridge-muted mt-0.5 text-[9px] leading-tight">
                      → next
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </footer>

      {vocabOverlay ? (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/55 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={
            vocabOverlay.mode === "create"
              ? "Create vocabulary list"
              : "Edit vocabulary list"
          }
        >
          <div className="flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden rounded-xl border border-stone-300 bg-stone-100 shadow-2xl">
            <VocabularyListWorkspace
              key={`${vocabOverlay.mode}:${vocabOverlay.libraryId ?? "new"}`}
              variant="overlay"
              startBlank={vocabOverlay.mode === "create"}
              openLibraryId={vocabOverlay.libraryId}
              onClose={() => setVocabOverlay(null)}
              onSaved={(entry) => {
                updateTrack({ vocabListId: entry.id });
                void refreshVocabLists();
                setNotice(`Track vocabulary set to “${entry.name}”.`);
              }}
            />
          </div>
        </div>
      ) : null}

      {bankActivityId ? (
        <AssignStudioActivityHomeworkOverlay
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          activityId={bankActivityId}
          activityTitle={bankActivityTitle || composition.title}
          format="learning_track"
          classes={classes}
        />
      ) : null}
    </main>
  );
}
