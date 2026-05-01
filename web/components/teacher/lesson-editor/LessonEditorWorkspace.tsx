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
import type { LessonScreenRow } from "@/lib/data/catalog";
import {
  findStoryboardSegmentIndexForScreenIndex,
  segmentLessonScreensForStoryboard,
} from "@/lib/lesson-activity-taxonomy";
import { screenOutlineLabel, screenThumbnailUrl } from "@/lib/lesson-screen-outline";
import {
  getLessonPublishBlockingReasons,
  lessonPublishChecklist,
} from "@/lib/lesson-editor-checklist";
import {
  addScreenTemplate,
  createQuizGroup,
  deleteLesson,
  deleteScreen,
  duplicateLesson,
  duplicateScreen,
  importLessonScreensJson,
  moveScreen,
  reorderScreens,
  saveLesson,
  type AddScreenKind,
} from "@/lib/actions/teacher";
import { ConfirmSubmitButton } from "@/components/teacher/ConfirmSubmitButton";
import { useTeacherEditorHeader } from "@/components/teacher/TeacherEditorHeaderContext";
import { LessonPreviewOverlay } from "./LessonPreviewOverlay";
import { QuizBuilder } from "./QuizBuilder";
import {
  ScreenEditorCard,
  type ScreenEditorCardHandle,
  type ScreenEditorStatus,
} from "./ScreenEditorCard";
import Image from "next/image";

type Props = {
  moduleId: string;
  lessonId: string;
  moduleSlug: string;
  lessonSlug: string;
  lessonTitle: string;
  lessonOrderIndex: number;
  lessonEstimatedMinutes: number | null;
  published: boolean;
  screens: LessonScreenRow[];
  /** Right sidebar: AI draft and skill tags (from the page server component). */
  children?: ReactNode;
};

const ADD_SCREEN_BUTTONS: { kind: AddScreenKind; label: string }[] = [
  { kind: "start", label: "+ Start" },
  { kind: "interactive_page", label: "+ Interactive page" },
  { kind: "hotspot_info", label: "+ Hotspot info" },
  { kind: "guided_dialogue", label: "+ Guided dialogue" },
];

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
  addScreenOpen: boolean;
  setAddScreenOpen: Dispatch<SetStateAction<boolean>>;
  editorHelpOpen: boolean;
  setEditorHelpOpen: Dispatch<SetStateAction<boolean>>;
  quizSelection: { groupId: string; groupScreens: LessonScreenRow[] } | null;
  setPreviewOverlayOpen: Dispatch<SetStateAction<boolean>>;
  setStoryboardOpen: Dispatch<SetStateAction<boolean>>;
  setToolsOpen: Dispatch<SetStateAction<boolean>>;
  storyboardOpen: boolean;
  storyboardPinned: boolean;
  toolsOpen: boolean;
  toolsPinned: boolean;
};

function LessonWorkspaceHeaderToolbar({
  addScreenOpen,
  setAddScreenOpen,
  editorHelpOpen,
  setEditorHelpOpen,
  quizSelection,
  setPreviewOverlayOpen,
  setStoryboardOpen,
  setToolsOpen,
  storyboardOpen,
  storyboardPinned,
  toolsOpen,
  toolsPinned,
}: LessonWorkspaceHeaderToolbarProps) {
  return (
    <>
      <button
        type="button"
        onClick={() => setAddScreenOpen((v) => !v)}
        aria-expanded={addScreenOpen}
        aria-label={addScreenOpen ? "Close add activity" : "Add activity"}
        className={LESSON_HDR_BTN}
        title="Add screen or quiz"
      >
        Add
      </button>
      <button
        type="button"
        onClick={() => {
          setStoryboardOpen((prev) => {
            const next = !prev;
            if (next && !toolsPinned && toolsOpen) {
              setToolsOpen(false);
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
          setToolsOpen((prev) => {
            const next = !prev;
            if (next && !storyboardPinned && storyboardOpen) {
              setStoryboardOpen(false);
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
        disabled={!!quizSelection}
        className={LESSON_HDR_BTN + (quizSelection ? " cursor-not-allowed opacity-50" : "")}
        title={
          quizSelection ?
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
  toolsOpen: boolean;
  toolsPinned: boolean;
  leftPanePct: number;
  rightPanePct: number;
};

const EDITOR_LAYOUT_KEY_PREFIX = "lesson-editor-layout";
const EDITOR_NOTES_KEY_PREFIX = "lesson-editor-notes";
const EDITOR_JUMP_NEWEST_KEY_PREFIX = "lesson-editor-jump-newest";

export function LessonEditorWorkspace({
  moduleId,
  lessonId,
  moduleSlug,
  lessonSlug,
  lessonTitle,
  lessonOrderIndex,
  lessonEstimatedMinutes,
  published,
  screens,
  children,
}: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addScreenOpen, setAddScreenOpen] = useState(false);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [liveScreens, setLiveScreens] = useState<LessonScreenRow[]>(screens);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [storyboardOpen, setStoryboardOpen] = useState(false);
  const [storyboardPinned, setStoryboardPinned] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsPinned, setToolsPinned] = useState(false);
  const [previewOverlayOpen, setPreviewOverlayOpen] = useState(false);
  const [editorHelpOpen, setEditorHelpOpen] = useState(false);
  const [advancedJsonOpen, setAdvancedJsonOpen] = useState(false);
  const { setLessonToolbarSlot, notifyScreenSaved } = useTeacherEditorHeader();

  const [screenEditorStatus, setScreenEditorStatus] = useState<ScreenEditorStatus>({
    isSaving: false,
    saveHint: null,
    err: null,
  });
  const screenEditorRef = useRef<ScreenEditorCardHandle>(null);
  const onScreenEditorStatus = useCallback((s: ScreenEditorStatus) => {
    setScreenEditorStatus(s);
  }, []);
  const [leftPanePct, setLeftPanePct] = useState(23);
  const [rightPanePct, setRightPanePct] = useState(23);
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
  const layoutKey = `${EDITOR_LAYOUT_KEY_PREFIX}:${lessonId}`;
  const notesKey = `${EDITOR_NOTES_KEY_PREFIX}:${lessonId}`;
  const jumpNewestKey = `${EDITOR_JUMP_NEWEST_KEY_PREFIX}:${lessonId}`;
  const canUseDomPortal = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const serverKey = useMemo(() => screensSyncKey(screens), [screens]);
  useEffect(() => {
    queueMicrotask(() => {
      let jumpToIndex: number | null = null;
      setLiveScreens((prev) => {
        const merged = mergeServerScreensWithLocal(screens, prev);
        if (areScreensEquivalent(prev, merged)) return prev;
        if (typeof window !== "undefined" && window.sessionStorage.getItem(jumpNewestKey) === "1") {
          window.sessionStorage.removeItem(jumpNewestKey);
          jumpToIndex = Math.max(0, merged.length - 1);
        }
        return merged;
      });
      if (jumpToIndex != null) {
        setSelectedIndex(jumpToIndex);
      }
    });
  }, [serverKey, jumpNewestKey, screens]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    queueMicrotask(() => {
      try {
        const raw = window.localStorage.getItem(layoutKey);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<EditorLayoutPrefs>;
        if (typeof parsed.storyboardOpen === "boolean") setStoryboardOpen(parsed.storyboardOpen);
        if (typeof parsed.storyboardPinned === "boolean") setStoryboardPinned(parsed.storyboardPinned);
        if (typeof parsed.toolsOpen === "boolean") setToolsOpen(parsed.toolsOpen);
        if (typeof parsed.toolsPinned === "boolean") setToolsPinned(parsed.toolsPinned);
        if (typeof parsed.leftPanePct === "number") setLeftPanePct(clamp(parsed.leftPanePct, 14, 60));
        if (typeof parsed.rightPanePct === "number")
          setRightPanePct(clamp(parsed.rightPanePct, 16, 60));
      } catch {
        // Ignore corrupted local storage.
      }
    });
  }, [layoutKey]);

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
      toolsOpen,
      toolsPinned,
      leftPanePct,
      rightPanePct,
    };
    window.localStorage.setItem(layoutKey, JSON.stringify(prefs));
  }, [layoutKey, storyboardOpen, storyboardPinned, toolsOpen, toolsPinned, leftPanePct, rightPanePct]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(notesKey, JSON.stringify(activityNotes));
  }, [notesKey, activityNotes]);

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

  useLayoutEffect(() => {
    setLessonToolbarSlot(
      <LessonWorkspaceHeaderToolbar
        addScreenOpen={addScreenOpen}
        setAddScreenOpen={setAddScreenOpen}
        editorHelpOpen={editorHelpOpen}
        setEditorHelpOpen={setEditorHelpOpen}
        quizSelection={quizSelection}
        setPreviewOverlayOpen={setPreviewOverlayOpen}
        setStoryboardOpen={setStoryboardOpen}
        setToolsOpen={setToolsOpen}
        storyboardOpen={storyboardOpen}
        storyboardPinned={storyboardPinned}
        toolsOpen={toolsOpen}
        toolsPinned={toolsPinned}
      />,
    );
    return () => setLessonToolbarSlot(null);
  }, [
    addScreenOpen,
    editorHelpOpen,
    quizSelection,
    setLessonToolbarSlot,
    storyboardOpen,
    storyboardPinned,
    toolsOpen,
    toolsPinned,
  ]);

  const navigateFromStoryboard = useCallback(
    (screenIndex: number) => {
      setSelectedIndex(screenIndex);
      if (!storyboardPinned) {
        setStoryboardOpen(false);
      }
      if (!toolsPinned) {
        setToolsOpen(false);
      }
    },
    [storyboardPinned, toolsPinned],
  );

  /** Relative path only — same on server and client (avoids hydration mismatch from `window`). */
  const studentPath = `/learn/${moduleSlug}/${lessonSlug}`;

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
    const prev = liveScreens;
    const map = new Map(liveScreens.map((s) => [s.id, s]));
    const nextRows = orderedIds.map((id, i) => {
      const row = map.get(id);
      if (!row) throw new Error("Missing screen");
      return { ...row, order_index: i };
    });
    setLiveScreens(nextRows);
    try {
      await reorderScreens(lessonId, moduleId, orderedIds);
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
    const selectedId = liveScreens[safeIndex]?.id;
    if (selectedId) setSelectedIndex(next.indexOf(selectedId));
    void applyReorder(next);
  }

  const selectedScreen = liveScreens[safeIndex];

  useEffect(() => {
    queueMicrotask(() => {
      setAdvancedJsonOpen(false);
    });
  }, [selectedScreen?.id]);

  const quizGroupId = quizSelection?.groupId ?? null;
  useEffect(() => {
    if (quizGroupId == null) return;
    queueMicrotask(() => {
      setScreenEditorStatus({ isSaving: false, saveHint: null, err: null });
    });
  }, [quizGroupId]);

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
    toolsOpen,
    toolsPinned,
  ]);

  useEffect(() => {
    const onScrollOrResize = () => computeConnectorLines();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [computeConnectorLines]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setStoryboardOpen(false);
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
                draggable
                onDragStart={(e) => onDragStart(e, s.id)}
                onDragEnd={() => setDraggingId(null)}
                className="cursor-grab select-none px-0.5 pt-0.5 font-mono text-[11px] text-neutral-400 active:cursor-grabbing"
                title="Drag to reorder"
                role="button"
                tabIndex={0}
                aria-label={`Drag to reorder screen ${i}`}
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
                  <form action={moveScreen.bind(null, s.id, lessonId, moduleId, "up")}>
                    <button
                      type="submit"
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200"
                    >
                      Up
                    </button>
                  </form>
                  <form action={moveScreen.bind(null, s.id, lessonId, moduleId, "down")}>
                    <button
                      type="submit"
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200"
                    >
                      Down
                    </button>
                  </form>
                  <form action={duplicateScreen.bind(null, s.id, lessonId, moduleId)}>
                    <input type="hidden" name="duplicate_screen" value={s.id} />
                    <button
                      type="submit"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (typeof window !== "undefined") {
                          window.sessionStorage.setItem(jumpNewestKey, "1");
                        }
                      }}
                      className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 active:bg-blue-200"
                    >
                      Dup
                    </button>
                  </form>
                  <form action={deleteScreen.bind(null, s.id, lessonId, moduleId)}>
                    <button
                      type="submit"
                      onClick={(e) => {
                        e.stopPropagation();
                        const shouldDelete = window.confirm(
                          `Delete this storyboard item?\n\n${screenOutlineLabel(s, liveScreens)}`,
                        );
                        if (!shouldDelete) {
                          e.preventDefault();
                        }
                      }}
                      className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-100 active:bg-red-200"
                    >
                      Del
                    </button>
                  </form>
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
      <li key={`quiz-${seg.groupId}`}>
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
                <form action={moveScreen.bind(null, s.id, lessonId, moduleId, "up")}>
                  <button
                    type="submit"
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200"
                  >
                    Up
                  </button>
                </form>
                <form action={moveScreen.bind(null, s.id, lessonId, moduleId, "down")}>
                  <button
                    type="submit"
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200"
                  >
                    Down
                  </button>
                </form>
                <form action={deleteScreen.bind(null, s.id, lessonId, moduleId)}>
                  <button
                    type="submit"
                    onClick={(e) => {
                      e.stopPropagation();
                      const shouldDelete = window.confirm(
                        `Delete first question in this quiz (from the lesson)?\n\n${screenOutlineLabel(s, liveScreens)}`,
                      );
                      if (!shouldDelete) {
                        e.preventDefault();
                      }
                    }}
                    className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-100 active:bg-red-200"
                  >
                    Del
                  </button>
                </form>
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
            JSON: {"{"} &quot;screens&quot;: [ {"{"} &quot;screen_type&quot;, &quot;payload&quot; {"}"}… ] {"}"}.
            Paste only the raw object (no{" "}
            <code className="rounded bg-neutral-100 px-0.5">```json</code> wrappers).
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
      {canUseDomPortal && addScreenOpen ?
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[44] bg-black/20"
              aria-label="Close add activity"
              onClick={() => setAddScreenOpen(false)}
            />
            <div
              className="fixed right-3 left-3 z-[45] max-h-[min(85dvh,560px)] overflow-y-auto overscroll-contain rounded-xl border border-neutral-200 bg-neutral-50/98 p-4 shadow-xl backdrop-blur-sm sm:left-auto sm:w-[min(100%-1.5rem,36rem)]"
              style={{
                top: "calc(var(--lesson-editor-toolbar-height, 3.5rem) + 0.5rem)",
              }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-neutral-200 pb-2">
                <p className="text-sm font-semibold text-neutral-900">Add activity</p>
                <button
                  type="button"
                  onClick={() => setAddScreenOpen(false)}
                  className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Close
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {ADD_SCREEN_BUTTONS.map(({ kind, label }) => (
                  <form key={kind} action={addScreenTemplate.bind(null, lessonId, moduleId, kind)}>
                    <button
                      type="submit"
                      className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-xs font-semibold shadow-sm hover:bg-neutral-50 active:bg-neutral-200 sm:text-sm"
                    >
                      {label}
                    </button>
                  </form>
                ))}
                <form
                  action={createQuizGroup.bind(null, lessonId, moduleId)}
                  className="flex flex-wrap items-end gap-2 rounded border border-sky-200 bg-sky-50/80 px-2 py-2"
                >
                  <label className="text-xs font-medium text-neutral-700">
                    Quiz title
                    <input
                      name="title"
                      type="text"
                      placeholder="e.g. Unit check"
                      className="ml-1 mt-0.5 w-40 rounded border border-neutral-300 px-2 py-1 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded bg-sky-700 px-2 py-1.5 text-xs font-semibold text-white hover:bg-sky-800 sm:text-sm"
                  >
                    + New quiz
                  </button>
                </form>
              </div>
            </div>
          </>,
          document.body,
        )
      : null}

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
            : "Auto-save runs a few seconds after you stop typing and when focus leaves the card. Use Save screen now after heavy edits (e.g. cover image). Open Preview for a floating student view."}
          </p>

          <div className="mt-4 space-y-3 border-t border-neutral-200 pt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Lesson</p>
            <div className="flex flex-wrap gap-2">
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
                    className="rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800 sm:text-sm"
                    onClick={() => void screenEditorRef.current?.saveNow()}
                  >
                    Save screen now
                  </button>
                  <button
                    type="button"
                    className="rounded border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 sm:text-sm"
                    onClick={() => setAdvancedJsonOpen((v) => !v)}
                  >
                    {advancedJsonOpen ? "Hide" : "Show"} advanced JSON
                  </button>
                </div>
                {screenEditorStatus.isSaving || screenEditorStatus.saveHint ?
                  <p
                    className={`text-xs font-medium ${
                      screenEditorStatus.saveHint?.startsWith("Already") ?
                        "text-neutral-600"
                      : "text-green-800"
                    }`}
                  >
                    {screenEditorStatus.isSaving ? "Saving… " : null}
                    {screenEditorStatus.saveHint}
                  </p>
                : null}
                {screenEditorStatus.err ?
                  <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-800">
                    {screenEditorStatus.err}
                  </p>
                : null}
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
                onPersistSuccess={notifyScreenSaved}
              />
            : <p className="p-4 text-sm text-neutral-600">Select a screen in the storyboard.</p>}
          </div>
        </div>
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
      />
    </div>
  );
}
