"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  LessonPlayer,
} from "@/components/lesson/LessonPlayer";
import type { LessonScreenRow } from "@/lib/data/catalog";
import { screenOutlineLabel, screenThumbnailUrl } from "@/lib/lesson-screen-outline";
import { lessonPublishChecklist } from "@/lib/lesson-editor-checklist";
import {
  addScreenTemplate,
  deleteScreen,
  duplicateLesson,
  duplicateScreen,
  importLessonScreensJson,
  moveScreen,
  reorderScreens,
  type AddScreenKind,
} from "@/lib/actions/teacher";
import { ScreenEditorCard } from "./ScreenEditorCard";
import Image from "next/image";

type Props = {
  moduleId: string;
  lessonId: string;
  moduleSlug: string;
  lessonSlug: string;
  lessonTitle: string;
  published: boolean;
  screens: LessonScreenRow[];
  /** Right sidebar: AI draft and skill tags (from the page server component). */
  children?: ReactNode;
};

const ADD_BUTTONS: { kind: AddScreenKind; label: string }[] = [
  { kind: "start", label: "+ Start" },
  { kind: "story", label: "+ Story" },
  { kind: "mc_quiz", label: "+ Quiz (MC)" },
  { kind: "true_false", label: "+ True/False" },
  { kind: "short_answer", label: "+ Short answer" },
  { kind: "fill_blanks", label: "+ Fill blanks" },
  { kind: "fix_text", label: "+ Fix text" },
  { kind: "essay", label: "+ Essay" },
  { kind: "click_targets", label: "+ Click target" },
  { kind: "treasure_tap", label: "+ Treasure tap" },
  { kind: "sound_sort", label: "+ Sound sort" },
  { kind: "listen_hotspot_sequence", label: "+ Listen hotspot sequence" },
  { kind: "listen_color_write", label: "+ Listen color/write" },
  { kind: "letter_mixup", label: "+ Letter mix-up" },
  { kind: "word_shape_hunt", label: "+ Word shape hunt" },
  { kind: "table_complete", label: "+ Table complete" },
  { kind: "sorting_game", label: "+ Sorting game" },
  { kind: "hotspot_info", label: "+ Hotspots (info)" },
  { kind: "hotspot_gate", label: "+ Hotspots (gate)" },
  { kind: "voice_question", label: "+ Voice question" },
  { kind: "guided_dialogue", label: "+ Guided dialogue" },
  { kind: "presentation_interactive", label: "+ Interactive presentation" },
  { kind: "drag_sentence", label: "+ Drag sentence" },
  { kind: "drag_match", label: "+ Drag match" },
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
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (
      left.id !== right.id ||
      left.x1 !== right.x1 ||
      left.y1 !== right.y1 ||
      left.x2 !== right.x2 ||
      left.y2 !== right.y2
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
  toolsOpen: boolean;
  previewOpen: boolean;
  detailsOpen: boolean;
  leftPanePct: number;
  rightPanePct: number;
  previewPanePct: number;
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
  published,
  screens,
  children,
}: Props) {
  const topMenuButtonClass =
    "inline-flex h-10 min-w-[110px] items-center justify-center rounded-lg border border-neutral-300 bg-neutral-50 px-3 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-100 active:bg-neutral-200";
  const shellRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addScreenOpen, setAddScreenOpen] = useState(false);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [liveScreens, setLiveScreens] = useState<LessonScreenRow[]>(screens);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [storyboardOpen, setStoryboardOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [leftPanePct, setLeftPanePct] = useState(23);
  const [rightPanePct, setRightPanePct] = useState(23);
  const [previewPanePct, setPreviewPanePct] = useState(62);
  const [activityNotes, setActivityNotes] = useState<Record<string, ActivityNote>>({});
  const [connectorLines, setConnectorLines] = useState<ConnectorLine[]>([]);
  const noteZRef = useRef(20);
  const prevUserSelectRef = useRef<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const noteRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragNoteRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [resizing, setResizing] = useState<{
    pane: "left" | "center" | "right";
    startX: number;
    startLeft: number;
    startRight: number;
    startPreview: number;
  } | null>(null);
  const layoutKey = `${EDITOR_LAYOUT_KEY_PREFIX}:${lessonId}`;
  const notesKey = `${EDITOR_NOTES_KEY_PREFIX}:${lessonId}`;
  const jumpNewestKey = `${EDITOR_JUMP_NEWEST_KEY_PREFIX}:${lessonId}`;

  const serverKey = useMemo(() => screensSyncKey(screens), [screens]);
  useEffect(() => {
    setLiveScreens((prev) => {
      const merged = mergeServerScreensWithLocal(screens, prev);
      if (areScreensEquivalent(prev, merged)) return prev;
      if (typeof window !== "undefined" && window.sessionStorage.getItem(jumpNewestKey) === "1") {
        window.sessionStorage.removeItem(jumpNewestKey);
        setSelectedIndex(Math.max(0, merged.length - 1));
      }
      return merged;
    });
    // Merge server snapshot with local edits; `screens` is the snapshot for this `serverKey`.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-merge when server identity key changes
  }, [serverKey, jumpNewestKey, screens]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(layoutKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<EditorLayoutPrefs>;
      if (typeof parsed.storyboardOpen === "boolean") setStoryboardOpen(parsed.storyboardOpen);
      if (typeof parsed.toolsOpen === "boolean") setToolsOpen(parsed.toolsOpen);
      if (typeof parsed.previewOpen === "boolean") setPreviewOpen(parsed.previewOpen);
      if (typeof parsed.detailsOpen === "boolean") setDetailsOpen(parsed.detailsOpen);
      if (typeof parsed.leftPanePct === "number") setLeftPanePct(clamp(parsed.leftPanePct, 14, 60));
      if (typeof parsed.rightPanePct === "number")
        setRightPanePct(clamp(parsed.rightPanePct, 16, 60));
      if (typeof parsed.previewPanePct === "number")
        setPreviewPanePct(clamp(parsed.previewPanePct, 30, 75));
    } catch {
      // Ignore corrupted local storage.
    }
  }, [layoutKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(notesKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, ActivityNote>;
      setActivityNotes(parsed);
    } catch {
      // Ignore corrupted local storage.
    }
  }, [notesKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefs: EditorLayoutPrefs = {
      storyboardOpen,
      toolsOpen,
      previewOpen,
      detailsOpen,
      leftPanePct,
      rightPanePct,
      previewPanePct,
    };
    window.localStorage.setItem(layoutKey, JSON.stringify(prefs));
  }, [
    layoutKey,
    storyboardOpen,
    toolsOpen,
    previewOpen,
    detailsOpen,
    leftPanePct,
    rightPanePct,
    previewPanePct,
  ]);

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

  const safeIndex = Math.min(
    Math.max(0, selectedIndex),
    Math.max(0, liveScreens.length - 1),
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

  const leftSidebarScroll =
    "space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:overscroll-contain";
  const rightSidebarScroll =
    "space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1";

  const beginResize = useCallback(
    (pane: "left" | "center" | "right", e: React.PointerEvent) => {
      if (window.innerWidth < 1280) return;
      setResizing({
        pane,
        startX: e.clientX,
        startLeft: leftPanePct,
        startRight: rightPanePct,
        startPreview: previewPanePct,
      });
      e.preventDefault();
    },
    [leftPanePct, previewPanePct, rightPanePct],
  );

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: PointerEvent) => {
      if (resizing.pane === "center") {
        const w = centerRef.current?.getBoundingClientRect().width ?? 0;
        if (w <= 0) return;
        const dPct = ((e.clientX - resizing.startX) / w) * 100;
        setPreviewPanePct(clamp(resizing.startPreview + dPct, 30, 75));
        return;
      }
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
      setConnectorLines((prev) => (prev.length === 0 ? prev : []));
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
    setConnectorLines((prev) => (areConnectorLinesEqual(prev, next) ? prev : next));
  }, [activityNotes, liveScreens]);

  useLayoutEffect(() => {
    computeConnectorLines();
  }, [computeConnectorLines, leftPanePct, rightPanePct, previewPanePct, storyboardOpen, toolsOpen]);

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

  return (
    <div className="relative space-y-4">
      <section className="sticky top-0 z-40 flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-white/95 py-2 backdrop-blur">
        {!addScreenOpen ? (
          <button
            type="button"
            onClick={() => setAddScreenOpen(true)}
            aria-expanded={addScreenOpen}
            aria-label="Expand add activity"
            className={topMenuButtonClass}
            title="Add activity"
          >
            Add activity
          </button>
        ) : (
          <div className="w-full rounded-lg border border-neutral-200 bg-neutral-50/90 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setAddScreenOpen(false)}
                className="text-sm font-semibold uppercase tracking-wide text-neutral-600 hover:text-neutral-900"
                aria-label="Collapse add activity"
                title="Collapse add activity"
              >
                Add activity
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {ADD_BUTTONS.map(({ kind, label }) => (
                <form key={kind} action={addScreenTemplate.bind(null, lessonId, moduleId, kind)}>
                  <button
                    type="submit"
                    className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-xs font-semibold shadow-sm hover:bg-neutral-50 active:bg-neutral-200 sm:text-sm"
                  >
                    {label}
                  </button>
                </form>
              ))}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setStoryboardOpen((v) => !v)}
          aria-expanded={storyboardOpen}
          className={topMenuButtonClass}
          title={storyboardOpen ? "Collapse storyboard" : "Expand storyboard"}
        >
          Storyboard
        </button>
        <button
          type="button"
          onClick={() => setToolsOpen((v) => !v)}
          aria-expanded={toolsOpen}
          className={topMenuButtonClass}
          title={toolsOpen ? "Collapse lesson tools" : "Expand lesson tools"}
        >
          Tools
        </button>
        <button
          type="button"
          onClick={() => setPreviewOpen((v) => !v)}
          aria-expanded={previewOpen}
          className={topMenuButtonClass}
          title={previewOpen ? "Collapse student preview" : "Expand student preview"}
        >
          Preview
        </button>
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          aria-expanded={detailsOpen}
          className={topMenuButtonClass}
          title={detailsOpen ? "Collapse screen details" : "Expand screen details"}
        >
          Details
        </button>
      </section>

      <div
        ref={shellRef}
        className={
          "relative flex min-h-[calc(100vh-7rem)] flex-col gap-0 border border-neutral-200 bg-white " +
          "xl:flex-row xl:items-start"
        }
      >
        <aside
          className={`order-1 min-h-0 min-w-0 xl:self-start ${leftSidebarScroll} shrink-0 border-neutral-200/80 bg-neutral-100/95 xl:order-none xl:border-r ${
            storyboardOpen
              ? "w-full p-4 xl:min-w-[220px] xl:py-5"
              : "hidden"
          }`}
          style={
            storyboardOpen
              ? { width: `clamp(220px, ${leftPanePct}%, 520px)` }
              : undefined
          }
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Storyboard
              </h2>
              <p className="mt-1 text-xs text-neutral-600">Drag to reorder · Up / Down / Dup / Del</p>
            </div>
          </div>
          <>
              <ol className="mt-3 space-y-2">
                {liveScreens.map((s, i) => {
                  const thumb = screenThumbnailUrl(s);
                  return (
                    <li key={s.id}>
                      <div
                        ref={(el) => {
                          rowRefs.current[s.id] = el;
                        }}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, s.id)}
                        onClick={() => setSelectedIndex(i)}
                        className={`rounded border p-1.5 transition-opacity ${
                          draggingId === s.id ? "opacity-60" : ""
                        } ${
                          i === safeIndex ? "border-sky-600 bg-sky-50" : "border-neutral-200 bg-white"
                        }`}
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
                              onClick={() => setSelectedIndex(i)}
                              className="flex w-full min-w-0 items-start gap-1 rounded-md px-0.5 py-0.5 text-left hover:bg-neutral-50 active:bg-neutral-100"
                            >
                              <span className="w-4 shrink-0 font-mono text-[11px] text-neutral-500">{i}</span>
                              <span className="line-clamp-2 min-w-0 flex-1 text-[11px] leading-snug sm:text-xs">
                                {screenOutlineLabel(s)}
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
                                      `Delete this storyboard item?\n\n${screenOutlineLabel(s)}`,
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
                })}
              </ol>
              {liveScreens.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-600">No screens yet.</p>
              ) : null}
            </>
        </aside>
        {storyboardOpen ? (
          <div className="hidden xl:flex xl:w-2 xl:items-stretch xl:justify-center xl:self-stretch">
            <button
              type="button"
              aria-label="Resize storyboard panel"
              onPointerDown={(e) => beginResize("left", e)}
              className="h-full w-1 cursor-col-resize rounded bg-neutral-200/80 hover:bg-sky-300 active:bg-sky-400"
            />
          </div>
        ) : null}

        <div
          ref={centerRef}
          className="order-2 flex min-h-0 min-w-0 flex-1 flex-col gap-4 border-neutral-200 bg-white p-4 sm:p-5 xl:order-none xl:max-w-none xl:flex-row xl:gap-4 xl:self-stretch"
        >
          <div
            className={`min-h-0 min-w-0 flex-1 flex-col space-y-3 ${previewOpen ? "flex" : "hidden"}`}
            style={previewOpen ? { flexBasis: `${previewPanePct}%` } : undefined}
          >
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Student preview</h2>
              <p className="mt-1 text-sm text-neutral-600">
                This preview matches the student view. Edit content in{" "}
                <strong className="font-medium text-neutral-800">Screen details</strong>; the preview updates
                immediately.
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded border-4 border-neutral-800 bg-amber-50/30 p-3 shadow-inner">
              {liveScreens.length > 0 ? (
                <LessonPlayer
                  key={lessonId}
                  mode="preview"
                  lessonId={lessonId}
                  lessonTitle={lessonTitle}
                  screens={liveScreens}
                  initialScreenIndex={safeIndex}
                />
              ) : (
                <p className="text-sm text-neutral-600">Add screens to preview.</p>
              )}
            </div>
          </div>
          {previewOpen && detailsOpen ? (
            <div className="hidden xl:flex xl:w-2 xl:items-stretch xl:justify-center xl:self-stretch">
              <button
                type="button"
                aria-label="Resize preview and details panels"
                onPointerDown={(e) => beginResize("center", e)}
                className="h-full w-1 cursor-col-resize rounded bg-neutral-200/80 hover:bg-sky-300 active:bg-sky-400"
              />
            </div>
          ) : null}

          <div
            className={`order-3 min-h-0 min-w-0 flex-1 flex-col space-y-3 xl:order-none xl:min-w-[280px] ${
              detailsOpen ? "flex" : "hidden"
            }`}
            style={detailsOpen ? { flexBasis: `${100 - previewPanePct}%` } : undefined}
          >
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Screen details</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Auto-save a few seconds after you stop typing, and when focus leaves this card. Use{" "}
                <strong>Save screen now</strong> for an immediate write (recommended after a cover image).
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-visible rounded-lg border border-neutral-200 bg-white p-1 shadow-sm">
              {selectedScreen ? (
                <ScreenEditorCard
                  key={selectedScreen.id}
                  screen={selectedScreen}
                  index={safeIndex}
                  lessonId={lessonId}
                  moduleId={moduleId}
                  isSelected
                  onSelect={() => setSelectedIndex(safeIndex)}
                  bumpScreenPayload={bumpScreenPayload}
                />
              ) : (
                <p className="p-4 text-sm text-neutral-600">Select a screen in the storyboard.</p>
              )}
            </div>
          </div>
        </div>
        {toolsOpen ? (
          <div className="hidden xl:flex xl:w-2 xl:items-stretch xl:justify-center xl:self-stretch">
            <button
              type="button"
              aria-label="Resize tools panel"
              onPointerDown={(e) => beginResize("right", e)}
              className="h-full w-1 cursor-col-resize rounded bg-neutral-200/80 hover:bg-sky-300 active:bg-sky-400"
            />
          </div>
        ) : null}

        <aside
          className={`order-4 min-h-0 min-w-0 xl:self-start ${rightSidebarScroll} shrink-0 border-t border-neutral-200/80 bg-neutral-50/95 xl:order-none xl:border-t-0 xl:border-l ${
            toolsOpen
              ? "w-full p-4 xl:min-w-[260px] xl:py-5"
              : "hidden"
          }`}
          style={
            toolsOpen
              ? { width: `clamp(260px, ${rightPanePct}%, 560px)` }
              : undefined
          }
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Lesson tools</p>
          </div>
          <>
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
              JSON: {"{"} &quot;screens&quot;: [ {"{"} &quot;screen_type&quot;, &quot;payload&quot; {"}"}… ] {"}"}
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
                rows={5}
                className="w-full rounded border font-mono text-[11px] leading-snug"
                placeholder='{"screens":[...]}'
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
        </aside>
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
                <span className="truncate text-xs font-semibold text-violet-900">Notes · {screenOutlineLabel(s)}</span>
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
    </div>
  );
}
