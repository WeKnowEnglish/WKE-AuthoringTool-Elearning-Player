"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import {
  defaultRegion,
  nextRegionId,
  RectRegionEditor,
  type RectPercent,
} from "@/components/teacher/lesson-editor/RectRegionEditor";
import { ScaledStoryItemImage } from "@/components/story/ScaledStoryItemImage";
import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import { AudioUrlControls } from "@/components/teacher/media/AudioUrlControls";
import {
  storyAnimationPresetSchema,
  storyPayloadSchema,
  storyTimelineActionSchema,
  type ScreenPayload,
  type StoryActionSequence,
  type StoryActionStep,
  type StoryClickAction,
  type StoryItem,
  type StoryPage,
  type StoryPagePhase,
  type StoryTimelineStep,
} from "@/lib/lesson-schemas";
import {
  getItemClickActionSequences,
  getPageEnterActionSequences,
  getPhaseEnterActionSequences,
  stripLegacyAnimationFields,
} from "@/lib/story-action-sequences";
import {
  appendPhase,
  createTwoInitialPhases,
  getEditorPhases,
  isEditorVirtualPhases,
  isItemVisibleInEditorPhase,
  removePhaseAt,
  sanitizePageForPayload,
  StoryPhaseProperties,
  STORY_EDITOR_VIRTUAL_PHASE_ID,
} from "@/components/teacher/lesson-editor/story-editor-phases";
import { StoryItemEditorPanel } from "@/components/teacher/lesson-editor/StoryItemEditorPanel";
import {
  searchTeacherMedia,
  uploadTeacherMedia,
  type MediaAssetRow,
} from "@/lib/actions/media";
import type { ZodType } from "zod";

function emitLive(
  onLivePayload: (p: unknown) => void,
  schema: ZodType,
  raw: unknown,
) {
  const r = schema.safeParse(raw);
  onLivePayload(r.success ? r.data : raw);
}

function stableStorySignature(schema: ZodType, raw: unknown): string {
  const r = schema.safeParse(raw);
  return JSON.stringify(r.success ? r.data : raw);
}

function newEntityId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

function labelClass() {
  return "mt-2 block text-sm font-medium text-neutral-800";
}

function clampPercentInput(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function reorderById<T extends { id: string }>(
  list: T[],
  fromId: string,
  toId: string,
): T[] {
  if (fromId === toId) return list;
  const fromIndex = list.findIndex((x) => x.id === fromId);
  const toIndex = list.findIndex((x) => x.id === toId);
  if (fromIndex < 0 || toIndex < 0) return list;
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return list;
  next.splice(toIndex, 0, moved);
  return next;
}

function reorderByIndex<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return list;
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= list.length || toIndex >= list.length) {
    return list;
  }
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return list;
  next.splice(toIndex, 0, moved);
  return next;
}

const ANIM_PRESETS = storyAnimationPresetSchema.options;
const TIMELINE_ACTIONS = storyTimelineActionSchema.options;

const TAP_ACTIONS: StoryClickAction["action"][] = [
  "emphasis",
  "move",
  "show_item",
  "hide_item",
  "play_sound",
];
const TAP_TIMINGS: NonNullable<StoryClickAction["trigger_timing"]>[] = [
  "simultaneous",
  "after_previous",
  "next_click",
];
const TAP_EMPHASIS_PRESETS: NonNullable<StoryClickAction["emphasis_preset"]>[] = [
  "grow",
  "shrink",
  "spin",
  "wobble",
  "fade_in",
  "fade_out",
];

function itemDisplayLabel(it: StoryItem): string {
  const n = it.name?.trim();
  if (!n && (it.kind ?? "image") === "text") {
    const t = it.text?.trim();
    if (t) return t.slice(0, 24);
  }
  return n || it.id;
}

function preferredTapSpeechSoundUrl(
  item: StoryItem | null | undefined,
  phaseId: string | null,
): string | undefined {
  if (!item?.tap_speeches?.length) return undefined;
  const sorted = [...item.tap_speeches].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  const eligible = sorted.find((entry) => {
    const url = entry.sound_url?.trim();
    if (!url) return false;
    const phases = entry.phase_ids;
    if (!phases || phases.length === 0) return true;
    if (!phaseId) return false;
    return phases.includes(phaseId);
  });
  return eligible?.sound_url?.trim() || undefined;
}

function storyItemToRect(it: StoryItem): RectPercent {
  return {
    id: it.id,
    x_percent: it.x_percent,
    y_percent: it.y_percent,
    w_percent: it.w_percent,
    h_percent: it.h_percent,
    label: itemDisplayLabel(it),
  };
}

function rectToStoryItem(
  r: RectPercent,
  prev: StoryItem | undefined,
  fallbackImage: string,
): StoryItem {
  return {
    id: r.id,
    name: prev?.name,
    kind: prev?.kind ?? "image",
    image_url: prev?.image_url ?? fallbackImage,
    text: prev?.text,
    text_color: prev?.text_color,
    text_size_px: prev?.text_size_px,
    x_percent: r.x_percent,
    y_percent: r.y_percent,
    w_percent: r.w_percent,
    h_percent: r.h_percent,
    show_card: prev?.show_card ?? true,
    show_on_start: prev?.show_on_start ?? true,
    image_scale: prev?.image_scale ?? 1,
    z_index: prev?.z_index ?? 0,
    enter: prev?.enter,
    exit: prev?.exit,
    emphasis: prev?.emphasis,
    path: (() => {
      const p = prev?.path;
      if (!p || p.waypoints.length < 2) return p;
      const nextWp = p.waypoints.slice();
      nextWp[0] = { x_percent: r.x_percent, y_percent: r.y_percent };
      return { ...p, waypoints: nextWp };
    })(),
    on_click: prev?.on_click,
    request_line: prev?.request_line,
    tap_speeches: prev?.tap_speeches,
    action_sequences: prev?.action_sequences,
    idle_animations: prev?.idle_animations,
  };
}

function pageItemsHaveClickSequenceId(
  items: StoryItem[],
  sequenceId: string,
): boolean {
  for (const it of items) {
    for (const seq of it.action_sequences ?? []) {
      if (seq.event === "click" && seq.id === sequenceId) return true;
    }
    if (
      sequenceId === `legacy:item:${it.id}:triggers` &&
      (it.on_click?.triggers?.length ?? 0) > 0
    ) {
      return true;
    }
  }
  return false;
}

function pruneDeletedItemReferences(page: StoryPage, removedIds: Set<string>): StoryPage {
  if (removedIds.size === 0) return page;
  const nextItems = page.items
    .filter((it) => !removedIds.has(it.id))
    .map((it) => {
      const keptTriggers = (it.on_click?.triggers ?? []).filter(
        (tr) => !tr.item_id || !removedIds.has(tr.item_id),
      );
      const keptTriggerIds = new Set(
        keptTriggers.map((tr, idx) => tr.trigger_id ?? `${it.id}:${idx}`),
      );
      const nextTriggers = keptTriggers.filter(
        (tr) => !tr.after_trigger_id || keptTriggerIds.has(tr.after_trigger_id),
      );
      const nextOnClick =
        it.on_click &&
        (it.on_click.sound_url || it.on_click.run_emphasis || nextTriggers.length > 0) ?
          {
            ...it.on_click,
            triggers: nextTriggers.length > 0 ? nextTriggers : undefined,
          }
        : undefined;
      return {
        ...it,
        on_click: nextOnClick,
      };
    });
  const nextTimeline = (page.timeline ?? []).filter(
    (step) => !step.item_id || !removedIds.has(step.item_id),
  );
  const nextPhases =
    page.phases?.map((ph) => {
      const c = ph.completion;
      let nextComp =
        c?.type === "on_click" && removedIds.has(c.target_item_id) ?
          undefined
        : c;
      if (c?.type === "all_matched" && c.next_phase_id && removedIds.has(c.next_phase_id)) {
        nextComp = { type: "end_phase" as const };
      }
      if (
        nextComp?.type === "sequence_complete" &&
        !pageItemsHaveClickSequenceId(nextItems, nextComp.sequence_id)
      ) {
        nextComp = { type: "end_phase" as const };
      }
      let nextDrag = ph.drag_match;
      if (ph.drag_match) {
        const dm = ph.drag_match;
        const dragIds = dm.draggable_item_ids.filter((id) => !removedIds.has(id));
        const targetIds = dm.target_item_ids.filter((id) => !removedIds.has(id));
        const targetSet = new Set(targetIds);
        const nextMapAll: Record<string, string> = {};
        for (const [from, to] of Object.entries(dm.correct_map)) {
          if (removedIds.has(from) || removedIds.has(to)) continue;
          if (!targetSet.has(to)) continue;
          nextMapAll[from] = to;
        }
        const mappedDragIds = dragIds.filter((did) => !!nextMapAll[did]);
        const nextMap: Record<string, string> = {};
        for (const did of mappedDragIds) {
          nextMap[did] = nextMapAll[did]!;
        }
        nextDrag =
          mappedDragIds.length > 0 && targetIds.length > 0 ?
            {
              draggable_item_ids: mappedDragIds,
              target_item_ids: targetIds,
              correct_map: nextMap,
              after_correct_match: dm.after_correct_match,
            }
          : undefined;
      }
      if (ph.kind === "drag_match" && !nextDrag) {
        nextComp = { type: "end_phase" as const };
      }
      return {
        ...ph,
        kind: !nextDrag && ph.kind === "drag_match" ? undefined : ph.kind,
        visible_item_ids: ph.visible_item_ids?.filter((id) => !removedIds.has(id)),
        advance_on_item_tap_id:
          ph.advance_on_item_tap_id && removedIds.has(ph.advance_on_item_tap_id) ?
            null
          : ph.advance_on_item_tap_id,
        highlight_item_ids: ph.highlight_item_ids?.filter((id) => !removedIds.has(id)),
        on_enter: ph.on_enter
          ?.map((s) => ({
            ...s,
            item_id: s.item_id && removedIds.has(s.item_id) ? undefined : s.item_id,
            item_ids: s.item_ids?.filter((id) => !removedIds.has(id)),
          }))
          .filter(
            (s) =>
              s.action === "play_sound" ||
              s.action === "emphasis" ?
                !!s.item_id
              : ((s.item_ids?.length ?? 0) > 0 || !!s.item_id),
          ),
        completion: nextComp,
        drag_match: nextDrag,
      };
    }) ?? undefined;
  return {
    ...page,
    items: nextItems,
    timeline: nextTimeline.length > 0 ? nextTimeline : undefined,
    phases: nextPhases,
  };
}

function triggerDisplayLabel(
  item: StoryItem,
  tr: StoryClickAction,
  index: number,
): string {
  const itemName = itemDisplayLabel(item);
  return `${itemName} • ${tr.action} #${index + 1}`;
}

type AnimationRow = {
  id: string;
  name: string;
  trigger: string;
  impacted: string;
  sequence: StoryActionSequence;
  scope: "item" | "phase" | "page";
  scopeId: string;
};

type AnimationEditorState = {
  rowId: string;
  scope: AnimationRow["scope"];
  scopeId: string;
  trigger: string;
  isLegacy: boolean;
  sequence: StoryActionSequence;
};

export function StoryFields({
  syncKey,
  initial,
  onLivePayload,
  busy,
}: {
  /** Bumps when the screen row from the server changes (id / updated_at), not on every live payload edit — avoids resetting state while dragging items. */
  syncKey: string;
  initial: Extract<ScreenPayload, { type: "story" }>;
  onLivePayload: (p: unknown) => void;
  busy: boolean;
}) {
  const [image_url, setImageUrl] = useState(initial.image_url ?? "");
  const [image_fit, setImageFit] = useState<"cover" | "contain">(initial.image_fit ?? "cover");
  const [video_url, setVideoUrl] = useState(initial.video_url ?? "");
  const [body_text, setBody] = useState(initial.body_text);
  const [read_aloud_text, setRead] = useState(initial.read_aloud_text ?? "");
  const [tts_lang, setTts] = useState(initial.tts_lang ?? "en-US");
  const [tip_text, setTip] = useState(initial.guide?.tip_text ?? "");
  const [guide_image, setGuideImg] = useState(initial.guide?.image_url ?? "");
  const [pages, setPages] = useState<StoryPage[]>(() =>
    initial.pages?.length ?
      initial.pages.map((p) => ({ ...p, items: p.items.map((i) => ({ ...i })) }))
    : [
        {
          id: "legacy-page",
          background_image_url: initial.image_url || undefined,
          image_fit: initial.image_fit ?? "cover",
          video_url: initial.video_url || undefined,
          body_text: initial.body_text,
          read_aloud_text: initial.read_aloud_text || undefined,
          items: [],
        },
      ],
  );
  const [pageTurn, setPageTurn] = useState<"slide" | "curl">(
    initial.page_turn_style ?? "curl",
  );
  const [selPageId, setSelPageId] = useState<string | null>(
    () => initial.pages?.[0]?.id ?? null,
  );
  const [selItemId, setSelItemId] = useState<string | null>(null);
  const [selItemIds, setSelItemIds] = useState<string[]>([]);
  const [dragPageId, setDragPageId] = useState<string | null>(null);
  const [dragOverPageId, setDragOverPageId] = useState<string | null>(null);
  const selectCanvasItem = useCallback((id: string | null) => {
    setSelItemId(id);
  }, []);
  const [selPhaseId, setSelPhaseId] = useState<string | null>(null);
  const [animationsMenuOpen, setAnimationsMenuOpen] = useState(false);
  const [selectedAnimationRowId, setSelectedAnimationRowId] = useState<string | null>(null);
  const [animationEditor, setAnimationEditor] = useState<AnimationEditorState | null>(null);
  const [dragSummaryStepIdx, setDragSummaryStepIdx] = useState<number | null>(null);
  const [dragEditorStepIdx, setDragEditorStepIdx] = useState<number | null>(null);
  const [pageContentMenuOpen, setPageContentMenuOpen] = useState(false);
  const [phasePinned, setPhasePinned] = useState(false);
  const [objectPinned, setObjectPinned] = useState(false);
  const [pageContentPinned, setPageContentPinned] = useState(false);
  const [bgColorMenuOpen, setBgColorMenuOpen] = useState(false);
  const [bgVideoMenuOpen, setBgVideoMenuOpen] = useState(false);
  const [bgImageUrlMenuOpen, setBgImageUrlMenuOpen] = useState(false);
  const [bgVideoUploading, setBgVideoUploading] = useState(false);
  const [bgVideoErr, setBgVideoErr] = useState<string | null>(null);
  const [bgVideoLibraryOpen, setBgVideoLibraryOpen] = useState(false);
  const [bgVideoLibraryAssets, setBgVideoLibraryAssets] = useState<MediaAssetRow[]>([]);
  const [bgVideoLibraryQuery, setBgVideoLibraryQuery] = useState("");
  const [bgVideoLibraryLoading, setBgVideoLibraryLoading] = useState(false);
  const [bgVideoLibraryErr, setBgVideoLibraryErr] = useState<string | null>(null);
  const [pathEditItemId, setPathEditItemId] = useState<string | null>(null);
  const [pathEditMode, setPathEditMode] = useState<"set_start" | "draw">("set_start");
  const [pathDraftWaypoints, setPathDraftWaypoints] = useState<
    Array<{ x_percent: number; y_percent: number }>
  >([]);
  const [pathDraftDurationMs, setPathDraftDurationMs] = useState(2000);
  const [editorRightPanelPct, setEditorRightPanelPct] = useState(30);
  const [editorPanelResizing, setEditorPanelResizing] = useState<{
    startX: number;
    startPct: number;
  } | null>(null);
  const [triggerMenuCollapsedByItem, setTriggerMenuCollapsedByItem] = useState<
    Record<string, boolean>
  >({});
  const bgVideoFileRef = useRef<HTMLInputElement | null>(null);
  const editorSplitRef = useRef<HTMLDivElement | null>(null);
  const sceneCanvasRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const lastLocalSigRef = useRef<string>("");

  useEffect(() => {
    /* Reset form fields only when the server-backed row changes (syncKey), not when live preview payload updates. */
    const loadedPages =
      initial.pages?.length ?
        initial.pages.map((p) => ({
          ...p,
          items: p.items.map((i) => ({ ...i })),
        }))
      : [
          {
            id: "legacy-page",
            background_image_url: initial.image_url || undefined,
            image_fit: initial.image_fit ?? "cover",
            video_url: initial.video_url || undefined,
            body_text: initial.body_text,
            read_aloud_text: initial.read_aloud_text || undefined,
            items: [],
          },
        ];
    const incomingRaw = {
      type: "story" as const,
      image_url:
        loadedPages.length > 0 ?
          (loadedPages[0]?.background_image_url || initial.image_url || undefined)
        : (initial.image_url || undefined),
      image_fit:
        loadedPages.length > 0 ?
          (loadedPages[0]?.image_fit ?? initial.image_fit ?? "cover")
        : (initial.image_fit ?? "cover"),
      video_url:
        loadedPages.length > 0 ?
          (loadedPages[0]?.video_url || undefined)
        : (initial.video_url || undefined),
      body_text:
        loadedPages.length > 0 ? (loadedPages[0]?.body_text ?? initial.body_text) : initial.body_text,
      read_aloud_text:
        loadedPages.length > 0 ?
          (loadedPages[0]?.read_aloud_text ?? initial.read_aloud_text) || undefined
        : (initial.read_aloud_text || undefined),
      tts_lang: initial.tts_lang || undefined,
      guide:
        initial.guide?.tip_text || initial.guide?.image_url ?
          {
            tip_text: initial.guide?.tip_text || undefined,
            image_url: initial.guide?.image_url || undefined,
          }
        : undefined,
      pages: loadedPages.length > 0 ? loadedPages : undefined,
      page_turn_style: loadedPages.length > 0 ? (initial.page_turn_style ?? "curl") : undefined,
    };
    const incomingSig = stableStorySignature(storyPayloadSchema, incomingRaw);
    const active = document.activeElement as HTMLElement | null;
    const focusedInside = !!(active && rootRef.current?.contains(active));
    if (
      focusedInside &&
      lastLocalSigRef.current &&
      incomingSig !== lastLocalSigRef.current
    ) {
      return;
    }

    lastLocalSigRef.current = incomingSig;
    setImageUrl(initial.image_url ?? "");
    setImageFit(initial.image_fit ?? "cover");
    setVideoUrl(initial.video_url ?? "");
    setBody(initial.body_text);
    setRead(initial.read_aloud_text ?? "");
    setTts(initial.tts_lang ?? "en-US");
    setTip(initial.guide?.tip_text ?? "");
    setGuideImg(initial.guide?.image_url ?? "");
    setPages(loadedPages);
    setPageTurn(initial.page_turn_style ?? "curl");
    /* Keep page + item selection when the server save only bumps updated_at (same ids still present). */
    setSelPageId((prev) => {
      if (loadedPages.length === 0) return null;
      if (prev && loadedPages.some((p) => p.id === prev)) return prev;
      return loadedPages[0]?.id ?? null;
    });
    setSelItemId((prev) => {
      if (!prev || loadedPages.length === 0) return null;
      for (const p of loadedPages) {
        if (p.items.some((i) => i.id === prev)) return prev;
      }
      return null;
    });
    setSelItemIds((prev) => {
      const valid = new Set(loadedPages.flatMap((p) => p.items.map((i) => i.id)));
      return prev.filter((id) => valid.has(id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when syncKey (server row) changes; `initial` updates on every live bump and must not retrigger
  }, [syncKey]);

  const multi = pages.length > 0;
  const selectedPage = useMemo(
    () => pages.find((p) => p.id === selPageId) ?? pages[0] ?? null,
    [pages, selPageId],
  );

  const editorPhasesForPage = useMemo((): StoryPagePhase[] | null => {
    if (!selectedPage) return null;
    return getEditorPhases(selectedPage);
  }, [selectedPage]);

  const pageHasRealPhases = !!(
    selectedPage?.phases && selectedPage.phases.length > 0
  );

  const selectedPhase: StoryPagePhase | null = useMemo(() => {
    if (!editorPhasesForPage?.length) return null;
    const list = editorPhasesForPage;
    if (selPhaseId && list.some((p) => p.id === selPhaseId)) {
      return list.find((p) => p.id === selPhaseId) ?? null;
    }
    return list.find((p) => p.is_start) ?? list[0] ?? null;
  }, [editorPhasesForPage, selPhaseId]);

  useEffect(() => {
    if (!selectedPage) {
      setSelPhaseId(null);
      return;
    }
    const list = getEditorPhases(selectedPage);
    const start = list.find((p) => p.is_start)?.id ?? list[0]?.id;
    if (start) setSelPhaseId(start);
  }, [selectedPage?.id]);

  const emit = useCallback(
    (opts: {
      image_url: string;
      image_fit: "cover" | "contain";
      video_url: string;
      body_text: string;
      read_aloud_text: string;
      tts_lang: string;
      tip_text: string;
      guide_image: string;
      pages: StoryPage[];
      page_turn_style: "slide" | "curl";
    }) => {
      const pg = opts.pages.map(sanitizePageForPayload);
      const multiOn = pg.length > 0;
      const first = pg[0];
      const raw = {
        type: "story" as const,
        image_url:
          multiOn ? (first?.background_image_url || opts.image_url || undefined) : (opts.image_url || undefined),
        image_fit: multiOn ? (first?.image_fit ?? opts.image_fit) : opts.image_fit,
        video_url:
          multiOn ? (first?.video_url || undefined) : (opts.video_url || undefined),
        body_text: multiOn ? (first?.body_text ?? opts.body_text) : opts.body_text,
        read_aloud_text: multiOn
          ? (first?.read_aloud_text ?? opts.read_aloud_text) || undefined
          : opts.read_aloud_text || undefined,
        tts_lang: opts.tts_lang || undefined,
        guide:
          opts.tip_text || opts.guide_image
            ? {
                tip_text: opts.tip_text || undefined,
                image_url: opts.guide_image || undefined,
              }
            : undefined,
        pages: multiOn ? pg : undefined,
        page_turn_style: multiOn ? opts.page_turn_style : undefined,
      };
      emitLive(onLivePayload, storyPayloadSchema, raw);
      const sig = stableStorySignature(storyPayloadSchema, raw);
      lastLocalSigRef.current = sig;
      return sig;
    },
    [onLivePayload],
  );

  const pushEmit = useCallback(
    (nextPages: StoryPage[], overrides?: Partial<Parameters<typeof emit>[0]>) => {
      setPages(nextPages);
      emit({
        image_url,
        image_fit,
        video_url,
        body_text,
        read_aloud_text,
        tts_lang,
        tip_text,
        guide_image,
        pages: nextPages,
        page_turn_style: pageTurn,
        ...overrides,
      });
    },
    [
      body_text,
      emit,
      guide_image,
      image_url,
      image_fit,
      read_aloud_text,
      tip_text,
      tts_lang,
      video_url,
      pageTurn,
    ],
  );

  function startMultiFromLegacy() {
    const p: StoryPage = {
      id: newEntityId("page"),
      background_image_url: image_url || undefined,
      image_fit,
      video_url: video_url || undefined,
      body_text,
      read_aloud_text: read_aloud_text || undefined,
      items: [],
    };
    const next = [p];
    setSelPageId(p.id);
    pushEmit(next);
  }

  function addPage() {
    const p: StoryPage = {
      id: newEntityId("page"),
      image_fit,
      body_text: "",
      items: [],
    };
    const next = [...pages, p];
    setSelPageId(p.id);
    pushEmit(next);
  }

  function removePage(id: string) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Delete this page? This will remove its content and cannot be undone.",
      );
      if (!confirmed) return;
    }
    const next = pages.filter((p) => p.id !== id);
    if (selPageId === id) setSelPageId(next[0]?.id ?? null);
    pushEmit(next);
  }

  function reorderPages(fromId: string, toId: string) {
    const next = reorderById(pages, fromId, toId);
    if (next === pages) return;
    pushEmit(next);
  }

  function updatePage(pageId: string, patch: Partial<StoryPage>) {
    const next = pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p));
    pushEmit(next);
  }

  function updateCurrentPhaseById(phaseId: string, patch: Partial<StoryPagePhase>) {
    if (!selectedPage?.phases?.length) return;
    const next = pages.map((p) => {
      if (p.id !== selectedPage.id) return p;
      return {
        ...p,
        phases: p.phases!.map((ph) =>
          ph.id === phaseId ? { ...ph, ...patch } : ph,
        ),
      };
    });
    pushEmit(next);
  }

  function setStartPhase(phaseId: string) {
    if (!selectedPage?.phases?.length) return;
    const next = pages.map((p) => {
      if (p.id !== selectedPage.id) return p;
      return {
        ...p,
        phases: p.phases!.map((ph) => ({
          ...ph,
          is_start: ph.id === phaseId,
        })),
      };
    });
    pushEmit(next);
  }

  function addStoryPhase() {
    if (!selectedPage) return;
    if (isEditorVirtualPhases(selectedPage)) {
      const ph = createTwoInitialPhases();
      const next = pages.map((p) =>
        p.id === selectedPage.id ? { ...p, phases: ph } : p,
      );
      setSelPhaseId(ph[0]!.id);
      pushEmit(next);
      return;
    }
    const cur = selectedPage.phases ?? [];
    const ids = selectedPage.items.map((i) => i.id);
    const nextPh = appendPhase(cur, ids);
    const next = pages.map((p) =>
      p.id === selectedPage.id ? { ...p, phases: nextPh } : p,
    );
    setSelPhaseId(nextPh[nextPh.length - 1]!.id);
    pushEmit(next);
  }

  function removeStoryPhase(phaseId: string) {
    if (!selectedPage?.phases?.length) return;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Delete this phase? Phase settings and flow links for this step will be removed.",
      );
      if (!confirmed) return;
    }
    const cur = selectedPage.phases;
    const idx = cur.findIndex((p) => p.id === phaseId);
    if (idx < 0) return;
    const after = removePhaseAt(cur, idx);
    const next = pages.map((p) => {
      if (p.id !== selectedPage.id) return p;
      if (after.length === 0) {
        return { ...p, phases: undefined };
      }
      return { ...p, phases: after };
    });
    const updated =
      next.find((p) => p.id === selectedPage.id) ?? selectedPage;
    const listForUi =
      updated.phases?.length ? updated.phases : getEditorPhases(updated);
    setSelPhaseId(
      listForUi.find((x) => x.is_start)?.id ?? listForUi[0]?.id ?? null,
    );
    pushEmit(next);
  }

  const selectedItem = selectedPage?.items.find((i) => i.id === selItemId) ?? null;
  const pathEditingItem =
    pathEditItemId && selectedPage ? selectedPage.items.find((i) => i.id === pathEditItemId) ?? null : null;
  const pathEditActive = !!pathEditingItem;

  const beginPathEdit = useCallback(() => {
    if (!selectedPage || !selectedItem) return;
    setPathEditItemId(selectedItem.id);
    setPathEditMode("set_start");
    setPathDraftWaypoints(selectedItem.path?.waypoints ?? []);
    setPathDraftDurationMs(selectedItem.path?.duration_ms ?? 2000);
  }, [selectedItem, selectedPage]);

  const cancelPathEdit = useCallback(() => {
    setPathEditItemId(null);
    setPathEditMode("set_start");
    setPathDraftWaypoints([]);
  }, []);

  const commitPathEdit = useCallback(() => {
    if (!selectedPage || !pathEditingItem) return;
    const nextPath =
      pathDraftWaypoints.length >= 2 ?
        { waypoints: pathDraftWaypoints, duration_ms: Math.max(0, pathDraftDurationMs) }
      : undefined;
    const next = pages.map((p) =>
      p.id === selectedPage.id ?
        {
          ...p,
          items: p.items.map((it) =>
            it.id === pathEditingItem.id ? { ...it, path: nextPath } : it,
          ),
        }
      : p,
    );
    pushEmit(next);
    setPathEditItemId(null);
    setPathEditMode("set_start");
    setPathDraftWaypoints([]);
  }, [pages, pathDraftDurationMs, pathDraftWaypoints, pathEditingItem, pushEmit, selectedPage]);

  const triggerMenuCollapsed = selectedItem ? !!triggerMenuCollapsedByItem[selectedItem.id] : false;
  const pageTriggerOptions = useMemo(() => {
    if (!selectedPage) return [];
    return selectedPage.items.flatMap((it) =>
      (it.on_click?.triggers ?? []).map((tr, idx) => ({
        id: tr.trigger_id ?? `${it.id}:${idx}`,
        label: triggerDisplayLabel(it, tr, idx),
      })),
    );
  }, [selectedPage]);
  const triggerMenuPos =
    selectedItem ?
      {
        leftPercent: Math.max(
          1,
          Math.min(78, selectedItem.x_percent + selectedItem.w_percent + 1.2),
        ),
        topPercent: Math.max(1, Math.min(82, selectedItem.y_percent)),
      }
    : null;
  const showAnimationsPanel = !!selectedPage && animationsMenuOpen;
  const showPageContentPanel =
    !!selectedPage && (pageContentPinned || (pageContentMenuOpen && !animationsMenuOpen));
  const showObjectPanel =
    !!selectedPage && (objectPinned || (!!selectedItem && !pageContentMenuOpen && !animationsMenuOpen));
  const showPhasePanel =
    !!selectedPage && (phasePinned || (!selectedItem && !pageContentMenuOpen && !animationsMenuOpen));
  const visibleEditorPanels = [
    showAnimationsPanel,
    showPageContentPanel,
    showObjectPanel,
    showPhasePanel,
  ].filter(Boolean).length;

  const animationRows = useMemo<AnimationRow[]>(() => {
    if (!selectedPage) return [];
    const itemNameById = new Map(selectedPage.items.map((it) => [it.id, itemDisplayLabel(it)]));
    const rows: AnimationRow[] = [];
    const pushRows = (
      sequences: StoryActionSequence[],
      scope: AnimationRow["scope"],
      scopeId: string,
      ownerItemId?: string,
      ownerItemLabel?: string,
      phaseLabel?: string,
    ) => {
      for (const seq of sequences) {
        const targets = new Set<string>();
        for (const step of seq.steps) {
          if (step.target_item_id) targets.add(step.target_item_id);
          else if (ownerItemId) targets.add(ownerItemId);
        }
        const targetNames = [...targets].map((id) => itemNameById.get(id) ?? id);
        const trigger =
          seq.event === "click" ? `Click on ${ownerItemLabel ?? "item"}`
          : seq.event === "phase_enter" ? `Phase start${phaseLabel ? ` · ${phaseLabel}` : ""}`
          : "Page start";
        rows.push({
          id: `${scope}:${scopeId}:${seq.id}`,
          name: seq.name?.trim() || seq.id,
          trigger,
          impacted: targetNames.length > 0 ? targetNames.join(", ") : "—",
          sequence: seq,
          scope,
          scopeId,
        });
      }
    };

    if (selectedItem) {
      pushRows(
        getItemClickActionSequences(selectedItem, {
          includeLegacy: true,
          activePhaseId: selectedPhase?.id ?? null,
        }),
        "item",
        selectedItem.id,
        selectedItem.id,
        itemDisplayLabel(selectedItem),
      );
      const phasesForPanel =
        selectedPhase ? [selectedPhase] : (selectedPage.phases ?? []);
      for (const phase of phasesForPanel) {
        const phaseSeq = getPhaseEnterActionSequences(phase, { includeLegacy: true }).filter(
          (seq) =>
            seq.steps.some((step) => step.target_item_id === selectedItem.id),
        );
        pushRows(
          phaseSeq,
          "phase",
          phase.id,
          undefined,
          undefined,
          phase.name?.trim() || phase.id,
        );
      }
      const pageSeq = getPageEnterActionSequences(selectedPage, { includeLegacy: true }).filter((seq) =>
        seq.steps.some((step) => step.target_item_id === selectedItem.id),
      );
      pushRows(pageSeq, "page", selectedPage.id);
      return rows;
    }

    pushRows(getPageEnterActionSequences(selectedPage, { includeLegacy: true }), "page", selectedPage.id);
    if (selectedPhase) {
      pushRows(
        getPhaseEnterActionSequences(selectedPhase, { includeLegacy: true }),
        "phase",
        selectedPhase.id,
        undefined,
        undefined,
        selectedPhase.name?.trim() || selectedPhase.id,
      );
    }
    return rows;
  }, [selectedPage, selectedPhase, selectedItem]);

  useEffect(() => {
    if (animationRows.length === 0) {
      setSelectedAnimationRowId(null);
      return;
    }
    setSelectedAnimationRowId((prev) =>
      prev && animationRows.some((row) => row.id === prev) ? prev : animationRows[0]!.id,
    );
  }, [animationRows]);

  const selectedAnimationRow =
    animationRows.find((row) => row.id === selectedAnimationRowId) ?? null;

  const updateSequenceInScope = useCallback(
    (scope: AnimationRow["scope"], scopeId: string, updater: (list: StoryActionSequence[]) => StoryActionSequence[]) => {
      if (!selectedPage) return;
      const next = pages.map((p) => {
        if (p.id !== selectedPage.id) return p;
        if (scope === "page") {
          return { ...p, action_sequences: updater(p.action_sequences ?? []) };
        }
        if (scope === "phase") {
          return {
            ...p,
            phases: (p.phases ?? []).map((ph) =>
              ph.id === scopeId ? { ...ph, action_sequences: updater(ph.action_sequences ?? []) } : ph,
            ),
          };
        }
        return {
          ...p,
          items: p.items.map((it) =>
            it.id === scopeId ? { ...it, action_sequences: updater(it.action_sequences ?? []) } : it,
          ),
        };
      });
      pushEmit(next);
    },
    [pages, pushEmit, selectedPage],
  );

  const startAnimationEditor = useCallback((row: AnimationRow) => {
    setAnimationEditor({
      rowId: row.id,
      scope: row.scope,
      scopeId: row.scopeId,
      trigger: row.trigger,
      isLegacy: row.sequence.id.startsWith("legacy:"),
      sequence: {
        ...row.sequence,
        steps: row.sequence.steps.map((s) => ({
          ...s,
          smart_line_lines: s.smart_line_lines?.map((line) => ({ ...line })),
        })),
      },
    });
  }, []);

  const addAnimationSequence = useCallback(() => {
    if (!selectedPage) return;
    if (selectedItem) {
      const seq: StoryActionSequence = {
        id: newEntityId("aseq"),
        name: `Click ${itemDisplayLabel(selectedItem)}`,
        event: "click",
        active_phase_ids:
          selectedPhase && selectedPage.phases?.some((ph) => ph.id === selectedPhase.id) ?
            [selectedPhase.id]
          : undefined,
        steps: [
          {
            id: newEntityId("astep"),
            kind: "emphasis",
            target_item_id: selectedItem.id,
            timing: "simultaneous",
          },
        ],
      };
      const next = pages.map((p) =>
        p.id === selectedPage.id ?
          {
            ...p,
            items: p.items.map((it) =>
              it.id === selectedItem.id ?
                { ...it, action_sequences: [...(it.action_sequences ?? []), seq] }
              : it,
            ),
          }
        : p,
      );
      pushEmit(next);
      setSelectedAnimationRowId(`item:${selectedItem.id}:${seq.id}`);
      return;
    }
    if (selectedPhase && selectedPage.phases?.some((ph) => ph.id === selectedPhase.id)) {
      const defaultTarget = selectedPage.items[0]?.id;
      const seq: StoryActionSequence = {
        id: newEntityId("aseq"),
        name: `Phase start ${selectedPhase.name?.trim() || selectedPhase.id}`,
        event: "phase_enter",
        steps:
          defaultTarget ?
            [{
              id: newEntityId("astep"),
              kind: "emphasis",
              target_item_id: defaultTarget,
              timing: "simultaneous",
            }]
          : [],
      };
      const next = pages.map((p) =>
        p.id === selectedPage.id ?
          {
            ...p,
            phases: (p.phases ?? []).map((ph) =>
              ph.id === selectedPhase.id ?
                { ...ph, action_sequences: [...(ph.action_sequences ?? []), seq] }
              : ph,
            ),
          }
        : p,
      );
      pushEmit(next);
      setSelectedAnimationRowId(`phase:${selectedPhase.id}:${seq.id}`);
      return;
    }
    const seq: StoryActionSequence = {
      id: newEntityId("aseq"),
      name: "Page start animation",
      event: "page_enter",
      steps:
        selectedPage.items[0] ?
          [{
            id: newEntityId("astep"),
            kind: "emphasis",
            target_item_id: selectedPage.items[0].id,
            timing: "simultaneous",
          }]
        : [],
    };
    updatePage(selectedPage.id, {
      action_sequences: [...(selectedPage.action_sequences ?? []), seq],
    });
    setSelectedAnimationRowId(`page:${selectedPage.id}:${seq.id}`);
  }, [pages, pushEmit, selectedItem, selectedPage, selectedPhase]);

  const updateAnimationEditorSequence = useCallback(
    (patcher: (seq: StoryActionSequence) => StoryActionSequence) => {
      setAnimationEditor((prev) => (prev ? { ...prev, sequence: patcher(prev.sequence) } : prev));
    },
    [],
  );

  const saveAnimationEditor = useCallback(() => {
    if (!animationEditor) return;
    const isLegacy = animationEditor.isLegacy || animationEditor.sequence.id.startsWith("legacy:");
    const normalizeStep = (step: StoryActionStep): StoryActionStep => {
      if (step.kind !== "smart_line") {
        return { ...step, smart_line_lines: undefined };
      }
      return {
        ...step,
        smart_line_lines:
          step.smart_line_lines && step.smart_line_lines.length > 0 ?
            step.smart_line_lines
          : [{ id: newEntityId("line"), priority: 100 }],
      };
    };
    const prepared: StoryActionSequence =
      isLegacy ?
        {
          ...animationEditor.sequence,
          id: newEntityId("aseq"),
          steps: animationEditor.sequence.steps.map((step) => ({
            ...normalizeStep(step),
            id: newEntityId("astep"),
          })),
        }
      : {
          ...animationEditor.sequence,
          steps: animationEditor.sequence.steps.map((step) => normalizeStep(step)),
        };

    if (isLegacy) {
      if (!selectedPage) return;
      const next = pages.map((p) => {
        if (p.id !== selectedPage.id) return p;
        if (animationEditor.scope === "item") {
          return {
            ...p,
            items: p.items.map((it) => {
              if (it.id !== animationEditor.scopeId) return it;
              const cleaned = stripLegacyAnimationFields(it);
              return {
                ...cleaned,
                action_sequences: [...(cleaned.action_sequences ?? []), prepared],
              };
            }),
          };
        }
        if (animationEditor.scope === "phase") {
          return {
            ...p,
            phases: (p.phases ?? []).map((ph) => {
              if (ph.id !== animationEditor.scopeId) return ph;
              const cleaned = stripLegacyAnimationFields(ph);
              return {
                ...cleaned,
                action_sequences: [...(cleaned.action_sequences ?? []), prepared],
              };
            }),
          };
        }
        const cleaned = stripLegacyAnimationFields(p);
        return {
          ...cleaned,
          action_sequences: [...(cleaned.action_sequences ?? []), prepared],
        };
      });
      pushEmit(next);
    } else {
      updateSequenceInScope(animationEditor.scope, animationEditor.scopeId, (list) =>
        list.map((seq) => (seq.id === prepared.id ? prepared : seq)),
      );
    }
    const nextRowId = `${animationEditor.scope}:${animationEditor.scopeId}:${prepared.id}`;
    setSelectedAnimationRowId(nextRowId);
    setAnimationEditor(null);
  }, [animationEditor, pages, pushEmit, selectedPage, updateSequenceInScope]);

  const removeAnimationInEditor = useCallback(() => {
    if (!animationEditor) return;
    if (animationEditor.isLegacy || animationEditor.sequence.id.startsWith("legacy:")) {
      if (!selectedPage) return;
      const next = pages.map((p) => {
        if (p.id !== selectedPage.id) return p;
        if (animationEditor.scope === "item") {
          return {
            ...p,
            items: p.items.map((it) =>
              it.id === animationEditor.scopeId ? stripLegacyAnimationFields(it) : it,
            ),
          };
        }
        if (animationEditor.scope === "phase") {
          return {
            ...p,
            phases: (p.phases ?? []).map((ph) =>
              ph.id === animationEditor.scopeId ? stripLegacyAnimationFields(ph) : ph,
            ),
          };
        }
        return stripLegacyAnimationFields(p);
      });
      pushEmit(next);
      setAnimationEditor(null);
      return;
    }
    updateSequenceInScope(animationEditor.scope, animationEditor.scopeId, (list) =>
      list.filter((seq) => seq.id !== animationEditor.sequence.id),
    );
    setAnimationEditor(null);
  }, [animationEditor, pages, pushEmit, selectedPage, updateSequenceInScope]);

  const resolveAnimationStepTargetItemId = useCallback(
    (step: StoryActionStep): string | null => {
      if (step.target_item_id) return step.target_item_id;
      if (animationEditor?.scope === "item") return animationEditor.scopeId;
      return null;
    },
    [animationEditor],
  );

  const moveStepHasPath = useCallback(
    (step: StoryActionStep): boolean => {
      if (!selectedPage) return false;
      const targetId = resolveAnimationStepTargetItemId(step);
      if (!targetId) return false;
      const target = selectedPage.items.find((it) => it.id === targetId);
      return !!(target?.path?.waypoints && target.path.waypoints.length >= 2);
    },
    [resolveAnimationStepTargetItemId, selectedPage],
  );

  const reorderAnimationSequenceSteps = useCallback(
    (
      row: AnimationRow,
      fromIdx: number,
      toIdx: number,
    ) => {
      if (row.sequence.id.startsWith("legacy:")) return;
      updateSequenceInScope(row.scope, row.scopeId, (list) =>
        list.map((seq) =>
          seq.id === row.sequence.id ? { ...seq, steps: reorderByIndex(seq.steps ?? [], fromIdx, toIdx) } : seq,
        ),
      );
    },
    [updateSequenceInScope],
  );

  useEffect(() => {
    if (!bgVideoLibraryOpen) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setBgVideoLibraryLoading(true);
      setBgVideoLibraryErr(null);
      searchTeacherMedia({
        kind: "video",
        q: bgVideoLibraryQuery.trim(),
        limit: 1000,
      })
        .then((rows) => {
          if (!cancelled) setBgVideoLibraryAssets(rows);
        })
        .catch((e: unknown) => {
          if (!cancelled) {
            setBgVideoLibraryErr(e instanceof Error ? e.message : "Failed to load video library");
          }
        })
        .finally(() => {
          if (!cancelled) setBgVideoLibraryLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [bgVideoLibraryOpen, bgVideoLibraryQuery]);

  useEffect(() => {
    if (!pathEditItemId) return;
    if (!selectedPage || !selectedPage.items.some((it) => it.id === pathEditItemId)) {
      setPathEditItemId(null);
      setPathDraftWaypoints([]);
    }
  }, [pathEditItemId, selectedPage]);

  async function onBackgroundVideoFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !selectedPage) return;
    setBgVideoErr(null);
    setBgVideoUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", f);
      const r = await uploadTeacherMedia(fd, "video");
      updatePage(selectedPage.id, { video_url: r.url });
    } catch (err) {
      setBgVideoErr(err instanceof Error ? err.message : "Video upload failed");
    } finally {
      setBgVideoUploading(false);
    }
  }

  useEffect(() => {
    if (!editorPanelResizing) return;
    const onMove = (e: PointerEvent) => {
      const w = editorSplitRef.current?.getBoundingClientRect().width ?? 0;
      if (w <= 0) return;
      const dPct = ((e.clientX - editorPanelResizing.startX) / w) * 100;
      setEditorRightPanelPct(clampPercentInput(editorPanelResizing.startPct - dPct, 22, 45));
    };
    const onUp = () => setEditorPanelResizing(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [editorPanelResizing]);

  return (
    <div ref={rootRef} className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded border border-neutral-200 bg-white p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={multi}
            disabled={busy}
            onChange={(e) => {
              if (e.target.checked) startMultiFromLegacy();
              else {
                setPages([]);
                setSelPageId(null);
                emit({
                  image_url,
                  image_fit,
                  video_url,
                  body_text,
                  read_aloud_text,
                  tts_lang,
                  tip_text,
                  guide_image,
                  pages: [],
                  page_turn_style: pageTurn,
                });
              }
            }}
          />
          Multi-page story book
        </label>
        {multi ? (
          <label className="text-sm">
            Page turn
            <select
              className="ml-2 rounded border px-2 py-1 text-sm"
              value={pageTurn}
              disabled={busy}
              onChange={(e) => {
                const v = e.target.value as "slide" | "curl";
                setPageTurn(v);
                emit({
                  image_url,
                  image_fit,
                  video_url,
                  body_text,
                  read_aloud_text,
                  tts_lang,
                  tip_text,
                  guide_image,
                  pages,
                  page_turn_style: v,
                });
              }}
            >
              <option value="curl">Book curl</option>
              <option value="slide">Slide</option>
            </select>
          </label>
        ) : null}
      </div>

      {multi && selectedPage ? (
        <div className="relative space-y-4 overflow-visible rounded border border-sky-200 bg-sky-50 px-4 pb-4 pt-0">
          <div className="sticky top-16 z-30 -mx-4 mb-0 border-b border-sky-200/70 bg-sky-50 px-4 py-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-1">
            {pages.map((p, i) => (
              <button
                key={p.id}
                type="button"
                draggable={!busy}
                disabled={busy}
                onDragStart={(e) => {
                  if (busy) return;
                  setDragPageId(p.id);
                  setDragOverPageId(p.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", p.id);
                }}
                onDragOver={(e) => {
                  if (busy || !dragPageId) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverPageId !== p.id) setDragOverPageId(p.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (busy || !dragPageId) return;
                  reorderPages(dragPageId, p.id);
                  setDragPageId(null);
                  setDragOverPageId(null);
                }}
                onDragEnd={() => {
                  setDragPageId(null);
                  setDragOverPageId(null);
                }}
                onClick={() => {
                  setSelPageId(p.id);
                  setSelItemId(null);
                }}
                className={`rounded-t-md border px-3 py-1 text-xs leading-tight transition-colors ${
                  p.id === selectedPage.id
                    ? "border-sky-500 bg-white font-semibold text-sky-900 shadow-sm"
                    : "border-transparent bg-sky-100/40 text-neutral-700 hover:border-sky-200 hover:bg-white/70"
                } ${
                  dragPageId === p.id
                    ? "cursor-grabbing opacity-70"
                    : "cursor-grab"
                } ${
                  dragOverPageId === p.id && dragPageId && dragPageId !== p.id
                    ? "ring-2 ring-sky-400 ring-offset-1"
                    : ""
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              disabled={busy}
                className="rounded-t-md border border-dashed border-sky-300 bg-sky-100/30 px-3 py-1 text-xs leading-tight text-sky-900 transition-colors hover:bg-white/70"
              onClick={addPage}
            >
              +Pg
            </button>
            {pages.length > 1 ? (
              <button
                type="button"
                disabled={busy}
                className="rounded-t-md border border-transparent bg-sky-100/30 px-3 py-1 text-xs font-semibold leading-tight text-red-700 transition-colors hover:border-red-200 hover:bg-white/80"
                onClick={() => removePage(selectedPage.id)}
                title="Remove selected page"
              >
                Del
              </button>
            ) : null}
              <span className="mx-1 h-5 w-px bg-violet-200" />
              {(editorPhasesForPage ?? []).map((ph, i) => (
                <div key={ph.id} className="flex items-stretch">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setSelPhaseId(ph.id);
                      setSelItemId(null);
                    }}
                    className={`rounded-l-md border px-2 py-1 text-xs leading-tight transition-colors ${
                      ph.id === (selectedPhase?.id ?? STORY_EDITOR_VIRTUAL_PHASE_ID)
                        ? "border-violet-500 bg-violet-100 font-semibold text-violet-950"
                        : "border-violet-200 bg-violet-50/50 text-violet-900 hover:bg-violet-100"
                    }`}
                    title={`Phase ${i + 1}`}
                  >
                    {i + 1}
                  </button>
                  {(editorPhasesForPage?.length ?? 0) > 1 ? (
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-r-md border border-l-0 border-violet-200 bg-violet-50 px-1 text-[10px] font-bold text-violet-800 hover:bg-violet-100"
                      title="Remove phase"
                      onClick={() => removeStoryPhase(ph.id)}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                disabled={busy}
                className="rounded-md border border-dashed border-violet-400 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-900 hover:bg-violet-100"
                onClick={addStoryPhase}
              >
                +Ph
              </button>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setAnimationsMenuOpen((v) => !v)}
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold leading-tight transition-colors ${
                    animationsMenuOpen
                      ? "border-fuchsia-500 bg-fuchsia-100 text-fuchsia-950 hover:bg-fuchsia-200"
                      : "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-900 hover:bg-fuchsia-100"
                  }`}
                  title={animationsMenuOpen ? "Close animations controls" : "Open animations controls"}
                >
                  🎬 Animations
                </button>
                <button
                  type="button"
                  onClick={() => setPageContentMenuOpen((v) => !v)}
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold leading-tight transition-colors ${
                    pageContentMenuOpen
                      ? "border-amber-500 bg-amber-100 text-amber-950 hover:bg-amber-200"
                      : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                  }`}
                  title={pageContentMenuOpen ? "Close page content controls" : "Open page content controls"}
                >
                  🚩 Page content
                </button>
              </div>
            </div>
          </div>

          <div className="relative mt-2 overflow-visible">
          <div ref={editorSplitRef} className="mt-1 min-h-0 items-stretch gap-3 md:flex">
            <div className="min-w-0 space-y-4 md:min-w-0 md:flex-1">
          <div className="rounded border border-neutral-200 bg-white p-3">
            <p className="mb-0.5 text-sm font-semibold">Scene Editor</p>
            <p className="mb-2 text-[11px] text-neutral-500">
              <strong>Resize</strong> (sky corner) changes the object box on the page. Item image uses a
              simple scale value only.
            </p>
            {(selectedPage.background_image_url ?? image_url) ? (
              <div ref={sceneCanvasRef} className="relative w-full" style={{ containerType: "inline-size" }}>
                <RectRegionEditor
                  imageUrl={(selectedPage.background_image_url ?? image_url)!}
                  imageFit={selectedPage.image_fit ?? image_fit}
                  stageAspectRatio="16 / 10"
                  cropXPercent={0}
                  cropYPercent={0}
                  cropZoomPercent={100}
                  regions={selectedPage.items.map(storyItemToRect)}
                  onRegionsChange={(regs) => {
                    const map = new Map(selectedPage.items.map((i) => [i.id, i]));
                    const nextIdSet = new Set(regs.map((r) => r.id));
                    const removedIds = new Set(
                      selectedPage.items
                        .map((i) => i.id)
                        .filter((id) => !nextIdSet.has(id)),
                    );
                    const fallback =
                      "https://placehold.co/120x80/f1f5f9/334155?text=Item";
                    const nextItems = regs.map((r) => {
                      const prev = map.get(r.id);
                      const nextItem = rectToStoryItem(r, prev, fallback);
                      if ((prev?.kind ?? "image") !== "text") return nextItem;
                      const prevW = prev?.w_percent ?? 0;
                      const prevH = prev?.h_percent ?? 0;
                      if (prevW <= 0 || prevH <= 0) return nextItem;
                      const wRatio = r.w_percent / prevW;
                      const hRatio = r.h_percent / prevH;
                      if (!Number.isFinite(wRatio) || !Number.isFinite(hRatio)) return nextItem;
                      const sizeChanged = Math.abs(wRatio - 1) > 0.01 || Math.abs(hRatio - 1) > 0.01;
                      if (!sizeChanged) return nextItem;
                      // Corner scale keeps aspect ratio; horizontal-only resize should not change font size.
                      const proportional = Math.abs(wRatio - hRatio) <= 0.12;
                      if (!proportional) return nextItem;
                      const baseSize = prev?.text_size_px ?? 24;
                      const scale = Math.max(0.25, (wRatio + hRatio) / 2);
                      return {
                        ...nextItem,
                        text_size_px: Math.min(128, Math.max(10, Math.round(baseSize * scale))),
                      };
                    });
                    if (pathEditActive && pathEditMode === "draw" && pathEditingItem) {
                      const moved = regs.find((r) => r.id === pathEditingItem.id);
                      if (moved) {
                        setPathDraftWaypoints((prev) => {
                          if (prev.length === 0) {
                            return [{ x_percent: moved.x_percent, y_percent: moved.y_percent }];
                          }
                          const last = prev[prev.length - 1]!;
                          const dx = moved.x_percent - last.x_percent;
                          const dy = moved.y_percent - last.y_percent;
                          if (Math.hypot(dx, dy) < 0.35) return prev;
                          return [...prev, { x_percent: moved.x_percent, y_percent: moved.y_percent }];
                        });
                      }
                    }
                    const next = pages.map((p) =>
                      p.id === selectedPage.id ?
                        pruneDeletedItemReferences({ ...p, items: nextItems }, removedIds)
                      : p,
                    );
                    pushEmit(next);
                  }}
                  selectedId={selItemId}
                  onSelect={selectCanvasItem}
                  selectedIds={selItemIds}
                  onSelectedIdsChange={(ids) => {
                    setSelItemIds(ids);
                    setSelItemId(ids[0] ?? null);
                  }}
                  disabled={busy}
                  showHorizontalResizeHandle={(r) => {
                    const it = selectedPage.items.find((x) => x.id === r.id);
                    return (it?.kind ?? "image") === "text";
                  }}
                  renderRegion={(r) => {
                    const it = selectedPage.items.find((x) => x.id === r.id);
                    if (!it) return null;
                    if ((it.kind ?? "image") === "text") {
                      return (
                        <div
                          className="flex h-full w-full items-center justify-center px-2 text-center font-semibold whitespace-pre-wrap break-words"
                          style={{
                            color: it.text_color ?? "#0f172a",
                            fontSize: `calc(${it.text_size_px ?? 24} * 100cqw / 960)`,
                            fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
                            lineHeight: 1.2,
                          }}
                        >
                          {it.text?.trim() || "Text"}
                        </div>
                      );
                    }
                    const src = it.image_url;
                    if (!src) return null;
                    const dim =
                      !!selectedPhase &&
                      !isItemVisibleInEditorPhase(
                        selectedPhase,
                        it,
                        pageHasRealPhases,
                      );
                    return (
                      <ScaledStoryItemImage
                        imageUrl={src}
                        imageScale={it?.image_scale ?? 1}
                        dimmed={dim}
                        title={dim ? "Hidden in this phase (see right panel)" : undefined}
                      />
                    );
                  }}
                />
                {pathEditActive ? (
                  <div className="pointer-events-none absolute inset-0 z-10">
                    <svg className="pointer-events-none absolute inset-0 h-full w-full">
                      {pathDraftWaypoints.length >= 2 ? (
                        <polyline
                          points={pathDraftWaypoints
                            .map((p) => `${p.x_percent}% ${p.y_percent}%`)
                            .join(" ")}
                          fill="none"
                          stroke="rgb(217 70 239)"
                          strokeWidth={2}
                          strokeDasharray="6 4"
                        />
                      ) : null}
                    </svg>
                    <div className="pointer-events-auto absolute left-2 top-2 rounded-md border border-fuchsia-300 bg-white/95 p-2 text-xs shadow">
                      <p className="font-semibold text-fuchsia-900">
                        Set move path · {itemDisplayLabel(pathEditingItem)}
                      </p>
                      <p className="mt-0.5 text-neutral-700">
                        {pathEditMode === "set_start" ?
                          "Step 1: Position the object, then click Confirm start position."
                        : "Step 2: Drag the actual object on canvas to trace the path, then click Save path."}
                      </p>
                      <label className="mt-2 block text-[11px] text-neutral-700">
                        Duration (ms)
                        <input
                          type="number"
                          min={0}
                          max={120000}
                          step={50}
                          className="mt-1 w-full rounded border px-1 py-0.5 text-xs"
                          value={pathDraftDurationMs}
                          onChange={(e) => setPathDraftDurationMs(Math.max(0, Number(e.target.value) || 0))}
                        />
                      </label>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!pathEditingItem) return;
                            const start = {
                              x_percent: pathEditingItem.x_percent,
                              y_percent: pathEditingItem.y_percent,
                            };
                            setPathDraftWaypoints([start]);
                            setPathEditMode("draw");
                          }}
                          disabled={pathEditMode === "draw"}
                          className="rounded border border-fuchsia-400 bg-fuchsia-100 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-900 enabled:hover:bg-fuchsia-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Confirm start position
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPathDraftWaypoints((prev) => prev.slice(0, -1));
                          }}
                          className="rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-800 hover:bg-neutral-100"
                        >
                          Undo
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const start = pathDraftWaypoints[0];
                            setPathDraftWaypoints(start ? [start] : []);
                          }}
                          className="rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-800 hover:bg-neutral-100"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelPathEdit();
                          }}
                          className="rounded border border-red-300 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            commitPathEdit();
                          }}
                          disabled={pathEditMode !== "draw" || pathDraftWaypoints.length < 2}
                          className="rounded border border-fuchsia-400 bg-fuchsia-100 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-900 enabled:hover:bg-fuchsia-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Save path
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
                {selectedItem && triggerMenuPos && !pathEditActive ? (
                  <div className="pointer-events-none absolute inset-0 z-20">
                    <div
                      className="pointer-events-auto absolute flex flex-col items-end gap-1"
                      style={{
                        left: `${triggerMenuPos.leftPercent}%`,
                        top: `${triggerMenuPos.topPercent}%`,
                      }}
                    >
                    <div
                      className={`pointer-events-auto rounded-lg border border-sky-300 bg-white/95 shadow-lg backdrop-blur-sm ${
                        triggerMenuCollapsed ? "w-9 p-1.5" : "w-[20rem] max-w-[94%] space-y-2 p-3"
                      }`}
                    >
                      {triggerMenuCollapsed ? (
                        <button
                          type="button"
                          aria-label="Expand trigger menu"
                          className="flex h-6 w-6 items-center justify-center rounded border border-sky-500 bg-white text-sm font-bold text-sky-800"
                          onClick={() =>
                            setTriggerMenuCollapsedByItem((prev) => ({
                              ...prev,
                              [selectedItem.id]: false,
                            }))
                          }
                        >
                          +
                        </button>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-sky-900">
                              Trigger menu for {itemDisplayLabel(selectedItem)}
                            </p>
                            <button
                              type="button"
                              className="rounded border border-sky-300 px-1.5 py-0.5 text-[10px] text-sky-900"
                              onClick={() =>
                                setTriggerMenuCollapsedByItem((prev) => ({
                                  ...prev,
                                  [selectedItem.id]: true,
                                }))
                              }
                            >
                              Minimize
                            </button>
                          </div>
                          <p className="text-[11px] text-neutral-600">
                            Configure what happens when this item is clicked.
                          </p>
                          <ul className="max-h-56 space-y-2 overflow-auto pr-1">
                            {(selectedItem.on_click?.triggers ?? []).map((tr, ti) => (
                              <li
                                key={`tap-pop-${selectedItem.id}-${ti}`}
                                className="space-y-1 rounded border border-neutral-200 bg-white p-2"
                              >
                                <div className="flex flex-wrap items-center gap-1">
                                  <select
                                    className="rounded border px-1 text-xs"
                                    value={tr.action}
                                    onChange={(e) => {
                                      const action = e.target.value as StoryClickAction["action"];
                                      const nextTriggers = (selectedItem.on_click?.triggers ?? []).map(
                                        (x, i) =>
                                          i === ti ?
                                            {
                                              trigger_id: x.trigger_id ?? newEntityId("taptr"),
                                              action,
                                              trigger_timing: x.trigger_timing ?? "simultaneous",
                                              item_id:
                                                action === "play_sound" ? undefined : x.item_id,
                                              sound_url:
                                                action === "play_sound" ? x.sound_url : undefined,
                                              play_once: x.play_once,
                                              duration_ms: x.duration_ms,
                                              after_trigger_id:
                                                x.trigger_timing === "after_previous" ?
                                                  x.after_trigger_id
                                                : undefined,
                                              emphasis_preset:
                                                action === "emphasis" ?
                                                  (x.emphasis_preset ?? "grow")
                                                : undefined,
                                            }
                                          : x,
                                      );
                                      const next = pages.map((p) =>
                                        p.id === selectedPage.id ?
                                          {
                                            ...p,
                                            items: p.items.map((it) =>
                                              it.id === selectedItem.id ?
                                                {
                                                  ...it,
                                                  on_click: { ...it.on_click, triggers: nextTriggers },
                                                }
                                              : it,
                                            ),
                                          }
                                        : p,
                                      );
                                      pushEmit(next);
                                    }}
                                  >
                                    {TAP_ACTIONS.map((a) => (
                                      <option key={a} value={a}>
                                        {a}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    className="rounded border px-1 text-xs"
                                    value={tr.trigger_timing ?? "simultaneous"}
                                    onChange={(e) => {
                                      const trigger_timing =
                                        e.target.value as NonNullable<
                                          StoryClickAction["trigger_timing"]
                                        >;
                                      const nextTriggers = (selectedItem.on_click?.triggers ?? []).map(
                                        (x, i) => (i === ti ? { ...x, trigger_timing } : x),
                                      );
                                      const next = pages.map((p) =>
                                        p.id === selectedPage.id ?
                                          {
                                            ...p,
                                            items: p.items.map((it) =>
                                              it.id === selectedItem.id ?
                                                {
                                                  ...it,
                                                  on_click: { ...it.on_click, triggers: nextTriggers },
                                                }
                                              : it,
                                            ),
                                          }
                                        : p,
                                      );
                                      pushEmit(next);
                                    }}
                                  >
                                    {TAP_TIMINGS.map((m) => (
                                      <option key={m} value={m}>
                                        {m}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    className="text-xs text-red-700"
                                    onClick={() => {
                                      const nextTriggers = (selectedItem.on_click?.triggers ?? []).filter(
                                        (_, i) => i !== ti,
                                      );
                                      const next = pages.map((p) =>
                                        p.id === selectedPage.id ?
                                          {
                                            ...p,
                                            items: p.items.map((it) =>
                                              it.id === selectedItem.id ?
                                                {
                                                  ...it,
                                                  on_click: {
                                                    ...it.on_click,
                                                    triggers:
                                                      nextTriggers.length > 0 ? nextTriggers : undefined,
                                                  },
                                                }
                                              : it,
                                            ),
                                          }
                                        : p,
                                      );
                                      pushEmit(next);
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                                {tr.action !== "play_sound" ? (
                                  <select
                                    className="w-full rounded border px-1 text-xs"
                                    value={tr.item_id ?? ""}
                                    onChange={(e) => {
                                      const item_id = e.target.value || undefined;
                                      const nextTriggers = (selectedItem.on_click?.triggers ?? []).map(
                                        (x, i) => (i === ti ? { ...x, item_id } : x),
                                      );
                                      const next = pages.map((p) =>
                                        p.id === selectedPage.id ?
                                          {
                                            ...p,
                                            items: p.items.map((it) =>
                                              it.id === selectedItem.id ?
                                                {
                                                  ...it,
                                                  on_click: { ...it.on_click, triggers: nextTriggers },
                                                }
                                              : it,
                                            ),
                                          }
                                        : p,
                                      );
                                      pushEmit(next);
                                    }}
                                  >
                                    <option value="">This item ({itemDisplayLabel(selectedItem)})</option>
                                    {selectedPage.items
                                      .filter((x) => x.id !== selectedItem.id)
                                      .map((x) => (
                                        <option key={x.id} value={x.id}>
                                          {itemDisplayLabel(x)}
                                        </option>
                                      ))}
                                  </select>
                                ) : (
                                  <input
                                    className="w-full rounded border px-1 text-xs"
                                    placeholder="sound URL"
                                    value={tr.sound_url ?? ""}
                                    onChange={(e) => {
                                      const sound_url = e.target.value || undefined;
                                      const nextTriggers = (selectedItem.on_click?.triggers ?? []).map(
                                        (x, i) => (i === ti ? { ...x, sound_url } : x),
                                      );
                                      const next = pages.map((p) =>
                                        p.id === selectedPage.id ?
                                          {
                                            ...p,
                                            items: p.items.map((it) =>
                                              it.id === selectedItem.id ?
                                                {
                                                  ...it,
                                                  on_click: { ...it.on_click, triggers: nextTriggers },
                                                }
                                              : it,
                                            ),
                                          }
                                        : p,
                                      );
                                      pushEmit(next);
                                    }}
                                  />
                                )}
                                {tr.action === "emphasis" ? (
                                  <select
                                    className="w-full rounded border px-1 text-xs"
                                    value={tr.emphasis_preset ?? "grow"}
                                    onChange={(e) => {
                                      const emphasis_preset =
                                        e.target.value as NonNullable<
                                          StoryClickAction["emphasis_preset"]
                                        >;
                                      const nextTriggers = (selectedItem.on_click?.triggers ?? []).map(
                                        (x, i) => (i === ti ? { ...x, emphasis_preset } : x),
                                      );
                                      const next = pages.map((p) =>
                                        p.id === selectedPage.id ?
                                          {
                                            ...p,
                                            items: p.items.map((it) =>
                                              it.id === selectedItem.id ?
                                                {
                                                  ...it,
                                                  on_click: { ...it.on_click, triggers: nextTriggers },
                                                }
                                              : it,
                                            ),
                                          }
                                        : p,
                                      );
                                      pushEmit(next);
                                    }}
                                  >
                                    {TAP_EMPHASIS_PRESETS.map((preset) => (
                                      <option key={preset} value={preset}>
                                        {preset}
                                      </option>
                                    ))}
                                  </select>
                                ) : null}
                                {(tr.action === "emphasis" || tr.action === "move") ? (
                                  <label className="block text-[11px] text-neutral-700">
                                    Duration (ms)
                                    <input
                                      type="number"
                                      min={0}
                                      max={120000}
                                      step={50}
                                      className="mt-1 w-full rounded border px-1 text-xs"
                                      value={tr.duration_ms ?? ""}
                                      onChange={(e) => {
                                        const v = e.target.value.trim();
                                        const duration_ms =
                                          v.length === 0 ? undefined : Math.max(0, Number(v) || 0);
                                        const nextTriggers = (selectedItem.on_click?.triggers ?? []).map(
                                          (x, i) => (i === ti ? { ...x, duration_ms } : x),
                                        );
                                        const next = pages.map((p) =>
                                          p.id === selectedPage.id ?
                                            {
                                              ...p,
                                              items: p.items.map((it) =>
                                                it.id === selectedItem.id ?
                                                  {
                                                    ...it,
                                                    on_click: { ...it.on_click, triggers: nextTriggers },
                                                  }
                                                : it,
                                              ),
                                            }
                                          : p,
                                        );
                                        pushEmit(next);
                                      }}
                                    />
                                  </label>
                                ) : null}
                                {(tr.trigger_timing ?? "simultaneous") === "after_previous" ? (
                                  <label className="block text-[11px] text-neutral-700">
                                    After trigger
                                    <select
                                      className="mt-1 w-full rounded border px-1 text-xs"
                                      value={tr.after_trigger_id ?? ""}
                                      onChange={(e) => {
                                        const after_trigger_id = e.target.value || undefined;
                                        const nextTriggers = (selectedItem.on_click?.triggers ?? []).map(
                                          (x, i) => (i === ti ? { ...x, after_trigger_id } : x),
                                        );
                                        const next = pages.map((p) =>
                                          p.id === selectedPage.id ?
                                            {
                                              ...p,
                                              items: p.items.map((it) =>
                                                it.id === selectedItem.id ?
                                                  {
                                                    ...it,
                                                    on_click: { ...it.on_click, triggers: nextTriggers },
                                                  }
                                                : it,
                                              ),
                                            }
                                          : p,
                                        );
                                        pushEmit(next);
                                      }}
                                    >
                                      <option value="">Choose trigger...</option>
                                      {pageTriggerOptions
                                        .filter((opt) => opt.id !== (tr.trigger_id ?? `${selectedItem.id}:${ti}`))
                                        .map((opt) => (
                                          <option key={opt.id} value={opt.id}>
                                            {opt.label}
                                          </option>
                                        ))}
                                    </select>
                                  </label>
                                ) : null}
                                <label className="flex items-center gap-1 text-[11px] text-neutral-700">
                                  <input
                                    type="checkbox"
                                    checked={!!tr.play_once}
                                    onChange={(e) => {
                                      const play_once = e.target.checked || undefined;
                                      const nextTriggers = (selectedItem.on_click?.triggers ?? []).map(
                                        (x, i) => (i === ti ? { ...x, play_once } : x),
                                      );
                                      const next = pages.map((p) =>
                                        p.id === selectedPage.id ?
                                          {
                                            ...p,
                                            items: p.items.map((it) =>
                                              it.id === selectedItem.id ?
                                                {
                                                  ...it,
                                                  on_click: { ...it.on_click, triggers: nextTriggers },
                                                }
                                              : it,
                                            ),
                                          }
                                        : p,
                                      );
                                      pushEmit(next);
                                    }}
                                  />
                                  Lock trigger (play once)
                                </label>
                              </li>
                            ))}
                          </ul>
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              className="rounded border border-sky-600 bg-white px-2 py-1 text-xs font-semibold text-sky-900"
                              onClick={() => {
                                const add: StoryClickAction = {
                                  trigger_id: newEntityId("taptr"),
                                  action: "show_item",
                                  trigger_timing: "simultaneous",
                                };
                                const nextTriggers = [...(selectedItem.on_click?.triggers ?? []), add];
                                const next = pages.map((p) =>
                                  p.id === selectedPage.id ?
                                    {
                                      ...p,
                                      items: p.items.map((it) =>
                                        it.id === selectedItem.id ?
                                          {
                                            ...it,
                                            on_click: { ...it.on_click, triggers: nextTriggers },
                                          }
                                        : it,
                                      ),
                                    }
                                  : p,
                                );
                                pushEmit(next);
                              }}
                            >
                              + Add trigger
                            </button>
                            <button
                              type="button"
                              className="rounded border border-fuchsia-500 bg-white px-2 py-1 text-xs font-semibold text-fuchsia-900 hover:bg-fuchsia-50"
                              onClick={beginPathEdit}
                            >
                              Set move path
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-amber-800">
                Add a background image to place and drag items.
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !(selectedPage.background_image_url ?? image_url)}
                className="rounded border bg-white px-2 py-1 text-sm font-semibold"
                onClick={() => {
                  const id = nextRegionId(
                    selectedPage.items.map(storyItemToRect),
                    "item",
                  );
                  const base = defaultRegion(id);
                  const fallback =
                    "https://placehold.co/120x80/f1f5f9/334155?text=Item";
                  const newItem: StoryItem = {
                    ...base,
                    kind: "image",
                    image_url: fallback,
                    image_scale: 1,
                    show_card: true,
                    show_on_start: true,
                    z_index: selectedPage.items.length,
                    enter: { preset: "fade_in", duration_ms: 500 },
                    name: undefined,
                  };
                  const next = pages.map((p) =>
                    p.id === selectedPage.id ?
                      { ...p, items: [...p.items, newItem] }
                    : p,
                  );
                  selectCanvasItem(id);
                  pushEmit(next);
                }}
              >
                Add item
              </button>
              <button
                type="button"
                disabled={busy || !(selectedPage.background_image_url ?? image_url)}
                className="rounded border border-violet-200 bg-white px-2 py-1 text-sm font-semibold text-violet-900"
                onClick={() => {
                  const id = nextRegionId(
                    selectedPage.items.map(storyItemToRect),
                    "text",
                  );
                  const base = defaultRegion(id);
                  const newItem: StoryItem = {
                    ...base,
                    kind: "text",
                    text: "Text",
                    text_color: "#0f172a",
                    text_size_px: 24,
                    image_url: "https://placehold.co/2x2/ffffff/ffffff",
                    image_scale: 1,
                    show_card: false,
                    show_on_start: true,
                    z_index: selectedPage.items.length,
                    enter: { preset: "fade_in", duration_ms: 500 },
                    name: undefined,
                  };
                  const next = pages.map((p) =>
                    p.id === selectedPage.id ?
                      { ...p, items: [...p.items, newItem] }
                    : p,
                  );
                  selectCanvasItem(id);
                  pushEmit(next);
                }}
              >
                Add text
              </button>
              <button
                type="button"
                disabled={busy || !selItemId}
                className="rounded border border-red-200 px-2 py-1 text-sm text-red-800"
                onClick={() => {
                  if (!selItemId && selItemIds.length === 0) return;
                  if (typeof window !== "undefined") {
                    const itemCount = selItemIds.length > 0 ? selItemIds.length : 1;
                    const confirmed = window.confirm(
                      itemCount > 1 ?
                        `Remove ${itemCount} selected items from this scene? This cannot be undone.`
                      : "Remove this item from the scene? This cannot be undone.",
                    );
                    if (!confirmed) return;
                  }
                  const removeIds = new Set(selItemIds.length > 0 ? selItemIds : [selItemId!]);
                  const next = pages.map((p) =>
                    p.id === selectedPage.id ?
                      pruneDeletedItemReferences(p, removeIds)
                    : p,
                  );
                  setSelItemId(null);
                  setSelItemIds([]);
                  pushEmit(next);
                }}
              >
                Remove item
              </button>
              <button
                type="button"
                disabled={busy || selectedPage.items.length === 0}
                className="rounded border border-sky-300 px-2 py-1 text-sm text-sky-900"
                onClick={() => {
                  const allIds = selectedPage.items.map((it) => it.id);
                  setSelItemIds(allIds);
                  setSelItemId(allIds[0] ?? null);
                }}
              >
                Select all
              </button>
              <button
                type="button"
                disabled={busy || selItemIds.length === 0}
                className="rounded border border-neutral-300 px-2 py-1 text-sm text-neutral-700"
                onClick={() => {
                  setSelItemIds([]);
                  setSelItemId(null);
                }}
              >
                Deselect all
              </button>
            </div>
            <div className="mt-3 space-y-2">
              <input
                ref={bgVideoFileRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                className="hidden"
                disabled={busy || bgVideoUploading}
                onChange={(e) => void onBackgroundVideoFileChange(e)}
              />
              <MediaUrlControls
                label="Page background image"
                value={selectedPage.background_image_url ?? ""}
                onChange={(v) =>
                  updatePage(selectedPage.id, { background_image_url: v || undefined })
                }
                disabled={busy}
                compact
                hidePreview
                hideUrlInput
                extraButtons={
                  <>
                    <button
                      type="button"
                      onClick={() => setBgImageUrlMenuOpen((v) => !v)}
                      className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50"
                    >
                      URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgColorMenuOpen((v) => !v)}
                      className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50"
                    >
                      Color
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgVideoMenuOpen((v) => !v)}
                      className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50"
                    >
                      {selectedPage.video_url ? "Video on" : "Video"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updatePage(selectedPage.id, {
                          image_fit:
                            (selectedPage.image_fit ?? image_fit) === "cover" ?
                              "contain"
                            : "cover",
                        })
                      }
                      className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-neutral-50"
                    >
                      Fit: {(selectedPage.image_fit ?? image_fit) === "cover" ? "Cover" : "Contain"}
                    </button>
                  </>
                }
              />
              {bgImageUrlMenuOpen ? (
                <div className="rounded border border-neutral-200 bg-white/90 p-2">
                  <label className="block text-xs font-medium text-neutral-800">
                    Background image URL
                    <input
                      type="url"
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      placeholder="Paste image URL"
                      value={selectedPage.background_image_url ?? ""}
                      onChange={(e) =>
                        updatePage(selectedPage.id, {
                          background_image_url: e.target.value || undefined,
                        })
                      }
                    />
                  </label>
                </div>
              ) : null}
              {bgColorMenuOpen ? (
                <div className="rounded border border-neutral-200 bg-white/90 p-2">
                  <label className="text-xs font-medium text-neutral-800">
                    Background color
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedPage.background_color ?? "#e8f6fd"}
                        onChange={(e) =>
                          updatePage(selectedPage.id, {
                            background_color: e.target.value || undefined,
                          })
                        }
                      />
                      <input
                        className="w-32 rounded border px-2 py-1 text-xs"
                        value={selectedPage.background_color ?? ""}
                        placeholder="#e8f6fd"
                        onChange={(e) =>
                          updatePage(selectedPage.id, {
                            background_color: e.target.value || undefined,
                          })
                        }
                      />
                      <button
                        type="button"
                        className="rounded border border-neutral-300 px-2 py-1 text-xs"
                        onClick={() => updatePage(selectedPage.id, { background_color: undefined })}
                      >
                        Clear
                      </button>
                    </div>
                  </label>
                </div>
              ) : null}
              {bgVideoMenuOpen ? (
                <div className="space-y-2 rounded border border-neutral-200 bg-white/90 p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busy || bgVideoUploading}
                      onClick={() => bgVideoFileRef.current?.click()}
                      className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold"
                    >
                      {bgVideoUploading ? "Uploading..." : "Upload video"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBgVideoLibraryOpen((v) => !v)}
                      className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold"
                    >
                      {bgVideoLibraryOpen ? "Hide library" : "Video library"}
                    </button>
                    {selectedPage.video_url ? (
                      <button
                        type="button"
                        onClick={() => updatePage(selectedPage.id, { video_url: undefined })}
                        className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700"
                      >
                        Remove video
                      </button>
                    ) : null}
                  </div>
                  <label className="block text-xs font-medium text-neutral-800">
                    Video URL (optional)
                    <input
                      type="url"
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      value={selectedPage.video_url ?? ""}
                      onChange={(e) =>
                        updatePage(selectedPage.id, { video_url: e.target.value || undefined })
                      }
                    />
                  </label>
                  {bgVideoErr ? <p className="text-xs text-red-700">{bgVideoErr}</p> : null}
                  {bgVideoLibraryOpen ? (
                    <div className="rounded border border-neutral-200 bg-neutral-50 p-2">
                      <input
                        type="text"
                        value={bgVideoLibraryQuery}
                        onChange={(e) => setBgVideoLibraryQuery(e.target.value)}
                        placeholder="Search videos"
                        className="w-full rounded border px-2 py-1 text-xs"
                      />
                      <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                        {bgVideoLibraryLoading ? (
                          <p className="text-xs text-neutral-600">Loading...</p>
                        ) : bgVideoLibraryErr ? (
                          <p className="text-xs text-red-700">{bgVideoLibraryErr}</p>
                        ) : bgVideoLibraryAssets.length === 0 ? (
                          <p className="text-xs text-neutral-600">No videos found.</p>
                        ) : (
                          bgVideoLibraryAssets.map((asset) => (
                            <button
                              key={asset.id}
                              type="button"
                              onClick={() => {
                                updatePage(selectedPage.id, { video_url: asset.public_url });
                                setBgVideoLibraryOpen(false);
                              }}
                              className="block w-full rounded border border-neutral-200 bg-white px-2 py-1 text-left text-xs hover:bg-sky-50"
                            >
                              {asset.original_filename}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded border border-neutral-200 bg-white p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={selectedPage.auto_play ?? false}
                onChange={(e) =>
                  updatePage(selectedPage.id, { auto_play: e.target.checked })
                }
              />
              Auto-play timeline (respects student tap for sounds)
            </label>
            <p className="mt-1 text-xs text-neutral-600">
              Add steps below; delays are from page start (ms).
            </p>
            <ul className="mt-2 space-y-2">
              {(selectedPage.timeline ?? []).map((step, idx) => (
                <li
                  key={`${selectedPage.id}-tl-${idx}`}
                  className="flex flex-wrap items-end gap-2 rounded border border-neutral-100 p-2"
                >
                  <label className="text-xs">
                    delay ms
                    <input
                      type="number"
                      className="ml-1 w-20 rounded border px-1 text-sm"
                      value={step.delay_ms}
                      onChange={(e) => {
                        const delay_ms = Number(e.target.value) || 0;
                        const tl = [...(selectedPage.timeline ?? [])];
                        tl[idx] = { ...tl[idx], delay_ms };
                        updatePage(selectedPage.id, { timeline: tl });
                      }}
                    />
                  </label>
                  <select
                    className="rounded border px-1 text-sm"
                    value={step.action}
                    onChange={(e) => {
                      const action = e.target
                        .value as StoryTimelineStep["action"];
                      const tl = [...(selectedPage.timeline ?? [])];
                      tl[idx] = { ...tl[idx], action };
                      updatePage(selectedPage.id, { timeline: tl });
                    }}
                  >
                    {TIMELINE_ACTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <select
                    className="max-w-[10rem] rounded border px-1 text-sm"
                    value={step.item_id ?? ""}
                    onChange={(e) => {
                      const item_id = e.target.value || undefined;
                      const tl = [...(selectedPage.timeline ?? [])];
                      tl[idx] = { ...tl[idx], item_id };
                      updatePage(selectedPage.id, { timeline: tl });
                    }}
                  >
                    <option value="">— item —</option>
                    {selectedPage.items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.id}
                      </option>
                    ))}
                  </select>
                  <input
                    className="min-w-0 flex-1 rounded border px-1 text-xs"
                    placeholder="sound URL"
                    value={step.sound_url ?? ""}
                    onChange={(e) => {
                      const sound_url = e.target.value || undefined;
                      const tl = [...(selectedPage.timeline ?? [])];
                      tl[idx] = { ...tl[idx], sound_url };
                      updatePage(selectedPage.id, { timeline: tl });
                    }}
                  />
                  <button
                    type="button"
                    className="text-xs text-red-700"
                    onClick={() => {
                      const tl = (selectedPage.timeline ?? []).filter(
                        (_, i) => i !== idx,
                      );
                      updatePage(selectedPage.id, { timeline: tl });
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-2 rounded border px-2 py-1 text-sm"
              onClick={() => {
                const step: StoryTimelineStep = {
                  delay_ms: 0,
                  action: "emphasis",
                  item_id: selectedPage.items[0]?.id,
                };
                updatePage(selectedPage.id, {
                  timeline: [...(selectedPage.timeline ?? []), step],
                });
              }}
            >
              + Timeline step
            </button>
          </div>
            </div>
            <div
              className="hidden md:flex md:w-2 md:self-stretch md:items-stretch md:justify-center"
              aria-hidden
            >
              <button
                type="button"
                aria-label="Resize scene and editor panels"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setEditorPanelResizing({
                    startX: e.clientX,
                    startPct: editorRightPanelPct,
                  });
                }}
                className="h-full min-h-[8rem] w-1 cursor-col-resize rounded bg-neutral-200/90 hover:bg-sky-400 active:bg-sky-500"
              />
            </div>
            <div
              className="min-w-0 w-full space-y-3 md:sticky md:top-[6.5rem] md:grid md:h-[calc(100vh-8rem)] md:w-[var(--editor-right-width)] md:space-y-0"
              style={
                {
                  "--editor-right-width": `clamp(20rem, ${editorRightPanelPct}%, 52rem)`,
                  ...(visibleEditorPanels > 0
                    ? { gridTemplateRows: `repeat(${visibleEditorPanels}, minmax(0, 1fr))`, gap: "0.75rem" }
                    : {}),
                } as CSSProperties
              }
            >
              {showAnimationsPanel && selectedPage ? (
                <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-fuchsia-300/80 bg-fuchsia-50/60 p-2">
                  <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-900">
                      Animations
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => addAnimationSequence()}
                        className="rounded border border-fuchsia-400 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-900 hover:bg-fuchsia-100"
                      >
                        + Add animation
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnimationsMenuOpen(false)}
                        className="rounded border border-fuchsia-300 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-900 hover:bg-fuchsia-50"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <div className="h-full min-h-0 space-y-2 overflow-y-auto">
                    {selectedItem ? (
                      <p className="px-1 text-[11px] text-fuchsia-900/90">
                        Showing animations that trigger on or impact{" "}
                        <strong>{itemDisplayLabel(selectedItem)}</strong>
                        {selectedPhase ? (
                          <>
                            {" "}
                            in phase <strong>{selectedPhase.name?.trim() || selectedPhase.id}</strong>.
                          </>
                        ) : "."}
                      </p>
                    ) : (
                      <p className="px-1 text-[11px] text-fuchsia-900/90">
                        Showing scene-level animations (page start / selected phase start).
                      </p>
                    )}
                    <div className="overflow-hidden rounded border border-fuchsia-200 bg-white">
                      <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-fuchsia-100 bg-fuchsia-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-900">
                        <span>Animation</span>
                        <span>Trigger</span>
                        <span>Impacted object</span>
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {animationRows.map((row) => (
                          <button
                            key={row.id}
                            type="button"
                            onClick={() => setSelectedAnimationRowId(row.id)}
                            onDoubleClick={() => startAnimationEditor(row)}
                            className={`grid w-full grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-fuchsia-100 px-2 py-1 text-left text-xs transition-colors ${
                              selectedAnimationRowId === row.id
                                ? "bg-fuchsia-100/60 text-fuchsia-950"
                                : "bg-white text-neutral-800 hover:bg-fuchsia-50"
                            }`}
                          >
                            <span className="truncate">{row.name}</span>
                            <span className="truncate">{row.trigger}</span>
                            <span className="truncate">{row.impacted}</span>
                          </button>
                        ))}
                        {animationRows.length === 0 ? (
                          <p className="px-2 py-3 text-xs text-neutral-600">
                            No animations yet. Click <strong>+ Add animation</strong> to create one.
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {selectedAnimationRow ? (
                      <div className="rounded border border-fuchsia-200 bg-white p-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-fuchsia-900">{selectedAnimationRow.name}</p>
                          <button
                            type="button"
                            onClick={() => startAnimationEditor(selectedAnimationRow)}
                            className="rounded border border-fuchsia-300 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-900 hover:bg-fuchsia-50"
                          >
                            Edit
                          </button>
                        </div>
                        <p className="mt-0.5 text-neutral-700">
                          Trigger: <strong>{selectedAnimationRow.trigger}</strong>
                        </p>
                        <p className="text-neutral-700">
                          Impacts: <strong>{selectedAnimationRow.impacted}</strong>
                        </p>
                        <div className="mt-2 space-y-1">
                          <p className="font-semibold text-neutral-800">Steps</p>
                          {selectedAnimationRow.sequence.steps.length > 0 ? (
                            selectedAnimationRow.sequence.steps.map((step, idx) => (
                              <div
                                key={`${selectedAnimationRow.id}-${step.id}-${idx}`}
                                draggable={!selectedAnimationRow.sequence.id.startsWith("legacy:")}
                                onDragStart={(e) => {
                                  if (selectedAnimationRow.sequence.id.startsWith("legacy:")) return;
                                  setDragSummaryStepIdx(idx);
                                  e.dataTransfer.effectAllowed = "move";
                                  e.dataTransfer.setData("text/plain", `summary-step-${idx}`);
                                }}
                                onDragOver={(e) => {
                                  if (dragSummaryStepIdx === null || selectedAnimationRow.sequence.id.startsWith("legacy:")) return;
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = "move";
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (dragSummaryStepIdx === null) return;
                                  reorderAnimationSequenceSteps(selectedAnimationRow, dragSummaryStepIdx, idx);
                                  setDragSummaryStepIdx(null);
                                }}
                                onDragEnd={() => setDragSummaryStepIdx(null)}
                                className={`rounded border border-neutral-200 bg-neutral-50 px-2 py-1 ${
                                  selectedAnimationRow.sequence.id.startsWith("legacy:")
                                    ? "cursor-not-allowed opacity-80"
                                    : "cursor-grab active:cursor-grabbing"
                                } ${
                                  dragSummaryStepIdx === idx ? "opacity-70 ring-2 ring-fuchsia-300" : ""
                                }`}
                                title={
                                  selectedAnimationRow.sequence.id.startsWith("legacy:")
                                    ? "Open editor and save a copy to reorder legacy steps"
                                    : "Drag to reorder step"
                                }
                              >
                                <span className="font-medium">
                                  {idx + 1}. {step.kind}
                                </span>
                                <span className="ml-2 text-neutral-600">
                                  {step.target_item_id
                                    ? `→ ${selectedPage.items.find((it) => it.id === step.target_item_id)?.name || step.target_item_id}`
                                    : ""}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-neutral-600">No steps yet.</p>
                          )}
                        </div>
                      </div>
                    ) : null}
                    {selectedItem ? (
                      <div className="rounded border border-fuchsia-200 bg-white p-2 text-xs">
                        <p className="font-semibold text-fuchsia-900">Speech library (tap lines)</p>
                        <p className="mb-2 text-[11px] text-neutral-600">
                          Lines are now managed in Animations. Lower priority plays first.
                        </p>
                        <div className="space-y-2">
                          {(selectedItem.tap_speeches ?? []).map((entry, idx, arr) => (
                            <div
                              key={`anim-speech-${entry.id}`}
                              className="rounded border border-fuchsia-100 bg-fuchsia-50/30 p-2"
                            >
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <label className="text-[11px] font-medium text-neutral-800">
                                  Priority
                                  <input
                                    type="number"
                                    className="ml-1 w-20 rounded border px-1 py-0.5 text-[11px]"
                                    value={entry.priority}
                                    onChange={(e) => {
                                      const priority = Number(e.target.value) || 0;
                                      const next = pages.map((p) =>
                                        p.id === selectedPage.id ?
                                          {
                                            ...p,
                                            items: p.items.map((it) =>
                                              it.id === selectedItem.id ?
                                                {
                                                  ...it,
                                                  tap_speeches: (it.tap_speeches ?? []).map((x, i) =>
                                                    i === idx ? { ...x, priority } : x,
                                                  ),
                                                }
                                              : it,
                                            ),
                                          }
                                        : p,
                                      );
                                      pushEmit(next);
                                    }}
                                  />
                                </label>
                                <label className="text-[11px] font-medium text-neutral-800">
                                  Max plays
                                  <input
                                    type="number"
                                    min={1}
                                    className="ml-1 w-20 rounded border px-1 py-0.5 text-[11px]"
                                    value={entry.max_plays ?? ""}
                                    onChange={(e) => {
                                      const raw = e.target.value.trim();
                                      const max_plays = raw ? Math.max(1, Number(raw) || 1) : undefined;
                                      const next = pages.map((p) =>
                                        p.id === selectedPage.id ?
                                          {
                                            ...p,
                                            items: p.items.map((it) =>
                                              it.id === selectedItem.id ?
                                                {
                                                  ...it,
                                                  tap_speeches: (it.tap_speeches ?? []).map((x, i) =>
                                                    i === idx ? { ...x, max_plays } : x,
                                                  ),
                                                }
                                              : it,
                                            ),
                                          }
                                        : p,
                                      );
                                      pushEmit(next);
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  className="rounded border border-neutral-300 px-1.5 py-0.5 text-[10px]"
                                  disabled={idx === 0}
                                  onClick={() => {
                                    const next = pages.map((p) =>
                                      p.id === selectedPage.id ?
                                        {
                                          ...p,
                                          items: p.items.map((it) => {
                                            if (it.id !== selectedItem.id) return it;
                                            const list = [...(it.tap_speeches ?? [])];
                                            if (idx <= 0) return it;
                                            [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
                                            return { ...it, tap_speeches: list };
                                          }),
                                        }
                                      : p,
                                    );
                                    pushEmit(next);
                                  }}
                                >
                                  Up
                                </button>
                                <button
                                  type="button"
                                  className="rounded border border-neutral-300 px-1.5 py-0.5 text-[10px]"
                                  disabled={idx >= arr.length - 1}
                                  onClick={() => {
                                    const next = pages.map((p) =>
                                      p.id === selectedPage.id ?
                                        {
                                          ...p,
                                          items: p.items.map((it) => {
                                            if (it.id !== selectedItem.id) return it;
                                            const list = [...(it.tap_speeches ?? [])];
                                            if (idx >= list.length - 1) return it;
                                            [list[idx], list[idx + 1]] = [list[idx + 1], list[idx]];
                                            return { ...it, tap_speeches: list };
                                          }),
                                        }
                                      : p,
                                    );
                                    pushEmit(next);
                                  }}
                                >
                                  Down
                                </button>
                                <button
                                  type="button"
                                  className="rounded border border-red-300 px-1.5 py-0.5 text-[10px] text-red-700"
                                  onClick={() => {
                                    const next = pages.map((p) =>
                                      p.id === selectedPage.id ?
                                        {
                                          ...p,
                                          items: p.items.map((it) => {
                                            if (it.id !== selectedItem.id) return it;
                                            const list = (it.tap_speeches ?? []).filter((x) => x.id !== entry.id);
                                            return { ...it, tap_speeches: list.length > 0 ? list : undefined };
                                          }),
                                        }
                                      : p,
                                    );
                                    pushEmit(next);
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                              <label className="block text-[11px] font-medium text-neutral-800">
                                Phase targets (optional)
                                <select
                                  multiple
                                  className="mt-1 h-20 w-full rounded border px-1 py-1 text-[11px]"
                                  value={entry.phase_ids ?? []}
                                  onChange={(e) => {
                                    const phase_ids = Array.from(e.target.selectedOptions).map((o) => o.value);
                                    const next = pages.map((p) =>
                                      p.id === selectedPage.id ?
                                        {
                                          ...p,
                                          items: p.items.map((it) =>
                                            it.id === selectedItem.id ?
                                              {
                                                ...it,
                                                tap_speeches: (it.tap_speeches ?? []).map((x, i) =>
                                                  i === idx ?
                                                    {
                                                      ...x,
                                                      phase_ids: phase_ids.length > 0 ? phase_ids : undefined,
                                                    }
                                                  : x,
                                                ),
                                              }
                                            : it,
                                          ),
                                        }
                                      : p,
                                    );
                                    pushEmit(next);
                                  }}
                                >
                                  {(selectedPage.phases ?? []).map((ph) => (
                                    <option key={ph.id} value={ph.id}>
                                      {ph.name?.trim() || ph.id}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="mt-2 block text-[11px] font-medium text-neutral-800">
                                Tap text (optional)
                                <textarea
                                  className="mt-1 w-full rounded border px-2 py-1 text-[11px]"
                                  rows={2}
                                  value={entry.text ?? ""}
                                  onChange={(e) => {
                                    const text = e.target.value.trim() ? e.target.value : undefined;
                                    const next = pages.map((p) =>
                                      p.id === selectedPage.id ?
                                        {
                                          ...p,
                                          items: p.items.map((it) =>
                                            it.id === selectedItem.id ?
                                              {
                                                ...it,
                                                tap_speeches: (it.tap_speeches ?? []).map((x, i) =>
                                                  i === idx ? { ...x, text } : x,
                                                ),
                                              }
                                            : it,
                                          ),
                                        }
                                      : p,
                                    );
                                    pushEmit(next);
                                  }}
                                />
                              </label>
                              <AudioUrlControls
                                label="Tap audio (optional)"
                                value={entry.sound_url ?? ""}
                                onChange={(v) => {
                                  const sound_url = v.trim() || undefined;
                                  const next = pages.map((p) =>
                                    p.id === selectedPage.id ?
                                      {
                                        ...p,
                                        items: p.items.map((it) =>
                                          it.id === selectedItem.id ?
                                            {
                                              ...it,
                                              tap_speeches: (it.tap_speeches ?? []).map((x, i) =>
                                                i === idx ? { ...x, sound_url } : x,
                                              ),
                                            }
                                          : it,
                                        ),
                                      }
                                    : p,
                                  );
                                  pushEmit(next);
                                }}
                                disabled={busy}
                                compact
                              />
                            </div>
                          ))}
                          <button
                            type="button"
                            className="rounded border border-fuchsia-400 bg-white px-2 py-1 text-[11px] font-semibold text-fuchsia-900 hover:bg-fuchsia-50"
                            onClick={() => {
                              const next = pages.map((p) =>
                                p.id === selectedPage.id ?
                                  {
                                    ...p,
                                    items: p.items.map((it) =>
                                      it.id === selectedItem.id ?
                                        {
                                          ...it,
                                          tap_speeches: [
                                            ...(it.tap_speeches ?? []),
                                            { id: newEntityId("tapline"), priority: 100 },
                                          ],
                                        }
                                      : it,
                                    ),
                                  }
                                : p,
                              );
                              pushEmit(next);
                            }}
                          >
                            + Add tap speech entry
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {showPageContentPanel && selectedPage ? (
                <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-amber-300/80 bg-amber-50/60 p-2">
                  <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                      Page content
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPageContentPinned((v) => !v)}
                        className="rounded border border-amber-300 px-2 py-0.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-50"
                      >
                        {pageContentPinned ? "Unpin" : "Pin"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPageContentMenuOpen(false)}
                        className="rounded border border-amber-300 px-2 py-0.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-50"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <div className="h-full min-h-0 space-y-3 overflow-y-auto">
                    <label className={labelClass()}>
                      Page text
                      <textarea
                        className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        rows={3}
                        value={selectedPage.body_text ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          const next = pages.map((p) =>
                            p.id === selectedPage.id ? { ...p, body_text: v } : p,
                          );
                          setBody(v);
                          pushEmit(next);
                        }}
                      />
                    </label>
                    <label className={labelClass()}>
                      Read-aloud for this page (optional)
                      <textarea
                        className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        rows={2}
                        value={selectedPage.read_aloud_text ?? ""}
                        onChange={(e) =>
                          updatePage(selectedPage.id, {
                            read_aloud_text: e.target.value || undefined,
                          })
                        }
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-neutral-800">
                      <input
                        type="checkbox"
                        checked={selectedPage.auto_play_page_text ?? false}
                        onChange={(e) =>
                          updatePage(selectedPage.id, { auto_play_page_text: e.target.checked })
                        }
                      />
                      Auto-play page text at start
                    </label>
                    <AudioUrlControls
                      label="Page sound (plays when page is shown — after first tap in player)"
                      value={selectedPage.page_audio_url ?? ""}
                      onChange={(v) =>
                        updatePage(selectedPage.id, { page_audio_url: v || undefined })
                      }
                      disabled={busy}
                      compact
                    />
                  </div>
                </div>
              ) : null}
              {showPhasePanel && selectedPhase && selectedPage ? (
                <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-violet-300/80 bg-violet-50/60 p-2">
                  <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-900">
                      Phase editor
                    </p>
                    <button
                      type="button"
                      onClick={() => setPhasePinned((v) => !v)}
                      className="rounded border border-violet-300 px-2 py-0.5 text-[10px] font-semibold text-violet-900 hover:bg-violet-50"
                    >
                      {phasePinned ? "Unpin" : "Pin"}
                    </button>
                  </div>
                  <div className="h-full min-h-0 overflow-y-auto">
                    <StoryPhaseProperties
                      phase={selectedPhase}
                      allPhases={editorPhasesForPage ?? []}
                      pageItems={selectedPage.items}
                      pageHasRealPhases={pageHasRealPhases}
                      onUpdatePhase={(patch) =>
                        updateCurrentPhaseById(selectedPhase.id, patch)
                      }
                      onSetStart={setStartPhase}
                      busy={busy}
                    />
                  </div>
                </div>
              ) : null}
              {showObjectPanel && selectedPage ? (
                <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-sky-300/80 bg-sky-50/60 p-2">
                  <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-900">
                      Object editor
                    </p>
                    <button
                      type="button"
                      onClick={() => setObjectPinned((v) => !v)}
                      className="rounded border border-sky-300 px-2 py-0.5 text-[10px] font-semibold text-sky-900 hover:bg-sky-50"
                    >
                      {objectPinned ? "Unpin" : "Pin"}
                    </button>
                  </div>
                  <div className="h-full min-h-0 overflow-y-auto">
                    {selectedItem ? (
                      <StoryItemEditorPanel
                        selectedItem={selectedItem}
                        selectedPage={selectedPage}
                        pages={pages}
                        pushEmit={(next) => pushEmit(next)}
                        busy={busy}
                        image_url={image_url}
                      />
                    ) : (
                      <p className="px-2 py-1 text-xs text-neutral-600">
                        Select an object in the scene to edit it.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        </div>
      ) : null}

      {animationEditor ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-fuchsia-300 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-fuchsia-200 bg-fuchsia-50 px-4 py-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-900">
                  Animation editor
                </p>
                <p className="text-[11px] text-fuchsia-800">
                  Trigger: {animationEditor.trigger}
                  {animationEditor.isLegacy ? " · Legacy row (saving creates editable copy)" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAnimationEditor(null)}
                className="rounded border border-fuchsia-300 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-900 hover:bg-fuchsia-100"
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
              <label className={labelClass()}>
                Animation name
                <input
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={animationEditor.sequence.name ?? ""}
                  onChange={(e) =>
                    updateAnimationEditorSequence((seq) => ({
                      ...seq,
                      name: e.target.value || undefined,
                    }))
                  }
                />
              </label>
              <div className="space-y-2 rounded border border-neutral-200 p-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-neutral-800">Steps</p>
                  <button
                    type="button"
                    onClick={() =>
                      updateAnimationEditorSequence((seq) => ({
                        ...seq,
                        steps: [
                          ...(seq.steps ?? []),
                          {
                            id: newEntityId("astep"),
                            kind: "emphasis",
                            target_item_id: selectedItem?.id || selectedPage?.items[0]?.id,
                            timing: "simultaneous",
                          },
                        ],
                      }))
                    }
                    className="rounded border border-neutral-300 px-2 py-0.5 text-[10px] font-semibold text-neutral-800 hover:bg-neutral-50"
                  >
                    + Step
                  </button>
                </div>
                {animationEditor.sequence.steps.length > 0 ? (
                  animationEditor.sequence.steps.map((step, idx) => (
                    <div
                      key={`${step.id}-${idx}`}
                      draggable
                      onDragStart={(e) => {
                        setDragEditorStepIdx(idx);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", `editor-step-${idx}`);
                      }}
                      onDragOver={(e) => {
                        if (dragEditorStepIdx === null) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragEditorStepIdx === null) return;
                        updateAnimationEditorSequence((seq) => ({
                          ...seq,
                          steps: reorderByIndex(seq.steps ?? [], dragEditorStepIdx, idx),
                        }));
                        setDragEditorStepIdx(null);
                      }}
                      onDragEnd={() => setDragEditorStepIdx(null)}
                      className={`space-y-1 rounded border border-neutral-200 bg-neutral-50 p-2 cursor-grab active:cursor-grabbing ${
                        dragEditorStepIdx === idx ? "opacity-70 ring-2 ring-fuchsia-300" : ""
                      }`}
                      title="Drag to reorder step"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-neutral-800">Step {idx + 1}</p>
                        <button
                          type="button"
                          onClick={() =>
                            updateAnimationEditorSequence((seq) => ({
                              ...seq,
                              steps: seq.steps.filter((_, i) => i !== idx),
                            }))
                          }
                          className="rounded border border-red-200 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <label className="text-[11px] text-neutral-700">
                          Action
                          <select
                            className="mt-1 w-full rounded border px-1 py-1 text-xs"
                            value={step.kind}
                            onChange={(e) =>
                              updateAnimationEditorSequence((seq) => ({
                                ...seq,
                                steps: seq.steps.map((s, i) =>
                                  i === idx ? { ...s, kind: e.target.value as StoryActionStep["kind"] } : s,
                                ),
                              }))
                            }
                          >
                            <option value="emphasis">emphasis</option>
                            <option value="move">move</option>
                            <option value="show_item">show_item</option>
                            <option value="hide_item">hide_item</option>
                            <option value="play_sound">play_sound</option>
                            <option value="tts">tts</option>
                            <option value="smart_line">smart_line</option>
                          </select>
                        </label>
                        <label className="text-[11px] text-neutral-700">
                          Timing
                          <select
                            className="mt-1 w-full rounded border px-1 py-1 text-xs"
                            value={step.timing ?? "simultaneous"}
                            onChange={(e) =>
                              updateAnimationEditorSequence((seq) => ({
                                ...seq,
                                steps: seq.steps.map((s, i) =>
                                  i === idx ?
                                    {
                                      ...s,
                                      timing: e.target.value as NonNullable<StoryActionStep["timing"]>,
                                    }
                                  : s,
                                ),
                              }))
                            }
                          >
                            <option value="simultaneous">simultaneous</option>
                            <option value="after_previous">after_previous</option>
                            <option value="next_click">next_click</option>
                          </select>
                        </label>
                        <label className="text-[11px] text-neutral-700">
                          Target
                          <select
                            className="mt-1 w-full rounded border px-1 py-1 text-xs"
                            value={step.target_item_id ?? ""}
                            onChange={(e) =>
                              updateAnimationEditorSequence((seq) => ({
                                ...seq,
                                steps: seq.steps.map((s, i) =>
                                  i === idx ? { ...s, target_item_id: e.target.value || undefined } : s,
                                ),
                              }))
                            }
                          >
                            <option value="">(owner/default)</option>
                            {(selectedPage?.items ?? []).map((it) => (
                              <option key={it.id} value={it.id}>
                                {itemDisplayLabel(it)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      {(step.kind === "emphasis" || step.kind === "move") ? (
                        <label className="text-[11px] text-neutral-700">
                          Duration (ms)
                          <input
                            type="number"
                            min={0}
                            className="mt-1 w-full rounded border px-2 py-1 text-xs"
                            value={step.duration_ms ?? ""}
                            onChange={(e) =>
                              updateAnimationEditorSequence((seq) => ({
                                ...seq,
                                steps: seq.steps.map((s, i) =>
                                  i === idx ?
                                    { ...s, duration_ms: e.target.value ? Number(e.target.value) : undefined }
                                  : s,
                                ),
                              }))
                            }
                          />
                        </label>
                      ) : null}
                      {step.kind === "move" && !moveStepHasPath(step) ? (
                        <p className="text-[11px] text-amber-800">
                          Move needs a path on the target object. Use <strong>Set move path</strong> in the
                          trigger menu first.
                        </p>
                      ) : null}
                      {step.kind === "play_sound" ? (
                        <div className="space-y-2 rounded border border-neutral-200 bg-white p-2">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[11px] font-medium text-neutral-700">Audio mode</span>
                            <button
                              type="button"
                              onClick={() =>
                                updateAnimationEditorSequence((seq) => ({
                                  ...seq,
                                  steps: seq.steps.map((s, i) =>
                                    i === idx ?
                                      { ...s, kind: "play_sound", tts_text: undefined, tts_lang: undefined }
                                    : s,
                                  ),
                                }))
                              }
                              className="rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-800 hover:bg-neutral-100"
                            >
                              Audio file
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateAnimationEditorSequence((seq) => ({
                                  ...seq,
                                  steps: seq.steps.map((s, i) =>
                                    i === idx ?
                                      { ...s, kind: "tts", sound_url: undefined, duration_ms: undefined }
                                    : s,
                                  ),
                                }))
                              }
                              className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-neutral-800 hover:bg-neutral-100"
                            >
                              TTS
                            </button>
                          </div>
                          <AudioUrlControls
                            label="Sound file"
                            value={step.sound_url ?? ""}
                            onChange={(v) =>
                              updateAnimationEditorSequence((seq) => ({
                                ...seq,
                                steps: seq.steps.map((s, i) =>
                                  i === idx ? { ...s, sound_url: v.trim() || undefined } : s,
                                ),
                              }))
                            }
                            disabled={busy}
                            compact
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const targetId = resolveAnimationStepTargetItemId(step);
                              const targetItem =
                                (selectedPage?.items ?? []).find((it) => it.id === targetId) ?? null;
                              const fallbackUrl = preferredTapSpeechSoundUrl(
                                targetItem,
                                selectedPhase?.id ?? null,
                              );
                              if (!fallbackUrl) return;
                              updateAnimationEditorSequence((seq) => ({
                                ...seq,
                                steps: seq.steps.map((s, i) =>
                                  i === idx ? { ...s, sound_url: fallbackUrl } : s,
                                ),
                              }));
                            }}
                            disabled={
                              (() => {
                                const targetId = resolveAnimationStepTargetItemId(step);
                                const targetItem =
                                  (selectedPage?.items ?? []).find((it) => it.id === targetId) ?? null;
                                return !preferredTapSpeechSoundUrl(targetItem, selectedPhase?.id ?? null);
                              })()
                            }
                            className="rounded border border-fuchsia-300 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-900 enabled:hover:bg-fuchsia-50 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Use first available tap speech audio from the target item"
                          >
                            Use saved audio on file
                          </button>
                        </div>
                      ) : null}
                      {step.kind === "tts" ? (
                        <div className="space-y-2 rounded border border-neutral-200 bg-white p-2">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[11px] font-medium text-neutral-700">Audio mode</span>
                            <button
                              type="button"
                              onClick={() =>
                                updateAnimationEditorSequence((seq) => ({
                                  ...seq,
                                  steps: seq.steps.map((s, i) =>
                                    i === idx ?
                                      { ...s, kind: "play_sound", tts_text: undefined, tts_lang: undefined }
                                    : s,
                                  ),
                                }))
                              }
                              className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-neutral-800 hover:bg-neutral-100"
                            >
                              Audio file
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateAnimationEditorSequence((seq) => ({
                                  ...seq,
                                  steps: seq.steps.map((s, i) =>
                                    i === idx ? { ...s, kind: "tts", sound_url: undefined } : s,
                                  ),
                                }))
                              }
                              className="rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-800 hover:bg-neutral-100"
                            >
                              TTS
                            </button>
                          </div>
                          <label className="text-[11px] text-neutral-700">
                            TTS text
                            <input
                              className="mt-1 w-full rounded border px-2 py-1 text-xs"
                              value={step.tts_text ?? ""}
                              onChange={(e) =>
                                updateAnimationEditorSequence((seq) => ({
                                  ...seq,
                                  steps: seq.steps.map((s, i) =>
                                    i === idx ? { ...s, tts_text: e.target.value || undefined } : s,
                                  ),
                                }))
                              }
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-600">No steps yet. Add one to make this animation do something.</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-2">
              <button
                type="button"
                onClick={removeAnimationInEditor}
                className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Delete animation
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAnimationEditor(null)}
                  className="rounded border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveAnimationEditor}
                  className="rounded border border-fuchsia-400 bg-fuchsia-100 px-2 py-1 text-xs font-semibold text-fuchsia-900 hover:bg-fuchsia-200"
                >
                  Save animation
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
          {!multi ? (
            <>
              <label className={labelClass()}>
                Video URL (optional — when set, video is shown instead of the image)
                <input
                  type="url"
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  placeholder="https://…"
                  value={video_url}
                  onChange={(e) => {
                    const v = e.target.value;
                    setVideoUrl(v);
                    emit({
                      image_url,
                      image_fit,
                      video_url: v,
                      body_text,
                      read_aloud_text,
                      tts_lang,
                      tip_text,
                      guide_image,
                      pages: [],
                      page_turn_style: pageTurn,
                    });
                  }}
                />
              </label>
              <MediaUrlControls
                label="Story image"
                value={image_url}
                onChange={(v) => {
                  setImageUrl(v);
                  emit({
                    image_url: v,
                    image_fit,
                    video_url,
                    body_text,
                    read_aloud_text,
                    tts_lang,
                    tip_text,
                    guide_image,
                    pages: [],
                    page_turn_style: pageTurn,
                  });
                }}
                disabled={busy}
              />
              <label className={labelClass()}>
                Story image fit
                <select
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  value={image_fit}
                  onChange={(e) => {
                    const v = e.target.value as "cover" | "contain";
                    setImageFit(v);
                    emit({
                      image_url,
                      image_fit: v,
                      video_url,
                      body_text,
                      read_aloud_text,
                      tts_lang,
                      tip_text,
                      guide_image,
                      pages: [],
                      page_turn_style: pageTurn,
                    });
                  }}
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                </select>
              </label>
              <label className={labelClass()}>
                Story text
                <textarea
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  rows={4}
                  value={body_text}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBody(v);
                    emit({
                      image_url,
                      image_fit,
                      video_url,
                      body_text: v,
                      read_aloud_text,
                      tts_lang,
                      tip_text,
                      guide_image,
                      pages: [],
                      page_turn_style: pageTurn,
                    });
                  }}
                />
              </label>
            </>
          ) : null}
          <label className={labelClass()}>
            TTS language
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={tts_lang}
              onChange={(e) => {
                const v = e.target.value;
                setTts(v);
                emit({
                  image_url,
                  image_fit,
                  video_url,
                  body_text,
                  read_aloud_text,
                  tts_lang: v,
                  tip_text,
                  guide_image,
                  pages,
                  page_turn_style: pageTurn,
                });
              }}
            />
          </label>
      </div>
    </div>
  );
}
