"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { LessonScreenRow } from "@/lib/data/catalog";
import type { AiGenerationDiagnosticsV1 } from "@/lib/ai/ai-generation-diagnostics";
import {
  findStoryboardSegmentIndexForScreenIndex,
  segmentLessonScreensForStoryboard,
} from "@/lib/lesson-activity-taxonomy";
import { screenOutlineLabel, screenThumbnailUrl } from "@/lib/lesson-screen-outline";
import type { CompletionPlayground } from "@/lib/lesson-schemas";
import {
  getLessonPublishBlockingReasons,
  lessonPublishChecklist,
} from "@/lib/lesson-editor-checklist";
import {
  findCongratsEndScreen,
  findOpeningStartScreen,
  isCongratsEndScreen,
  isOpeningStartScreen,
  normalizeLessonScreenOrderIds,
} from "@/lib/lesson-bookends";
import {
  addScreenTemplate,
  appendScreensFromAi,
  createQuizGroup,
  deleteLesson,
  deleteScreen,
  duplicateLesson,
  duplicateScreen,
  getLessonPlanForEditor,
  importLessonScreensJson,
  moveScreen,
  publishActivityLibraryFromLesson,
  reorderScreens,
  saveLesson,
  saveLessonPlan,
  unpublishActivityLibraryFromLesson,
  type AddScreenKind,
} from "@/lib/actions/teacher";
import { CEFR_LEVEL_OPTIONS } from "@/lib/cefr-level-options";
import { ConfirmSubmitButton } from "@/components/teacher/ConfirmSubmitButton";
import { useTeacherEditorHeader } from "@/components/teacher/TeacherEditorHeaderContext";
import { LessonLearningGoalsTable } from "@/app/teacher/(secure)/modules/[id]/lessons/[lessonId]/LessonLearningGoalsTable";
import {
  ScreenEditorCard,
  type ScreenEditorCardHandle,
  type ScreenPendingSaveSnapshot,
  type ScreenEditorStatus,
} from "./ScreenEditorCard";
import Image from "next/image";

const QuizBuilder = dynamic(
  () => import("./QuizBuilder").then((m) => m.QuizBuilder),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-sm text-neutral-600">Loading quiz builder…</div>
    ),
  },
);

const LessonPreviewOverlay = dynamic(
  () => import("./LessonPreviewOverlay").then((m) => m.LessonPreviewOverlay),
  { ssr: false },
);

type Props = {
  moduleId: string;
  lessonId: string;
  moduleSlug: string;
  moduleTitle: string;
  lessonSlug: string;
  currentLessonId: string;
  moduleLessons: { id: string; title: string; order_index: number }[];
  lessonTitle: string;
  lessonOrderIndex: number;
  lessonEstimatedMinutes: number | null;
  published: boolean;
  /** When set, this lesson is the course-editor mirror for an activity library item (`slug` = `activity-{uuid}`). */
  activityLibraryMirrorId?: string | null;
  /** Library visibility for the linked activity (teacher-only; null when not a mirror lesson). */
  activityLibraryPublished?: boolean | null;
  screens: LessonScreenRow[];
  /** Changes when `lessons.updated_at` changes — client refetches plan text (kept out of RSC). */
  lessonPlanSyncKey: string;
  /** Saved objectives; AI plan/generate require at least one non-empty line. */
  learningGoals: string[];
  /** When true, generator omits an opening start screen (editor already has one). */
  hasOpeningStart: boolean;
  /** Post-lesson reward-screen playground (optional). */
  completionPlayground?: CompletionPlayground | null;
  /** Right sidebar: skills and tools only (objectives live in the Plan panel). */
  children?: ReactNode;
};

function screensSyncKey(list: LessonScreenRow[]) {
  return list.map((s) => `${s.id}:${s.order_index}:${s.updated_at ?? ""}`).join("|");
}

function isServerRevisionNewer(serverTs: string, localTs: string): boolean {
  if (!serverTs) return false;
  if (!localTs) return true;
  const serverMs = Date.parse(serverTs);
  const localMs = Date.parse(localTs);
  if (!Number.isNaN(serverMs) && !Number.isNaN(localMs)) {
    return serverMs > localMs;
  }
  // Fallback for unexpected timestamp formats.
  return serverTs > localTs;
}

/**
 * When the server sends a new snapshot (after refresh / revalidation), prefer the
 * server row only when that row's `updated_at` advanced — meaning a save completed.
 * If the revision is unchanged but the payload differs, keep the local copy (unsaved
 * edits). This avoids RSC/cache races that briefly return old payloads and "snap back"
 * the editor and preview.
 */
function mergeServerScreensWithLocal(
  incoming: LessonScreenRow[],
  local: LessonScreenRow[],
): LessonScreenRow[] {
  const debug =
    typeof window !== "undefined" && window.localStorage.getItem("lessonEditorDebug") === "1";
  const localById = new Map(local.map((s) => [s.id, s]));
  return incoming.map((s) => {
    const prev = localById.get(s.id);
    if (!prev) return s;

    const serverTs = s.updated_at ?? "";
    const localTs = prev.updated_at ?? "";

    const serverRowIsNewer = isServerRevisionNewer(serverTs, localTs);

    if (serverRowIsNewer) {
      if (debug) console.debug("[lesson-editor] server row newer", s.id, serverTs, localTs);
      return s;
    }

    if (JSON.stringify(prev.payload) !== JSON.stringify(s.payload)) {
      if (debug) console.debug("[lesson-editor] preserving local payload", s.id);
      return { ...s, payload: prev.payload };
    }
    return s;
  });
}

function areScreensEquivalent(a: LessonScreenRow[], b: LessonScreenRow[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === b[i]) continue;
    if (
      a[i].id !== b[i].id ||
      a[i].order_index !== b[i].order_index ||
      a[i].updated_at !== b[i].updated_at ||
      a[i].screen_type !== b[i].screen_type ||
      JSON.stringify(a[i].payload) !== JSON.stringify(b[i].payload)
    ) {
      return false;
    }
  }
  return true;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const LESSON_HDR_BTN =
  "inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-neutral-300 bg-neutral-50 px-1.5 text-[11px] font-semibold text-neutral-700 shadow-sm hover:bg-neutral-100 active:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:px-2 sm:text-xs";

type LessonWorkspaceHeaderToolbarProps = {
  lessonMenuOpen: boolean;
  setLessonMenuOpen: Dispatch<SetStateAction<boolean>>;
  editorHelpOpen: boolean;
  setEditorHelpOpen: Dispatch<SetStateAction<boolean>>;
  /** Stable flag — student preview is disabled while a quiz group is selected (avoid new object identity each render). */
  previewDisabledForQuiz: boolean;
  setPreviewOverlayOpen: Dispatch<SetStateAction<boolean>>;
  setStoryboardOpen: Dispatch<SetStateAction<boolean>>;
  setPlanOpen: Dispatch<SetStateAction<boolean>>;
  setToolsOpen: Dispatch<SetStateAction<boolean>>;
  storyboardOpen: boolean;
  storyboardPinned: boolean;
  planOpen: boolean;
  planPinned: boolean;
  toolsOpen: boolean;
  toolsPinned: boolean;
};

function LessonWorkspaceHeaderToolbar({
  lessonMenuOpen,
  setLessonMenuOpen,
  editorHelpOpen,
  setEditorHelpOpen,
  previewDisabledForQuiz,
  setPreviewOverlayOpen,
  setStoryboardOpen,
  setPlanOpen,
  setToolsOpen,
  storyboardOpen,
  storyboardPinned,
  planOpen,
  planPinned,
  toolsOpen,
  toolsPinned,
}: LessonWorkspaceHeaderToolbarProps) {
  return (
    <>
      <button
        type="button"
        onClick={() => setLessonMenuOpen((v) => !v)}
        aria-expanded={lessonMenuOpen}
        aria-label={lessonMenuOpen ? "Close lesson menu" : "Open lesson menu"}
        className={LESSON_HDR_BTN}
        title="Switch lesson in this module"
      >
        Lessons
      </button>
      <button
        type="button"
        onClick={() => {
          setStoryboardOpen((prev) => {
            const next = !prev;
            if (next) {
              if (!planPinned && planOpen) setPlanOpen(false);
              if (!toolsPinned && toolsOpen) setToolsOpen(false);
            }
            return next;
          });
        }}
        aria-expanded={storyboardOpen}
        className={LESSON_HDR_BTN}
        title={
          storyboardOpen ?
            storyboardPinned ?
              "Hide storyboard (pinned)"
            : "Hide storyboard"
          : "Open storyboard"
        }
      >
        Storyboard
      </button>
      <button
        type="button"
        onClick={() => {
          setPlanOpen((prev) => {
            const next = !prev;
            if (next) {
              if (!storyboardPinned && storyboardOpen) setStoryboardOpen(false);
              if (!toolsPinned && toolsOpen) setToolsOpen(false);
            }
            return next;
          });
        }}
        aria-expanded={planOpen}
        className={LESSON_HDR_BTN}
        title={
          planOpen ?
            planPinned ?
              "Hide lesson plan (pinned)"
            : "Hide lesson plan"
          : "Lesson plan & AI"
        }
      >
        Plan
      </button>
      <button
        type="button"
        onClick={() => {
          setToolsOpen((prev) => {
            const next = !prev;
            if (next) {
              if (!storyboardPinned && storyboardOpen) setStoryboardOpen(false);
              if (!planPinned && planOpen) setPlanOpen(false);
            }
            return next;
          });
        }}
        aria-expanded={toolsOpen}
        className={LESSON_HDR_BTN}
        title={
          toolsOpen ?
            toolsPinned ?
              "Hide tools (pinned)"
            : "Hide tools"
          : "Open lesson tools"
        }
      >
        Tools
      </button>
      <button
        type="button"
        onClick={() => setPreviewOverlayOpen(true)}
        disabled={previewDisabledForQuiz}
        className={LESSON_HDR_BTN + (previewDisabledForQuiz ? " cursor-not-allowed opacity-50" : "")}
        title={
          previewDisabledForQuiz ?
            "Student preview is in the Quiz builder while a quiz is selected."
          : "Open floating student preview"
        }
      >
        Preview
      </button>
      <button
        type="button"
        onClick={() => setEditorHelpOpen((v) => !v)}
        aria-expanded={editorHelpOpen}
        className={LESSON_HDR_BTN}
        title={
          editorHelpOpen ? "Hide lesson & screen actions" : "Lesson & screen actions, publish, TTS"
        }
      >
        Help
      </button>
    </>
  );
}

type ActivityNote = {
  text: string;
  open: boolean;
  collapsed: boolean;
  x: number;
  y: number;
  z: number;
};

type ConnectorLine = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

function areConnectorLinesEqual(a: ConnectorLine[], b: ConnectorLine[]) {
  const EPS = 1;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (
      left.id !== right.id ||
      Math.abs(left.x1 - right.x1) > EPS ||
      Math.abs(left.y1 - right.y1) > EPS ||
      Math.abs(left.x2 - right.x2) > EPS ||
      Math.abs(left.y2 - right.y2) > EPS
    ) {
      return false;
    }
  }
  return true;
}

function stabilizeCoord(n: number): number {
  // DOM layout can jitter at sub-pixel precision between commits; normalize to avoid effect loops.
  return Math.round(n);
}

type EditorLayoutPrefs = {
  storyboardOpen: boolean;
  storyboardPinned: boolean;
  planOpen: boolean;
  planPinned: boolean;
  toolsOpen: boolean;
  toolsPinned: boolean;
  leftPanePct: number;
  rightPanePct: number;
  /** Width % of the bookend split row for the opening panel (closing gets the rest). */
  bookendSplitPct?: number;
};

const EDITOR_LAYOUT_KEY_PREFIX = "lesson-editor-layout";
const EDITOR_NOTES_KEY_PREFIX = "lesson-editor-notes";
const EDITOR_JUMP_NEWEST_KEY_PREFIX = "lesson-editor-jump-newest";
const EDITOR_JUMP_OPENING_KEY_PREFIX = "lesson-editor-jump-opening";

export function LessonEditorWorkspace({
  moduleId,
  lessonId,
  moduleSlug,
  moduleTitle,
  lessonSlug,
  currentLessonId,
  moduleLessons,
  lessonTitle,
  lessonOrderIndex,
  lessonEstimatedMinutes,
  published,
  activityLibraryMirrorId = null,
  activityLibraryPublished = null,
  screens,
  lessonPlanSyncKey,
  learningGoals,
  hasOpeningStart,
  completionPlayground = null,
  children,
}: Props) {
  const router = useRouter();
  const isActivityLibraryMirror = Boolean(activityLibraryMirrorId);
  const shellRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [liveScreens, setLiveScreens] = useState<LessonScreenRow[]>(screens);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [storyboardOpen, setStoryboardOpen] = useState(false);
  const [storyboardPinned, setStoryboardPinned] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [planPinned, setPlanPinned] = useState(false);
  const [planText, setPlanText] = useState("");
  const [planLoadState, setPlanLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [planLoadError, setPlanLoadError] = useState<string | null>(null);
  const [planFetchNonce, setPlanFetchNonce] = useState(0);
  const [planBusy, setPlanBusy] = useState(false);
  const [planMsg, setPlanMsg] = useState("");
  const [lastAiGenerationDiagnostics, setLastAiGenerationDiagnostics] =
    useState<AiGenerationDiagnosticsV1 | null>(null);
  const [planCefr, setPlanCefr] = useState<string>("a1");
  const [planVocab, setPlanVocab] = useState("");
  const [planPremise, setPlanPremise] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsPinned, setToolsPinned] = useState(false);
  const [previewOverlayOpen, setPreviewOverlayOpen] = useState(false);
  const [lessonMenuOpen, setLessonMenuOpen] = useState(false);
  const [editorHelpOpen, setEditorHelpOpen] = useState(false);
  const [advancedJsonOpen, setAdvancedJsonOpen] = useState(false);
  const { setLessonToolbarSlot, notifyScreenSaved, setSaveState } = useTeacherEditorHeader();

  const [screenEditorStatus, setScreenEditorStatus] = useState<ScreenEditorStatus>({
    isSaving: false,
    isDirty: false,
    lastSavedAt: null,
    err: null,
  });
  const [storyboardBusy, setStoryboardBusy] = useState(false);
  const screenEditorRef = useRef<ScreenEditorCardHandle>(null);
  const bookendOpeningRef = useRef<ScreenEditorCardHandle>(null);
  const bookendCongratsRef = useRef<ScreenEditorCardHandle>(null);
  const onScreenEditorStatus = useCallback((s: ScreenEditorStatus) => {
    setScreenEditorStatus(s);
  }, []);
  const [leftPanePct, setLeftPanePct] = useState(23);
  const [rightPanePct, setRightPanePct] = useState(23);
  const [bookendSplitPct, setBookendSplitPct] = useState(50);
  const [activityNotes, setActivityNotes] = useState<Record<string, ActivityNote>>({});
  const [connectorLines, setConnectorLines] = useState<ConnectorLine[]>([]);
  const connectorLinesRef = useRef<ConnectorLine[]>([]);
  const noteZRef = useRef(20);
  const prevUserSelectRef = useRef<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const noteRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragNoteRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [resizing, setResizing] = useState<{
    pane: "left" | "right";
    startX: number;
    startLeft: number;
    startRight: number;
  } | null>(null);
  const [resizingBookendSplit, setResizingBookendSplit] = useState<{
    startX: number;
    startPct: number;
  } | null>(null);
  const bookendSplitRef = useRef<HTMLDivElement>(null);
  const [bookendLayoutWide, setBookendLayoutWide] = useState(false);
  const layoutKey = `${EDITOR_LAYOUT_KEY_PREFIX}:${lessonId}`;
  const notesKey = `${EDITOR_NOTES_KEY_PREFIX}:${lessonId}`;
  const jumpNewestKey = `${EDITOR_JUMP_NEWEST_KEY_PREFIX}:${lessonId}`;
  const jumpOpeningKey = `${EDITOR_JUMP_OPENING_KEY_PREFIX}:${lessonId}`;
  const canUseDomPortal = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const lastUserActivityAtRef = useRef(Date.now());

  const serverKey = useMemo(() => screensSyncKey(screens), [screens]);

  useEffect(() => {
    queueMicrotask(() => {
      let jumpToIndex: number | null = null;
      setLiveScreens((prev) => {
        const merged = mergeServerScreensWithLocal(screens, prev);
        if (typeof window !== "undefined") {
          const shouldJumpNewest = window.sessionStorage.getItem(jumpNewestKey) === "1";
          const shouldJumpOpening = window.sessionStorage.getItem(jumpOpeningKey) === "1";
          if (shouldJumpNewest) {
            window.sessionStorage.removeItem(jumpNewestKey);
            jumpToIndex = Math.max(0, merged.length - 1);
          } else if (shouldJumpOpening) {
            window.sessionStorage.removeItem(jumpOpeningKey);
            const opening = findOpeningStartScreen(merged);
            jumpToIndex =
              opening ? Math.max(0, merged.findIndex((x) => x.id === opening.id)) : 0;
          }
        }
        if (areScreensEquivalent(prev, merged)) return prev;
        return merged;
      });
      if (jumpToIndex != null) {
        setSelectedIndex(jumpToIndex);
      }
    });
  }, [serverKey, jumpNewestKey, jumpOpeningKey, screens]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    queueMicrotask(() => {
      try {
        const raw = window.localStorage.getItem(layoutKey);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<EditorLayoutPrefs>;
        if (typeof parsed.storyboardOpen === "boolean") setStoryboardOpen(parsed.storyboardOpen);
        if (typeof parsed.storyboardPinned === "boolean") setStoryboardPinned(parsed.storyboardPinned);
        if (typeof parsed.planOpen === "boolean") setPlanOpen(parsed.planOpen);
        if (typeof parsed.planPinned === "boolean") setPlanPinned(parsed.planPinned);
        if (typeof parsed.toolsOpen === "boolean") setToolsOpen(parsed.toolsOpen);
        if (typeof parsed.toolsPinned === "boolean") setToolsPinned(parsed.toolsPinned);
        if (typeof parsed.leftPanePct === "number") setLeftPanePct(clamp(parsed.leftPanePct, 14, 60));
        if (typeof parsed.rightPanePct === "number")
          setRightPanePct(clamp(parsed.rightPanePct, 16, 60));
        if (typeof parsed.bookendSplitPct === "number") {
          setBookendSplitPct(clamp(parsed.bookendSplitPct, 28, 72));
        }
      } catch {
        // Ignore corrupted local storage.
      }
    });
  }, [layoutKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setBookendLayoutWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    queueMicrotask(() => {
      try {
        const raw = window.localStorage.getItem(notesKey);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Record<string, ActivityNote>;
        setActivityNotes(parsed);
      } catch {
        // Ignore corrupted local storage.
      }
    });
  }, [notesKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefs: EditorLayoutPrefs = {
      storyboardOpen,
      storyboardPinned,
      planOpen,
      planPinned,
      toolsOpen,
      toolsPinned,
      leftPanePct,
      rightPanePct,
      bookendSplitPct,
    };
    window.localStorage.setItem(layoutKey, JSON.stringify(prefs));
  }, [
    layoutKey,
    storyboardOpen,
    storyboardPinned,
    planOpen,
    planPinned,
    toolsOpen,
    toolsPinned,
    leftPanePct,
    rightPanePct,
    bookendSplitPct,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(notesKey, JSON.stringify(activityNotes));
  }, [notesKey, activityNotes]);

  useEffect(() => {
    let cancelled = false;
    setPlanLoadState("loading");
    setPlanLoadError(null);
    void (async () => {
      try {
        const { lessonPlan } = await getLessonPlanForEditor(lessonId, moduleId);
        if (!cancelled) {
          setPlanText(lessonPlan);
          setPlanLoadState("ready");
        }
      } catch (e) {
        if (!cancelled) {
          setPlanText("");
          setPlanLoadError(e instanceof Error ? e.message : "Could not load lesson plan");
          setPlanLoadState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, moduleId, lessonPlanSyncKey, planFetchNonce]);

  const bumpScreenPayload = useCallback((screenId: string, payload: unknown) => {
    startTransition(() => {
      setLiveScreens((prev) =>
        prev.map((s) => (s.id === screenId ? { ...s, payload } : s)),
      );
    });
  }, []);

  const checklist = useMemo(
    () => lessonPublishChecklist({ published, screens: liveScreens }),
    [published, liveScreens],
  );

  const publishBlockingReasons = useMemo(
    () => getLessonPublishBlockingReasons(liveScreens),
    [liveScreens],
  );
  const publishBlocked = publishBlockingReasons.length > 0;

  const safeIndex = Math.min(
    Math.max(0, selectedIndex),
    Math.max(0, liveScreens.length - 1),
  );

  const storySegments = useMemo(
    () => segmentLessonScreensForStoryboard(liveScreens),
    [liveScreens],
  );
  const selectedSegment =
    storySegments[findStoryboardSegmentIndexForScreenIndex(storySegments, safeIndex)] ?? {
      type: "single" as const,
      screenIndex: 0,
    };
  const quizSelection =
    selectedSegment.type === "quiz" ?
      {
        groupId: selectedSegment.groupId,
        groupScreens: selectedSegment.screenIndices.map((i) => liveScreens[i]!),
      }
    : null;

  const previewDisabledForQuiz = selectedSegment.type === "quiz";
  const sortedModuleLessons = useMemo(
    () => [...moduleLessons].sort((a, b) => a.order_index - b.order_index),
    [moduleLessons],
  );

  useEffect(() => {
    if (!lessonMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLessonMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lessonMenuOpen]);

  useLayoutEffect(() => {
    setLessonToolbarSlot(
      <LessonWorkspaceHeaderToolbar
        lessonMenuOpen={lessonMenuOpen}
        setLessonMenuOpen={setLessonMenuOpen}
        editorHelpOpen={editorHelpOpen}
        setEditorHelpOpen={setEditorHelpOpen}
        previewDisabledForQuiz={previewDisabledForQuiz}
        setPreviewOverlayOpen={setPreviewOverlayOpen}
        setStoryboardOpen={setStoryboardOpen}
        setPlanOpen={setPlanOpen}
        setToolsOpen={setToolsOpen}
        storyboardOpen={storyboardOpen}
        storyboardPinned={storyboardPinned}
        planOpen={planOpen}
        planPinned={planPinned}
        toolsOpen={toolsOpen}
        toolsPinned={toolsPinned}
      />,
    );
    return () => setLessonToolbarSlot(null);
  }, [
    lessonMenuOpen,
    editorHelpOpen,
    previewDisabledForQuiz,
    setLessonToolbarSlot,
    storyboardOpen,
    storyboardPinned,
    planOpen,
    planPinned,
    toolsOpen,
    toolsPinned,
  ]);

  const navigateFromStoryboard = useCallback(
    (screenIndex: number) => {
      setSelectedIndex(screenIndex);
      if (!storyboardPinned) {
        setStoryboardOpen(false);
      }
      if (!planPinned) {
        setPlanOpen(false);
      }
      if (!toolsPinned) {
        setToolsOpen(false);
      }
    },
    [storyboardPinned, planPinned, toolsPinned],
  );

  /** Relative path only — same on server and client (avoids hydration mismatch from `window`). */
  const studentPath = `/learn/${moduleSlug}/${lessonSlug}`;
  const modulePath = `/teacher/modules/${moduleId}`;

  useEffect(() => {
    router.prefetch(modulePath);
  }, [router, modulePath]);

  const lessonMenuOverlay =
    lessonMenuOpen && canUseDomPortal ?
      createPortal(
        <div className="fixed inset-0 z-[85]">
          <button
            type="button"
            className="absolute inset-0 bg-black/20"
            aria-label="Close lesson menu"
            onClick={() => setLessonMenuOpen(false)}
          />
          <div className="absolute left-2 top-[calc(var(--lesson-editor-toolbar-height,3.5rem)+0.4rem)] w-[min(24rem,calc(100vw-1rem))] max-h-[min(78vh,40rem)] overflow-y-auto rounded-lg border border-neutral-300 bg-white p-3 shadow-2xl">
            <div className="mb-3 flex items-center gap-2 border-b border-neutral-200 pb-2">
              <Link
                href={modulePath}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-neutral-300 bg-neutral-50 px-2 text-sm font-bold text-neutral-800 hover:bg-neutral-100"
                onClick={() => setLessonMenuOpen(false)}
                aria-label="Back to module"
              >
                ←
              </Link>
              <h3 className="min-w-0 flex-1 truncate text-sm font-extrabold text-neutral-900">
                {moduleTitle}
              </h3>
            </div>
            <div className="space-y-1" role="tablist" aria-label={`Lessons in ${moduleTitle}`}>
              {sortedModuleLessons.map((lesson, index) => {
                const active = lesson.id === currentLessonId;
                return (
                  <Link
                    key={lesson.id}
                    href={`/teacher/modules/${moduleId}/lessons/${lesson.id}`}
                    role="tab"
                    aria-selected={active}
                    className={
                      active ?
                        "block rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-950"
                      : "block rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
                    }
                    onClick={() => setLessonMenuOpen(false)}
                  >
                    <span className="mr-1 text-xs font-bold uppercase tracking-wide text-neutral-500">
                      Lesson {index + 1}
                    </span>
                    {lesson.title}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  function exportJson() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            screens: liveScreens.map((s) => ({
              screen_type: s.screen_type,
              payload: s.payload,
            })),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lesson-${lessonSlug}-screens.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function copyStudentLink() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${studentPath}`
        : "";
    try {
      await navigator.clipboard.writeText(url);
      setCopyMsg("Copied student link.");
      setTimeout(() => setCopyMsg(null), 2500);
    } catch {
      setCopyMsg("Could not copy — copy manually from the address bar when viewing /learn.");
    }
  }

  async function applyReorder(orderedIds: string[]) {
    const flushed = await saveVisibleScreenEditors();
    if (!flushed) return;
    const prev = liveScreens;
    const map = new Map(liveScreens.map((s) => [s.id, s]));
    const proposedRows = orderedIds
      .map((id) => map.get(id))
      .filter((r): r is LessonScreenRow => r != null);
    const fixedIds = normalizeLessonScreenOrderIds(proposedRows);
    const nextRows = fixedIds.map((id, i) => {
      const row = map.get(id);
      if (!row) throw new Error("Missing screen");
      return { ...row, order_index: i };
    });
    setLiveScreens(nextRows);
    try {
      await reorderScreens(lessonId, moduleId, fixedIds);
    } catch {
      setLiveScreens(prev);
    }
  }

  function onDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onDrop(e: React.DragEvent, overId: string) {
    e.preventDefault();
    const fromId = draggingId ?? e.dataTransfer.getData("text/plain");
    setDraggingId(null);
    if (!fromId || fromId === overId) return;
    const ids = liveScreens.map((s) => s.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(overId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, fromId);
    const map = new Map(liveScreens.map((s) => [s.id, s]));
    const proposed = next
      .map((id) => map.get(id))
      .filter((r): r is LessonScreenRow => r != null);
    const fixedIds = normalizeLessonScreenOrderIds(proposed);
    const selectedId = liveScreens[safeIndex]?.id;
    if (selectedId) setSelectedIndex(Math.max(0, fixedIds.indexOf(selectedId)));
    void applyReorder(next);
  }

  function applyRowsAfterMutation(
    rows: LessonScreenRow[],
    previousRows: LessonScreenRow[],
    fallbackSelectedId: string | null,
  ) {
    setLiveScreens(rows);
    if (!rows.length) {
      setSelectedIndex(0);
      return;
    }
    const previousIds = new Set(previousRows.map((r) => r.id));
    const inserted = rows.find((r) => !previousIds.has(r.id))?.id ?? null;
    const preferredId = inserted ?? fallbackSelectedId;
    if (preferredId) {
      const idx = rows.findIndex((r) => r.id === preferredId);
      if (idx >= 0) {
        setSelectedIndex(idx);
        return;
      }
    }
    setSelectedIndex((prev) => Math.min(prev, rows.length - 1));
  }

  async function runStoryboardMutation(
    run: () => Promise<LessonScreenRow[]>,
    fallbackSelectedId: string | null,
    onError: string,
  ) {
    if (storyboardBusy) return;
    const flushed = await saveVisibleScreenEditors();
    if (!flushed) return;
    const before = liveScreens;
    setStoryboardBusy(true);
    try {
      const rows = await run();
      applyRowsAfterMutation(rows, before, fallbackSelectedId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : onError;
      setScreenEditorStatus((s) => ({ ...s, err: msg }));
    } finally {
      setStoryboardBusy(false);
    }
  }

  async function onMoveScreenClick(
    e: React.MouseEvent<HTMLButtonElement>,
    screenId: string,
    direction: "up" | "down",
  ) {
    e.stopPropagation();
    const selectedId = liveScreens[safeIndex]?.id ?? null;
    await runStoryboardMutation(
      () => moveScreen(screenId, lessonId, moduleId, direction, new FormData()),
      selectedId,
      "Could not move screen.",
    );
  }

  async function onDeleteScreenClick(
    e: React.MouseEvent<HTMLButtonElement>,
    screenId: string,
    label: string,
    shouldJumpToOpening: boolean,
    promptTitle = "Delete this storyboard item?",
  ) {
    e.stopPropagation();
    const shouldDelete = window.confirm(`${promptTitle}\n\n${label}`);
    if (!shouldDelete) return;
    if (shouldJumpToOpening && typeof window !== "undefined") {
      window.sessionStorage.setItem(jumpOpeningKey, "1");
    }
    const selectedId = liveScreens[safeIndex]?.id ?? null;
    await runStoryboardMutation(
      () => deleteScreen(screenId, lessonId, moduleId, new FormData()),
      selectedId,
      "Could not delete screen.",
    );
  }

  async function onDuplicateScreenClick(
    e: React.MouseEvent<HTMLButtonElement>,
    screenId: string,
  ) {
    e.stopPropagation();
    const selectedId = liveScreens[safeIndex]?.id ?? null;
    await runStoryboardMutation(
      () => duplicateScreen(screenId, lessonId, moduleId, new FormData()),
      selectedId,
      "Could not duplicate screen.",
    );
  }

  async function onAddTemplateClick(kind: AddScreenKind) {
    const selectedId = liveScreens[safeIndex]?.id ?? null;
    await runStoryboardMutation(
      () => addScreenTemplate(lessonId, moduleId, kind, new FormData()),
      selectedId,
      "Could not add activity.",
    );
  }

  async function onCreateQuizGroupClick() {
    const fd = new FormData();
    const selectedId = liveScreens[safeIndex]?.id ?? null;
    await runStoryboardMutation(
      () => createQuizGroup(lessonId, moduleId, fd),
      selectedId,
      "Could not create quiz.",
    );
  }

  const selectedScreen = liveScreens[safeIndex];

  const openingScreen = useMemo(
    () => findOpeningStartScreen(liveScreens),
    [liveScreens],
  );
  const congratsScreen = useMemo(
    () => findCongratsEndScreen(liveScreens),
    [liveScreens],
  );
  const bookendEditorMode = Boolean(
    openingScreen &&
      congratsScreen &&
      selectedScreen &&
      (selectedScreen.id === openingScreen.id || selectedScreen.id === congratsScreen.id),
  );

  const saveVisibleScreenEditors = useCallback(async () => {
    if (bookendEditorMode) {
      const openingOk = (await bookendOpeningRef.current?.saveNow()) ?? true;
      const congratsOk = (await bookendCongratsRef.current?.saveNow()) ?? true;
      return openingOk && congratsOk;
    } else {
      return (await screenEditorRef.current?.saveNow()) ?? true;
    }
    return true;
  }, [bookendEditorMode]);

  const pendingSnapshotsForVisibleEditors = useCallback((): ScreenPendingSaveSnapshot[] => {
    if (bookendEditorMode) {
      return [bookendOpeningRef.current, bookendCongratsRef.current]
        .map((r) => r?.getPendingSaveSnapshot())
        .filter((v): v is ScreenPendingSaveSnapshot => v != null);
    }
    const one = screenEditorRef.current?.getPendingSaveSnapshot();
    return one ? [one] : [];
  }, [bookendEditorMode]);

  const sendPendingSnapshotsWithBeacon = useCallback(() => {
    if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return;
    const snapshots = pendingSnapshotsForVisibleEditors();
    for (const snap of snapshots) {
      const fd = new FormData();
      fd.set("lesson_id", snap.lessonId);
      fd.set("module_id", snap.moduleId);
      fd.set("screen_type", snap.screenType);
      fd.set("payload_json", snap.payloadJson);
      navigator.sendBeacon(`/api/teacher/screens/${snap.screenId}/save`, fd);
    }
  }, [pendingSnapshotsForVisibleEditors]);

  useEffect(() => {
    queueMicrotask(() => {
      setAdvancedJsonOpen(false);
    });
  }, [selectedScreen?.id]);

  const quizGroupId = quizSelection?.groupId ?? null;
  useEffect(() => {
    if (quizGroupId == null) return;
    queueMicrotask(() => {
      setScreenEditorStatus({ isSaving: false, isDirty: false, lastSavedAt: null, err: null });
    });
  }, [quizGroupId]);

  useEffect(() => {
    if (!setSaveState) return;
    if (screenEditorStatus.err) {
      setSaveState({
        status: "error",
        lastSavedAt: screenEditorStatus.lastSavedAt,
        error: screenEditorStatus.err,
      });
      return;
    }
    if (screenEditorStatus.isSaving) {
      setSaveState({
        status: "saving",
        lastSavedAt: screenEditorStatus.lastSavedAt,
        error: null,
      });
      return;
    }
    if (screenEditorStatus.isDirty) {
      setSaveState({
        status: "editing",
        lastSavedAt: screenEditorStatus.lastSavedAt,
        error: null,
      });
      return;
    }
    setSaveState({
      status: "saved",
      lastSavedAt: screenEditorStatus.lastSavedAt,
      error: null,
    });
  }, [screenEditorStatus, setSaveState]);

  useEffect(
    () => () => {
      setSaveState(null);
    },
    [setSaveState],
  );

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const onPointerMove = () => {
      lastUserActivityAtRef.current = Date.now();
    };
    shell.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => shell.removeEventListener("pointermove", onPointerMove);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      sendPendingSnapshotsWithBeacon();
    };
    const onPageHide = () => {
      sendPendingSnapshotsWithBeacon();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [sendPendingSnapshotsWithBeacon]);

  const leftSidebarScroll = "space-y-4 xl:overscroll-contain";
  const rightSidebarScroll = "space-y-4 xl:overscroll-contain xl:pr-1";

  const beginResize = useCallback(
    (pane: "left" | "right", e: React.PointerEvent) => {
      if (window.innerWidth < 1280) return;
      setResizing({
        pane,
        startX: e.clientX,
        startLeft: leftPanePct,
        startRight: rightPanePct,
      });
      e.preventDefault();
    },
    [leftPanePct, rightPanePct],
  );

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: PointerEvent) => {
      const w = shellRef.current?.getBoundingClientRect().width ?? 0;
      if (w <= 0) return;
      const dPct = ((e.clientX - resizing.startX) / w) * 100;
      if (resizing.pane === "left") {
        const maxLeft = 100 - resizing.startRight - 34;
        setLeftPanePct(clamp(resizing.startLeft + dPct, 14, maxLeft));
      } else if (resizing.pane === "right") {
        const maxRight = 100 - resizing.startLeft - 34;
        setRightPanePct(clamp(resizing.startRight - dPct, 16, maxRight));
      }
    };
    const onUp = () => setResizing(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [resizing]);

  const beginBookendSplitResize = useCallback(
    (e: React.PointerEvent) => {
      if (typeof window !== "undefined" && window.innerWidth < 1024) return;
      setResizingBookendSplit({ startX: e.clientX, startPct: bookendSplitPct });
      e.preventDefault();
    },
    [bookendSplitPct],
  );

  useEffect(() => {
    if (!resizingBookendSplit) return;
    const onMove = (e: PointerEvent) => {
      const el = bookendSplitRef.current;
      if (!el) return;
      const w = el.getBoundingClientRect().width;
      if (w <= 0) return;
      const dPct = ((e.clientX - resizingBookendSplit.startX) / w) * 100;
      setBookendSplitPct(clamp(resizingBookendSplit.startPct + dPct, 28, 72));
    };
    const onUp = () => setResizingBookendSplit(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [resizingBookendSplit]);

  const focusNote = useCallback((id: string) => {
    noteZRef.current += 1;
    const nextZ = noteZRef.current;
    setActivityNotes((prev) => {
      const cur = prev[id];
      if (!cur || cur.z === nextZ) return prev;
      return { ...prev, [id]: { ...cur, z: nextZ } };
    });
  }, []);

  const computeConnectorLines = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const hasOpenNotes = liveScreens.some((s) => activityNotes[s.id]?.open);
    if (!hasOpenNotes) {
      if (connectorLinesRef.current.length === 0) return;
      connectorLinesRef.current = [];
      queueMicrotask(() => {
        setConnectorLines([]);
      });
      return;
    }
    const shellRect = shell.getBoundingClientRect();
    const shellW = shellRect.width;
    const shellH = shellRect.height;
    const next: ConnectorLine[] = [];
    for (const s of liveScreens) {
      const note = activityNotes[s.id];
      if (!note?.open) continue;
      const rowEl = rowRefs.current[s.id];
      const noteEl = noteRefs.current[s.id];
      if (!rowEl || !noteEl) continue;
      const rowRect = rowEl.getBoundingClientRect();
      const noteRect = noteEl.getBoundingClientRect();
      const rowCenterY = clamp(
        rowRect.top + rowRect.height / 2 - shellRect.top,
        0,
        shellH,
      );
      const noteCenterY = clamp(
        noteRect.top + noteRect.height / 2 - shellRect.top,
        0,
        shellH,
      );
      const noteLeft = clamp(noteRect.left - shellRect.left, 0, shellW);
      const noteRight = clamp(noteRect.right - shellRect.left, 0, shellW);
      const rowRight = clamp(rowRect.right - shellRect.left, 0, shellW);
      const rowLeft = clamp(rowRect.left - shellRect.left, 0, shellW);
      const noteOnRight = noteLeft >= rowRight;
      const noteOnLeft = noteRight <= rowLeft;
      next.push({
        id: s.id,
        x1: stabilizeCoord(clamp(noteOnLeft ? rowLeft : rowRight, 0, shellW)),
        y1: stabilizeCoord(rowCenterY),
        x2: stabilizeCoord(
          clamp(
            noteOnRight ? noteLeft
            : noteOnLeft ? noteRight
            : noteLeft,
            0,
            shellW,
          ),
        ),
        y2: stabilizeCoord(noteCenterY),
      });
    }
    if (areConnectorLinesEqual(connectorLinesRef.current, next)) return;
    connectorLinesRef.current = next;
    queueMicrotask(() => {
      setConnectorLines(next);
    });
  }, [activityNotes, liveScreens]);

  useLayoutEffect(() => {
    computeConnectorLines();
  }, [
    computeConnectorLines,
    leftPanePct,
    rightPanePct,
    storyboardOpen,
    storyboardPinned,
    planOpen,
    planPinned,
    toolsOpen,
    toolsPinned,
  ]);

  useEffect(() => {
    let raf = 0;
    const scheduleConnectorSync = () => {
      if (raf !== 0) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        computeConnectorLines();
      });
    };
    window.addEventListener("resize", scheduleConnectorSync);
    window.addEventListener("scroll", scheduleConnectorSync, true);
    return () => {
      if (raf !== 0) cancelAnimationFrame(raf);
      window.removeEventListener("resize", scheduleConnectorSync);
      window.removeEventListener("scroll", scheduleConnectorSync, true);
    };
  }, [computeConnectorLines]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setStoryboardOpen(false);
      setPlanOpen(false);
      setToolsOpen(false);
      setPreviewOverlayOpen(false);
      setEditorHelpOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragNoteRef.current;
      const shell = shellRef.current;
      if (!drag || !shell) return;
      const shellRect = shell.getBoundingClientRect();
      const nextX = clamp(e.clientX - shellRect.left - drag.offsetX, 8, shellRect.width - 220);
      const nextY = clamp(e.clientY - shellRect.top - drag.offsetY, 8, shellRect.height - 56);
      setActivityNotes((prev) => {
        const cur = prev[drag.id];
        if (!cur) return prev;
        return { ...prev, [drag.id]: { ...cur, x: nextX, y: nextY } };
      });
    };
    const onUp = () => {
      if (prevUserSelectRef.current !== null) {
        document.body.style.userSelect = prevUserSelectRef.current;
        prevUserSelectRef.current = null;
      }
      dragNoteRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  function storyboardRowForSegment(seg: (typeof storySegments)[number]) {
    if (seg.type === "single") {
      const i = seg.screenIndex;
      const s = liveScreens[i];
      if (!s) return null;
      const thumb = screenThumbnailUrl(s);
      const active = i === safeIndex;
      const pinnedBookend =
        isOpeningStartScreen(s.screen_type, s.payload) ||
        isCongratsEndScreen(s.screen_type, s.payload);
      return (
        <li key={s.id}>
          <div
            ref={(el) => {
              rowRefs.current[s.id] = el;
            }}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, s.id)}
            onClick={() => navigateFromStoryboard(i)}
            className={`rounded border p-1.5 transition-opacity ${
              draggingId === s.id ? "opacity-60" : ""
            } ${active ? "border-sky-600 bg-sky-50" : "border-neutral-200 bg-white"}`}
          >
            <div className="flex items-start gap-1">
              <span
                draggable={!pinnedBookend}
                onDragStart={
                  pinnedBookend ? undefined : (e) => onDragStart(e, s.id)
                }
                onDragEnd={() => setDraggingId(null)}
                className={
                  pinnedBookend ?
                    "select-none px-0.5 pt-0.5 font-mono text-[11px] text-neutral-300"
                  : "cursor-grab select-none px-0.5 pt-0.5 font-mono text-[11px] text-neutral-400 active:cursor-grabbing"
                }
                title={pinnedBookend ? "Opening and closing screens stay fixed" : "Drag to reorder"}
                role="button"
                tabIndex={0}
                aria-label={
                  pinnedBookend ? `Screen ${i} (fixed position)` : `Drag to reorder screen ${i}`
                }
              >
                ⋮⋮
              </span>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => navigateFromStoryboard(i)}
                  className="flex w-full min-w-0 items-start gap-1 rounded-md px-0.5 py-0.5 text-left hover:bg-neutral-50 active:bg-neutral-100"
                >
                  <span className="w-4 shrink-0 font-mono text-[11px] text-neutral-500">{i}</span>
                  <span className="line-clamp-2 min-w-0 flex-1 text-[11px] leading-snug sm:text-xs">
                    {screenOutlineLabel(s, liveScreens)}
                  </span>
                </button>
                <div className="mt-0.5 flex flex-wrap items-center gap-1 pt-0.5">
                  <button
                    type="button"
                    disabled={pinnedBookend || storyboardBusy}
                    onClick={(e) => void onMoveScreenClick(e, s.id, "up")}
                    className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={pinnedBookend || storyboardBusy}
                    onClick={(e) => void onMoveScreenClick(e, s.id, "down")}
                    className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    disabled={pinnedBookend || storyboardBusy}
                    onClick={(e) => void onDuplicateScreenClick(e, s.id)}
                    className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 active:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Dup
                  </button>
                  <button
                    type="button"
                    disabled={pinnedBookend || storyboardBusy}
                    onClick={(e) =>
                      void onDeleteScreenClick(
                        e,
                        s.id,
                        screenOutlineLabel(s, liveScreens),
                        i === safeIndex,
                      )
                    }
                    className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-100 active:bg-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Del
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const shellRect = shellRef.current?.getBoundingClientRect();
                      const rowRect = rowRefs.current[s.id]?.getBoundingClientRect();
                      const defaultX =
                        shellRect && rowRect ?
                          clamp(rowRect.right - shellRect.left + 18, 8, shellRect.width - 220)
                        : 260;
                      const defaultY =
                        shellRect && rowRect ?
                          clamp(rowRect.top - shellRect.top, 8, shellRect.height - 56)
                        : 120;
                      noteZRef.current += 1;
                      const nextZ = noteZRef.current;
                      setActivityNotes((prev) => {
                        const cur = prev[s.id];
                        return {
                          ...prev,
                          [s.id]: {
                            text: cur?.text ?? "",
                            open: !(cur?.open ?? false),
                            collapsed: cur?.collapsed ?? false,
                            x: cur?.x ?? defaultX,
                            y: cur?.y ?? defaultY,
                            z: nextZ,
                          },
                        };
                      });
                    }}
                    className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-100 active:bg-violet-200"
                  >
                    Notes
                  </button>
                </div>
              </div>
              {thumb ? (
                <div className="relative ml-1 h-14 w-16 shrink-0 self-stretch overflow-hidden rounded border border-neutral-300">
                  <Image
                    src={thumb}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized={thumb.includes("placehold.co")}
                  />
                </div>
              ) : (
                <div className="ml-1 flex h-14 w-16 shrink-0 self-stretch items-center justify-center rounded border border-dashed border-neutral-300 text-[10px] text-neutral-400">
                  —
                </div>
              )}
            </div>
          </div>
        </li>
      );
    }

    const firstIdx = seg.screenIndices[0] ?? 0;
    const s = liveScreens[firstIdx];
    if (!s) return null;
    const thumb = screenThumbnailUrl(s);
    const quizActive = seg.screenIndices.includes(safeIndex);
    const n = seg.screenIndices.length;
    return (
      <li key={`quiz-${seg.groupId}-${firstIdx}`}>
        <div
          ref={(el) => {
            rowRefs.current[s.id] = el;
          }}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, s.id)}
          onClick={() => navigateFromStoryboard(firstIdx)}
          className={`rounded border border-dashed border-sky-300 p-1.5 ${
            quizActive ? "border-sky-600 bg-sky-50" : "border-sky-200 bg-white"
          }`}
        >
          <div className="flex items-start gap-1">
            <span
              className="select-none px-0.5 pt-0.5 font-mono text-[11px] text-neutral-300"
              title="Quiz groups reorder as a block when you move the first question (Up/Down)."
            >
              ⎗
            </span>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => navigateFromStoryboard(firstIdx)}
                className="flex w-full min-w-0 items-start gap-1 rounded-md px-0.5 py-0.5 text-left hover:bg-sky-50/80 active:bg-sky-100/80"
              >
                <span className="w-4 shrink-0 font-mono text-[11px] text-sky-700">{firstIdx}</span>
                <span className="line-clamp-2 min-w-0 flex-1 text-[11px] font-semibold leading-snug text-sky-950 sm:text-xs">
                  {seg.title ?? "Quiz"} ({n} questions)
                </span>
              </button>
              <div className="mt-0.5 flex flex-wrap items-center gap-1 pt-0.5">
                <button
                  type="button"
                  disabled={storyboardBusy}
                  onClick={(e) => void onMoveScreenClick(e, s.id, "up")}
                  className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Up
                </button>
                <button
                  type="button"
                  disabled={storyboardBusy}
                  onClick={(e) => void onMoveScreenClick(e, s.id, "down")}
                  className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Down
                </button>
                <button
                  type="button"
                  disabled={storyboardBusy}
                  onClick={(e) =>
                    void onDeleteScreenClick(
                      e,
                      s.id,
                      screenOutlineLabel(s, liveScreens),
                      seg.screenIndices.includes(safeIndex),
                      "Delete first question in this quiz (from the lesson)?",
                    )
                  }
                  className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-100 active:bg-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Del
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const shellRect = shellRef.current?.getBoundingClientRect();
                    const rowRect = rowRefs.current[s.id]?.getBoundingClientRect();
                    const defaultX =
                      shellRect && rowRect ?
                        clamp(rowRect.right - shellRect.left + 18, 8, shellRect.width - 220)
                      : 260;
                    const defaultY =
                      shellRect && rowRect ?
                        clamp(rowRect.top - shellRect.top, 8, shellRect.height - 56)
                      : 120;
                    noteZRef.current += 1;
                    const nextZ = noteZRef.current;
                    setActivityNotes((prev) => {
                      const cur = prev[s.id];
                      return {
                        ...prev,
                        [s.id]: {
                          text: cur?.text ?? "",
                          open: !(cur?.open ?? false),
                          collapsed: cur?.collapsed ?? false,
                          x: cur?.x ?? defaultX,
                          y: cur?.y ?? defaultY,
                          z: nextZ,
                        },
                      };
                    });
                  }}
                  className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-100 active:bg-violet-200"
                >
                  Notes
                </button>
              </div>
            </div>
            {thumb ? (
              <div className="relative ml-1 h-14 w-16 shrink-0 self-stretch overflow-hidden rounded border border-neutral-300">
                <Image
                  src={thumb}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized={thumb.includes("placehold.co")}
                />
              </div>
            ) : (
              <div className="ml-1 flex h-14 w-16 shrink-0 self-stretch items-center justify-center rounded border border-dashed border-neutral-300 text-[10px] text-neutral-400">
                —
              </div>
            )}
          </div>
        </div>
      </li>
    );
  }

  async function savePlanDoc() {
    if (planLoadState !== "ready") return;
    setPlanBusy(true);
    setPlanMsg("");
    try {
      const fd = new FormData();
      fd.set("lesson_plan", planText);
      await saveLessonPlan(lessonId, moduleId, fd);
      setPlanMsg("Plan saved.");
      router.refresh();
    } catch (e) {
      setPlanMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setPlanBusy(false);
    }
  }

  async function draftPlanWithAi() {
    if (planLoadState !== "ready") return;
    setPlanBusy(true);
    setPlanMsg("");
    const goals = learningGoals.map((g) => g.trim()).filter(Boolean);
    if (goals.length === 0) {
      setPlanMsg("Add and save at least one learning objective first (in the Plan panel).");
      setPlanBusy(false);
      return;
    }
    if (!planText.trim() && !planPremise.trim()) {
      setPlanMsg("Add a story premise/seed for a fresh draft, or write something in the plan first to enhance it.");
      setPlanBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/teacher/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lessonId,
          cefrBand: planCefr,
          premise: planPremise.trim(),
          vocabulary: planVocab.trim(),
          existingLessonPlan: planText.trim(),
        }),
      });
      const data = (await res.json()) as { lessonPlan?: string; error?: string };
      if (!res.ok) {
        setPlanMsg(data.error ?? "Draft failed");
        return;
      }
      if (typeof data.lessonPlan === "string") {
        setPlanText(data.lessonPlan);
      }
      setPlanMsg("Draft saved to this lesson. Review and edit, then save or generate.");
      router.refresh();
    } catch (e) {
      setPlanMsg(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setPlanBusy(false);
    }
  }

  async function generateActivitiesFromPlan() {
    if (planLoadState !== "ready") return;
    setPlanBusy(true);
    setPlanMsg("");
    setLastAiGenerationDiagnostics(null);
    const goals = learningGoals.map((g) => g.trim()).filter(Boolean);
    if (goals.length === 0) {
      setPlanMsg("Add and save at least one learning objective first.");
      setPlanBusy(false);
      return;
    }
    if (!planText.trim()) {
      setPlanMsg("Lesson plan is empty — draft with AI or paste a plan.");
      setPlanBusy(false);
      return;
    }
    try {
      const fd = new FormData();
      fd.set("lesson_plan", planText);
      await saveLessonPlan(lessonId, moduleId, fd);
      const res = await fetch("/api/teacher/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lessonId,
          cefrBand: planCefr,
          vocabulary: planVocab.trim(),
          hasOpeningStart,
          premiseLine: planPremise.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        screens?: unknown[];
        generationWarnings?: string[];
        aiGenerationDiagnostics?: AiGenerationDiagnosticsV1;
        error?: string;
      };

      if (!res.ok) {
        setPlanMsg(data.error ?? "Generate failed");
        return;
      }
      if (!Array.isArray(data.screens)) {
        setPlanMsg("Invalid response from server");
        return;
      }
      const flushed = await saveVisibleScreenEditors();
      if (!flushed) {
        setPlanMsg("Could not save latest edits before applying generated screens.");
        return;
      }
      await appendScreensFromAi(
        lessonId,
        moduleId,
        data.screens as { screen_type: string; payload: unknown }[],
      );
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(jumpNewestKey, "1");
      }
      const diag = data.aiGenerationDiagnostics ?? null;
      setLastAiGenerationDiagnostics(diag);
      const warn = data.generationWarnings?.filter(Boolean) ?? [];
      const diagSummary =
        diag ?
          ` Model rows: ${diag.modelScreensArrayLength} → validated: ${diag.validatedScreenCount} → saved: ${diag.returnedScreenCount}${
            diag.openingStartScreensStripped ?
              ` (${diag.openingStartScreensStripped} opening start(s) removed)`
            : ""
          }.`
        : "";
      const failedN = diag ? (diag.failedScreenCount ?? diag.failedScreens?.length ?? 0) : 0;
      const warnHint =
        diag && (diag.parseWarningCount > 0 || failedN > 0) ?
          ` ${diag.parseWarningCount} parser warning(s)${
            failedN > 0 ? `; ${failedN} invalid model row(s) shown as drafts below (not saved)` : ""
          } — see Generation diagnostics.`
        : warn.length > 0 ?
          ` Some model screens were skipped (validation). First issues: ${warn
            .slice(0, 2)
            .map((w) => w.replace(/\s+/g, " ").slice(0, 120))
            .join(" · ")}${warn.length > 2 ? "…" : ""}.`
        : "";
      setPlanMsg(
        `Added ${data.screens.length} screens from the plan.${diagSummary}${warnHint}`,
      );
      router.refresh();
    } catch (e) {
      setPlanMsg(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setPlanBusy(false);
    }
  }

  function renderPlanPanelBody() {
    const planReady = planLoadState === "ready";
    return (
      <>
        {planLoadState === "loading" ?
          <p className="mb-2 text-xs font-medium text-emerald-900">Loading lesson plan…</p>
        : null}
        {planLoadState === "error" && planLoadError ?
          <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-900">
            <p>{planLoadError}</p>
            <button
              type="button"
              onClick={() => setPlanFetchNonce((n) => n + 1)}
              className="mt-2 rounded border border-red-300 bg-white px-2 py-1 font-semibold text-red-900 hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        : null}
        <div className="mb-4">
          <LessonLearningGoalsTable
            key={learningGoals.join("\u0001")}
            lessonId={lessonId}
            moduleId={moduleId}
            initialGoals={learningGoals}
            compact
          />
        </div>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Lesson plan</p>
            <p className="mt-1 text-xs text-emerald-950/90">
              {planPinned ?
                "Pinned beside the editor. Generate activities uses this text plus your saved objectives."
              : "Edit freely, save, or let AI draft. Unpinned: closes when you open a storyboard screen (unless pinned)."}
            </p>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded border border-emerald-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-emerald-900 shadow-sm">
            <input
              type="checkbox"
              className="rounded border-emerald-400"
              checked={planPinned}
              onChange={(e) => setPlanPinned(e.target.checked)}
            />
            Pin open
          </label>
        </div>
        <label className="block text-[11px] font-semibold text-emerald-950">
          Plan document
          <textarea
            value={planText}
            onChange={(e) => setPlanText(e.target.value)}
            rows={14}
            disabled={!planReady}
            className="mt-1 w-full resize-y rounded border border-emerald-200 bg-white px-2 py-1.5 font-mono text-xs text-neutral-900 shadow-inner outline-none ring-emerald-500/30 focus:ring disabled:cursor-not-allowed disabled:bg-neutral-100"
            spellCheck
          />
        </label>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-[11px] font-semibold text-emerald-950">
            CEFR / level
            <select
              value={planCefr}
              onChange={(e) => setPlanCefr(e.target.value)}
              className="mt-1 w-full rounded border border-emerald-200 bg-white px-2 py-1 text-xs"
            >
              {CEFR_LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-semibold text-emerald-950 sm:col-span-2">
            Vocabulary (optional)
            <input
              value={planVocab}
              onChange={(e) => setPlanVocab(e.target.value)}
              className="mt-1 w-full rounded border border-emerald-200 bg-white px-2 py-1 text-xs"
              placeholder="school, teacher, friend"
            />
          </label>
          <label className="text-[11px] font-semibold text-emerald-950 sm:col-span-2">
            Story premise / seed (required for empty plan; optional when enhancing existing text)
            <textarea
              value={planPremise}
              onChange={(e) => setPlanPremise(e.target.value)}
              rows={2}
              className="mt-1 w-full resize-y rounded border border-emerald-200 bg-white px-2 py-1 text-xs"
              placeholder="Two friends meet on the way to school…"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={planBusy || !planReady}
            onClick={() => void savePlanDoc()}
            className="rounded bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
          >
            Save plan
          </button>
          <button
            type="button"
            disabled={planBusy || !planReady}
            onClick={() => void draftPlanWithAi()}
            className="rounded border border-emerald-700 bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-200 disabled:opacity-50"
          >
            Draft plan with AI
          </button>
          <button
            type="button"
            disabled={planBusy || !planReady}
            onClick={() => void generateActivitiesFromPlan()}
            className="rounded bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
          >
            Generate activities
          </button>
        </div>
        {planMsg ? (
          <p className="mt-2 text-xs text-emerald-950" role="status">
            {planMsg}
          </p>
        ) : null}
        {lastAiGenerationDiagnostics ?
          <div
            className="mt-2 rounded border border-amber-200 bg-amber-50/90 p-2 text-left text-emerald-950 shadow-sm"
            role="region"
            aria-label="Generation diagnostics"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
              Generation diagnostics
            </p>
            <ul className="mt-1 list-inside list-disc text-[11px] text-emerald-950/95">
              <li>
                Model JSON screen rows:{" "}
                {lastAiGenerationDiagnostics.modelScreensArrayLength}
              </li>
              <li>
                Passed validation: {lastAiGenerationDiagnostics.validatedScreenCount}
              </li>
              <li>
                Saved to lesson: {lastAiGenerationDiagnostics.returnedScreenCount}
              </li>
              <li>
                Opening starts removed:{" "}
                {lastAiGenerationDiagnostics.openingStartScreensStripped}
              </li>
              <li>
                Parser warnings: {lastAiGenerationDiagnostics.parseWarningCount}
              </li>
              <li>
                Failed drafts (not saved):{" "}
                {lastAiGenerationDiagnostics.failedScreenCount ??
                  lastAiGenerationDiagnostics.failedScreens?.length ??
                  0}
              </li>
            </ul>
            {lastAiGenerationDiagnostics.parseWarnings.length > 0 ?
              <ol className="mt-2 max-h-40 list-decimal overflow-y-auto pl-5 text-[10px] leading-snug text-emerald-950">
                {lastAiGenerationDiagnostics.parseWarnings.map((w, i) => (
                  <li key={`${i}-${w.slice(0, 24)}`} className="break-words font-mono">
                    {w}
                  </li>
                ))}
              </ol>
            : null}
            {(lastAiGenerationDiagnostics.failedScreens?.length ?? 0) > 0 ?
              <div className="mt-2 space-y-2" role="list">
                <p className="text-[10px] font-semibold text-amber-950">
                  Invalid model rows (drafts — not added to the lesson)
                </p>
                {(lastAiGenerationDiagnostics.failedScreens ?? []).map((f, idx) => (
                  <details
                    key={`ai-fail-${f.modelIndex}-${idx}`}
                    className="rounded border border-amber-200 bg-white/90 text-left shadow-sm"
                    role="listitem"
                  >
                    <summary className="cursor-pointer select-none px-2 py-1.5 text-[10px] font-semibold text-emerald-950 hover:bg-amber-50/80">
                      Row {f.modelIndex} · {f.screen_type}
                      {f.storyFirstContext ?
                        ` · materialization step ${f.storyFirstContext.stepIndex} (${f.storyFirstContext.stepKind}${
                          f.storyFirstContext.expectedSubtype ?
                            ` / expect ${f.storyFirstContext.expectedSubtype}`
                          : ""
                        })`
                      : ""}
                    </summary>
                    <div className="space-y-1.5 border-t border-amber-100 px-2 py-2 text-[10px] text-emerald-950">
                      <p className="break-words leading-snug">{f.summary}</p>
                      {f.storyFirstContext?.beatId ?
                        <p className="text-[9px] text-emerald-800/90">
                          Beat: <span className="font-mono">{f.storyFirstContext.beatId}</span>
                        </p>
                      : null}
                      {f.issues.length > 0 ?
                        <ul className="max-h-28 list-inside list-disc overflow-y-auto pl-0.5 font-mono text-[9px] leading-snug text-red-900/95">
                          {f.issues.map((iss, i) => (
                            <li key={`${i}-${iss.path}-${iss.message.slice(0, 24)}`}>
                              {iss.path}: {iss.message}
                              {iss.code ? ` (${iss.code})` : ""}
                            </li>
                          ))}
                        </ul>
                      : null}
                      <pre className="max-h-40 overflow-auto rounded bg-neutral-900/95 p-2 text-[9px] leading-snug text-neutral-100">
                        {JSON.stringify(f.payload, null, 2)}
                      </pre>
                      <button
                        type="button"
                        className="rounded border border-amber-300 bg-white px-2 py-0.5 text-[9px] font-semibold text-amber-950 hover:bg-amber-50"
                        onClick={() => {
                          void navigator.clipboard.writeText(JSON.stringify(f, null, 2));
                        }}
                      >
                        Copy this draft JSON
                      </button>
                    </div>
                  </details>
                ))}
              </div>
            : null}
            <button
              type="button"
              className="mt-2 rounded border border-amber-300 bg-white px-2 py-1 text-[10px] font-semibold text-amber-950 hover:bg-amber-100"
              onClick={() => {
                void navigator.clipboard.writeText(
                  JSON.stringify(lastAiGenerationDiagnostics, null, 2),
                );
              }}
            >
              Copy diagnostics JSON
            </button>
          </div>
        : null}
        <p className="mt-3 text-[10px] leading-snug text-emerald-900/80">
          Server needs <code className="rounded bg-white/80 px-1">GEMINI_API_KEY</code>. Generating
          activities re-reads your plan text so edits stay authoritative.
        </p>
      </>
    );
  }

  function renderStoryboardMenuBody() {
    return (
      <>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Storyboard
            </h2>
            <p className="mt-1 text-xs text-neutral-600">
              {storyboardPinned ?
                "Pinned: stays open beside the editor. Drag to reorder; quiz groups are one tile."
              : "Tap a screen to open it — this menu closes. Pin to keep it open as a column."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={storyboardBusy}
                onClick={() => void onAddTemplateClick("interactive_page")}
                className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-xs font-semibold shadow-sm hover:bg-neutral-50 active:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
              >
                Interactive Story
              </button>
              <button
                type="button"
                disabled={storyboardBusy}
                onClick={() => void onCreateQuizGroupClick()}
                className="rounded border border-sky-300 bg-sky-50 px-2 py-1.5 text-xs font-semibold text-sky-900 shadow-sm hover:bg-sky-100 active:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
              >
                Quiz
              </button>
            </div>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded border border-neutral-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-neutral-700 shadow-sm">
            <input
              type="checkbox"
              className="rounded border-neutral-400"
              checked={storyboardPinned}
              onChange={(e) => setStoryboardPinned(e.target.checked)}
            />
            Pin open
          </label>
        </div>
        <ol className="mt-3 space-y-2">
          {storySegments.map((seg) => storyboardRowForSegment(seg))}
        </ol>
        {liveScreens.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">No screens yet.</p>
        ) : null}
      </>
    );
  }

  function renderToolsPanelBody() {
    return (
      <>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Lesson tools</p>
            <p className="mt-1 text-xs text-neutral-600">
              {toolsPinned ?
                "Pinned: stays open beside the editor. Import, checklist, and links stay here."
              : "Pin to dock this panel. Unpinned: closes when you pick a storyboard screen or tap outside."}
            </p>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded border border-neutral-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-neutral-700 shadow-sm">
            <input
              type="checkbox"
              className="rounded border-neutral-400"
              checked={toolsPinned}
              onChange={(e) => setToolsPinned(e.target.checked)}
            />
            Pin open
          </label>
        </div>
        {children}
        <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Publish checklist</h2>
          <ul className="mt-2 list-inside list-disc text-xs">
            {checklist.map((c, i) => (
              <li key={i} className={c.ok ? "text-green-800" : "text-amber-900"}>
                {c.ok ? "✓" : "○"} {c.label}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void copyStudentLink()}
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-neutral-50 active:bg-neutral-200 sm:text-sm"
            >
              Copy student link
            </button>
            <button
              type="button"
              onClick={exportJson}
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-neutral-50 active:bg-neutral-200 sm:text-sm"
            >
              Export screens JSON
            </button>
            <form action={duplicateLesson.bind(null, lessonId, moduleId)}>
              <button
                type="submit"
                className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-neutral-50 active:bg-neutral-200 sm:text-sm"
              >
                Duplicate lesson
              </button>
            </form>
          </div>
          {copyMsg ? <p className="mt-2 text-xs text-green-800">{copyMsg}</p> : null}
          <p className="mt-2 text-[11px] leading-snug text-neutral-500">
            Student URL (when published):{" "}
            <code className="break-all rounded bg-neutral-100 px-1">{studentPath}</code>
          </p>
          <p className="mt-2 text-[11px] leading-snug text-neutral-500">
            Images: Upload or Media library per screen (shared bucket), or paste an HTTPS URL.
          </p>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-neutral-900">Import screens</h2>
          <p className="mt-1 text-xs text-neutral-600">
            JSON: {"{"} &quot;screens&quot;: [ {"{"} &quot;screen_type&quot;, &quot;payload&quot; {"}"}… ],
            optional &quot;learning_goals&quot;: [&quot;…&quot;] {"}"}. Paste only the raw object (no{" "}
            <code className="rounded bg-neutral-100 px-0.5">```json</code> wrappers).
          </p>
          <p className="mt-1 text-[11px] leading-snug text-neutral-600">
            Optional{" "}
            <code className="rounded bg-neutral-100 px-0.5">media_bindings</code>: map{" "}
            <code className="rounded bg-neutral-100 px-0.5">media_assets</code> UUIDs to URLs before
            save. Keys are screen indices{" "}
            <code className="rounded bg-neutral-100 px-0.5">&quot;0&quot;</code>,{" "}
            <code className="rounded bg-neutral-100 px-0.5">&quot;1&quot;</code>… matching{" "}
            <code className="rounded bg-neutral-100 px-0.5">screens[]</code>. Per screen:{" "}
            <code className="rounded bg-neutral-100 px-0.5">root.image_url</code> (start / story /
            interaction), story <code className="rounded bg-neutral-100 px-0.5">pages[pageId]</code>{" "}
            backgrounds, story <code className="rounded bg-neutral-100 px-0.5">items[itemId]</code>{" "}
            for image props and characters.
          </p>
          <form
            className="mt-3 space-y-2"
            action={importLessonScreensJson.bind(null, lessonId, moduleId)}
          >
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="replace_existing" />
              Replace all existing screens
            </label>
            <textarea
              name="import_json"
              rows={14}
              className="w-full rounded border font-mono text-[11px] leading-snug"
              placeholder='{"screens":[...]}'
              spellCheck={false}
            />
            <button
              type="submit"
              className="w-full rounded bg-neutral-900 px-3 py-2 text-xs font-semibold text-white active:bg-neutral-950 sm:text-sm"
            >
              Import
            </button>
          </form>
        </section>
      </>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col space-y-0">
      {lessonMenuOverlay}
      {editorHelpOpen ? (
        <div className="max-h-[min(45vh,22rem)] shrink-0 overflow-y-auto overscroll-contain rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-bold text-neutral-900">Lesson &amp; screen actions</h3>
            <button
              type="button"
              className="shrink-0 rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              onClick={() => setEditorHelpOpen(false)}
              aria-label="Close help"
            >
              Close
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-neutral-600">
            {quizSelection ?
              "Quiz builder: add questions from the bank, then edit the selected card. Save and advanced JSON for the active question stay on the card. Use Preview in the toolbar when not in a quiz strip."
            : "Auto-save runs after 5s of inactivity and also flushes when the tab is hidden or closed. Use Preview for a floating student view."}
          </p>

          <div className="mt-4 space-y-3 border-t border-neutral-200 pt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Lesson</p>
            {isActivityLibraryMirror ? (
              <div className="space-y-3 rounded border border-sky-200 bg-sky-50/80 p-3">
                <p className="text-xs font-semibold text-sky-950">Activity library</p>
                <p className="text-[11px] text-sky-900">
                  This draft lesson edits questions for an activity set. It is not published on the course
                  catalog. Use the buttons below to show or hide the activity on the student Activity library
                  ({activityLibraryPublished ? "currently published" : "currently draft"}).
                </p>
                <div className="flex flex-wrap gap-2">
                  <form action={publishActivityLibraryFromLesson}>
                    <input type="hidden" name="lesson_id" value={lessonId} />
                    <input type="hidden" name="module_id" value={moduleId} />
                    <button
                      type="submit"
                      disabled={publishBlocked}
                      title={publishBlocked ? publishBlockingReasons.join(" ") : undefined}
                      className={
                        publishBlocked ?
                          "cursor-not-allowed rounded border border-neutral-300 bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-500"
                        : "rounded border border-emerald-400 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-100 active:bg-emerald-200"
                      }
                    >
                      Publish to activity library
                    </button>
                  </form>
                  <form action={unpublishActivityLibraryFromLesson}>
                    <input type="hidden" name="lesson_id" value={lessonId} />
                    <input type="hidden" name="module_id" value={moduleId} />
                    <button
                      type="submit"
                      className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100 active:bg-amber-200"
                    >
                      Unpublish from activity library
                    </button>
                  </form>
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {isActivityLibraryMirror ? (
                <p className="text-[11px] text-neutral-600">
                  <strong>Course catalog:</strong> this mirror lesson stays off /learn. There is no separate
                  &quot;Publish lesson&quot; for it.
                </p>
              ) : (
                <form action={saveLesson}>
                  <input type="hidden" name="id" value={lessonId} />
                  <input type="hidden" name="module_id" value={moduleId} />
                  <input type="hidden" name="title" value={lessonTitle} />
                  <input type="hidden" name="slug" value={lessonSlug} />
                  <input type="hidden" name="order_index" value={String(lessonOrderIndex)} />
                  <input
                    type="hidden"
                    name="estimated_minutes"
                    value={
                      lessonEstimatedMinutes === null || lessonEstimatedMinutes === undefined ?
                        ""
                      : String(lessonEstimatedMinutes)
                    }
                  />
                  <input type="hidden" name="published" value={published ? "" : "on"} />
                  <button
                    type="submit"
                    disabled={!published && publishBlocked}
                    title={
                      !published && publishBlocked ?
                        publishBlockingReasons.join(" ")
                      : undefined
                    }
                    className={
                      published ?
                        "rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 active:bg-amber-200"
                      : publishBlocked ?
                        "cursor-not-allowed rounded border border-neutral-300 bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-500"
                      : "rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 active:bg-emerald-200"
                    }
                  >
                    {published ? "Unpublish lesson" : "Publish lesson"}
                  </button>
                </form>
              )}
              <form action={deleteLesson.bind(null, lessonId, moduleId)}>
                <ConfirmSubmitButton
                  type="submit"
                  confirmMessage={`Delete lesson "${lessonTitle}"? This cannot be undone.`}
                  className="rounded border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 active:bg-red-200"
                >
                  Delete lesson
                </ConfirmSubmitButton>
              </form>
            </div>
          </div>

          <div className="mt-4 space-y-3 border-t border-neutral-200 pt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Current screen</p>
            {quizSelection ?
              <p className="text-xs text-neutral-600">
                Select a non-quiz screen in the storyboard to use Save, advanced JSON, and story TTS here.
              </p>
            : selectedScreen ?
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 sm:text-sm"
                    onClick={() => setAdvancedJsonOpen((v) => !v)}
                  >
                    {advancedJsonOpen ? "Hide" : "Show"} advanced JSON
                  </button>
                </div>
                {selectedScreen.screen_type === "story" ?
                  <label className="block text-xs font-medium text-neutral-700">
                    TTS language
                    <input
                      className="mt-1 w-full max-w-xs rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm"
                      value={
                        (
                          selectedScreen.payload &&
                          typeof selectedScreen.payload === "object" &&
                          !Array.isArray(selectedScreen.payload) &&
                          "tts_lang" in selectedScreen.payload &&
                          typeof (selectedScreen.payload as { tts_lang?: unknown }).tts_lang ===
                            "string" ?
                            (selectedScreen.payload as { tts_lang: string }).tts_lang
                          : "en-US"
                        )
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        const raw = selectedScreen.payload;
                        const base =
                          raw && typeof raw === "object" && !Array.isArray(raw) ?
                            { ...(raw as Record<string, unknown>) }
                          : {};
                        base.tts_lang = v.trim() || undefined;
                        bumpScreenPayload(selectedScreen.id, base);
                      }}
                    />
                  </label>
                : null}
              </div>
            : <p className="text-xs text-neutral-600">Select a screen in the storyboard.</p>}
          </div>
        </div>
      ) : null}

      {canUseDomPortal && storyboardOpen && !storyboardPinned ?
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[55] bg-black/25"
              aria-label="Close storyboard"
              onClick={() => setStoryboardOpen(false)}
            />
            <aside
              className={
                "fixed top-0 bottom-0 left-0 z-[56] flex min-h-0 flex-col overflow-y-auto overflow-x-hidden overscroll-contain border-r border-neutral-200/90 bg-neutral-100/98 p-4 shadow-2xl backdrop-blur-sm"
              }
              style={{ width: `clamp(220px, ${leftPanePct}%, 520px)` }}
            >
              {renderStoryboardMenuBody()}
            </aside>
          </>,
          document.body,
        )
      : null}
      {canUseDomPortal && planOpen && !planPinned ?
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[59] bg-black/25"
              aria-label="Close lesson plan"
              onClick={() => setPlanOpen(false)}
            />
            <aside
              className={
                "fixed top-6 bottom-6 z-[60] flex min-h-0 w-[min(42rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] flex-col overflow-y-auto overflow-x-hidden overscroll-contain rounded-lg border border-emerald-200/90 bg-emerald-50/98 p-4 shadow-2xl backdrop-blur-sm sm:p-5"
              }
              style={{ left: "50%", transform: "translateX(-50%)" }}
            >
              {renderPlanPanelBody()}
            </aside>
          </>,
          document.body,
        )
      : null}
      {canUseDomPortal && toolsOpen && !toolsPinned ?
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[57] bg-black/25"
              aria-label="Close lesson tools"
              onClick={() => setToolsOpen(false)}
            />
            <aside
              className={
                "fixed top-0 right-0 bottom-0 z-[58] flex min-h-0 flex-col overflow-y-auto overflow-x-hidden overscroll-contain border-l border-neutral-200/90 bg-neutral-50/98 p-4 shadow-2xl backdrop-blur-sm"
              }
              style={{ width: `clamp(260px, ${rightPanePct}%, 560px)` }}
            >
              {renderToolsPanelBody()}
            </aside>
          </>,
          document.body,
        )
      : null}

      <div
        ref={shellRef}
        className={
          "relative flex min-h-0 flex-1 flex-col gap-0 overflow-hidden bg-white " +
          "xl:flex-row xl:items-stretch"
        }
      >
        {storyboardOpen && storyboardPinned ? (
          <aside
            className={
              "order-1 min-h-0 w-full shrink-0 overflow-y-auto border-r border-neutral-200/80 bg-neutral-100/95 p-4 xl:order-none xl:min-w-[220px] xl:self-stretch xl:py-5 " +
              leftSidebarScroll
            }
            style={{ width: `clamp(220px, ${leftPanePct}%, 520px)` }}
          >
            {renderStoryboardMenuBody()}
          </aside>
        ) : null}
        {storyboardOpen && storyboardPinned ? (
          <div className="hidden xl:flex xl:w-2 xl:items-stretch xl:justify-center xl:self-stretch">
            <button
              type="button"
              aria-label="Resize storyboard panel"
              onPointerDown={(e) => beginResize("left", e)}
              className="h-full w-1 cursor-col-resize rounded bg-neutral-200/80 hover:bg-sky-300 active:bg-sky-400"
            />
          </div>
        ) : null}

        <div className="order-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-neutral-200 bg-white p-0 xl:order-none xl:max-w-none xl:self-stretch">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {quizSelection ?
              <QuizBuilder
                lessonId={lessonId}
                moduleId={moduleId}
                moduleSlug={moduleSlug}
                lessonSlug={lessonSlug}
                lessonTitle={lessonTitle}
                quizGroupId={quizSelection.groupId}
                groupScreens={quizSelection.groupScreens}
                liveScreens={liveScreens}
                bumpScreenPayload={bumpScreenPayload}
              />
            : bookendEditorMode && openingScreen && congratsScreen ?
              <div
                ref={bookendSplitRef}
                className="flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row lg:items-stretch"
              >
                <section
                  className={
                    "flex min-h-0 w-full min-w-0 flex-col items-center overflow-y-auto overscroll-contain border-b border-neutral-200/80 px-3 py-4 lg:min-h-0 lg:border-b-0 lg:border-r lg:border-neutral-200/80 " +
                    (bookendLayoutWide ? "" : "shrink-0")
                  }
                  style={
                    bookendLayoutWide ?
                      { flex: `${bookendSplitPct} 1 0%`, minWidth: 0 }
                    : undefined
                  }
                >
                  <div className="flex w-full max-w-xl flex-col items-center space-y-2">
                    <p className="w-full text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Lesson opening
                    </p>
                    <ScreenEditorCard
                      ref={bookendOpeningRef}
                      key={openingScreen.id}
                      screen={openingScreen}
                      index={liveScreens.findIndex((x) => x.id === openingScreen.id)}
                      lessonId={lessonId}
                      moduleId={moduleId}
                      isSelected={selectedScreen?.id === openingScreen.id}
                      onSelect={() =>
                        setSelectedIndex(
                          Math.max(0, liveScreens.findIndex((x) => x.id === openingScreen.id)),
                        )
                      }
                      bumpScreenPayload={bumpScreenPayload}
                      advancedJsonOpen={advancedJsonOpen}
                      onAdvancedJsonOpenChange={setAdvancedJsonOpen}
                      onStatusChange={onScreenEditorStatus}
                      getLastUserActivityAt={() => lastUserActivityAtRef.current}
                      onPersistSuccess={notifyScreenSaved}
                    />
                  </div>
                </section>
                <div className="hidden w-2 shrink-0 items-stretch justify-center self-stretch lg:flex">
                  <button
                    type="button"
                    aria-label="Resize opening and closing panels"
                    title="Drag to resize"
                    onPointerDown={beginBookendSplitResize}
                    className="h-full min-h-[120px] w-1 cursor-col-resize rounded bg-neutral-200/80 hover:bg-sky-300 active:bg-sky-400"
                  />
                </div>
                <section
                  className="flex min-h-0 w-full min-w-0 flex-col items-center overflow-y-auto overscroll-contain px-3 py-4 lg:min-h-0"
                  style={
                    bookendLayoutWide ?
                      { flex: `${100 - bookendSplitPct} 1 0%`, minWidth: 0 }
                    : undefined
                  }
                >
                  <div className="flex w-full max-w-xl flex-col items-center space-y-2">
                    <p className="w-full text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Lesson closing
                    </p>
                    <ScreenEditorCard
                      ref={bookendCongratsRef}
                      key={congratsScreen.id}
                      screen={congratsScreen}
                      index={liveScreens.findIndex((x) => x.id === congratsScreen.id)}
                      lessonId={lessonId}
                      moduleId={moduleId}
                      isSelected={selectedScreen?.id === congratsScreen.id}
                      onSelect={() =>
                        setSelectedIndex(
                          Math.max(0, liveScreens.findIndex((x) => x.id === congratsScreen.id)),
                        )
                      }
                      bumpScreenPayload={bumpScreenPayload}
                      advancedJsonOpen={advancedJsonOpen}
                      onAdvancedJsonOpenChange={setAdvancedJsonOpen}
                      onStatusChange={onScreenEditorStatus}
                      getLastUserActivityAt={() => lastUserActivityAtRef.current}
                      onPersistSuccess={notifyScreenSaved}
                    />
                  </div>
                </section>
              </div>
            : selectedScreen ?
              <ScreenEditorCard
                ref={screenEditorRef}
                key={selectedScreen.id}
                screen={selectedScreen}
                index={safeIndex}
                lessonId={lessonId}
                moduleId={moduleId}
                isSelected
                onSelect={() => setSelectedIndex(safeIndex)}
                bumpScreenPayload={bumpScreenPayload}
                advancedJsonOpen={advancedJsonOpen}
                onAdvancedJsonOpenChange={setAdvancedJsonOpen}
                onStatusChange={onScreenEditorStatus}
                getLastUserActivityAt={() => lastUserActivityAtRef.current}
                onPersistSuccess={notifyScreenSaved}
              />
            : <p className="p-4 text-sm text-neutral-600">Select a screen in the storyboard.</p>}
          </div>
        </div>
        {planOpen && planPinned ? (
          <aside
            className={
              "order-3 min-h-0 w-full shrink-0 overflow-y-auto border-t border-emerald-200/80 bg-emerald-50/95 p-4 xl:order-none xl:min-w-[280px] xl:self-stretch xl:border-t-0 xl:border-l xl:py-5 " +
              rightSidebarScroll
            }
            style={{ width: `clamp(280px, 38%, 520px)` }}
          >
            {renderPlanPanelBody()}
          </aside>
        ) : null}

        {toolsOpen && toolsPinned ? (
          <div className="hidden xl:flex xl:w-2 xl:items-stretch xl:justify-center xl:self-stretch">
            <button
              type="button"
              aria-label="Resize tools panel"
              onPointerDown={(e) => beginResize("right", e)}
              className="h-full w-1 cursor-col-resize rounded bg-neutral-200/80 hover:bg-sky-300 active:bg-sky-400"
            />
          </div>
        ) : null}

        {toolsOpen && toolsPinned ? (
          <aside
            className={
              "order-4 min-h-0 w-full shrink-0 overflow-y-auto border-t border-neutral-200/80 bg-neutral-50/95 p-4 xl:order-none xl:min-w-[260px] xl:self-stretch xl:border-t-0 xl:border-l xl:py-5 " +
              rightSidebarScroll
            }
            style={{ width: `clamp(260px, ${rightPanePct}%, 560px)` }}
          >
            {renderToolsPanelBody()}
          </aside>
        ) : null}
        <div className="pointer-events-none absolute inset-0 z-[50] hidden overflow-hidden xl:block">
        <svg className="h-full w-full overflow-visible" aria-hidden>
          {connectorLines.map((line) => (
            <line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="rgb(124 58 237)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
          ))}
        </svg>
        {liveScreens.map((s) => {
          const note = activityNotes[s.id];
          if (!note?.open) return null;
          return (
            <div
              key={`note-${s.id}`}
              ref={(el) => {
                noteRefs.current[s.id] = el;
              }}
              className="pointer-events-auto absolute w-64 rounded-lg border border-violet-300 bg-white shadow-xl"
              style={{ left: note.x, top: note.y, zIndex: note.z }}
              onPointerDown={() => focusNote(s.id)}
            >
              <div
                className="flex cursor-move select-none items-center justify-between rounded-t-lg border-b border-violet-200 bg-violet-50 px-2 py-1.5"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  focusNote(s.id);
                  const el = noteRefs.current[s.id];
                  if (!el) return;
                  if (prevUserSelectRef.current === null) {
                    prevUserSelectRef.current = document.body.style.userSelect;
                  }
                  document.body.style.userSelect = "none";
                  const rect = el.getBoundingClientRect();
                  dragNoteRef.current = {
                    id: s.id,
                    offsetX: e.clientX - rect.left,
                    offsetY: e.clientY - rect.top,
                  };
                }}
              >
                <span className="truncate text-xs font-semibold text-violet-900">Notes · {screenOutlineLabel(s, liveScreens)}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded border border-violet-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-violet-800 hover:bg-violet-100"
                    onClick={() =>
                      setActivityNotes((prev) => ({
                        ...prev,
                        [s.id]: { ...prev[s.id], collapsed: !prev[s.id]?.collapsed },
                      }))
                    }
                  >
                    {note.collapsed ? "Expand" : "Collapse"}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-violet-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-violet-800 hover:bg-violet-100"
                    onClick={() =>
                      setActivityNotes((prev) => ({
                        ...prev,
                        [s.id]: { ...prev[s.id], open: false },
                      }))
                    }
                  >
                    Close
                  </button>
                </div>
              </div>
              {!note.collapsed ? (
                <div className="p-2">
                  <textarea
                    value={note.text}
                    onChange={(e) =>
                      setActivityNotes((prev) => ({
                        ...prev,
                        [s.id]: { ...prev[s.id], text: e.target.value },
                      }))
                    }
                    placeholder="Write activity notes here..."
                    className="h-28 w-full resize-y rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-800 outline-none ring-sky-400 focus:ring"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
        </div>
      </div>
      <LessonPreviewOverlay
        open={previewOverlayOpen}
        onClose={() => setPreviewOverlayOpen(false)}
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        screens={liveScreens}
        initialScreenIndex={safeIndex}
        completionPlayground={completionPlayground}
      />
    </div>
  );
}
