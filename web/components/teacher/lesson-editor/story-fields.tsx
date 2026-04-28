"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  defaultRegion,
  nextRegionId,
  RectRegionEditor,
  type RectPercent,
} from "@/components/teacher/lesson-editor/RectRegionEditor";
import { ScaledStoryItemImage } from "@/components/story/ScaledStoryItemImage";
import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import { StoryPathDrawer } from "@/components/teacher/lesson-editor/StoryPathDrawer";
import {
  storyAnimationPresetSchema,
  storyPayloadSchema,
  storyTimelineActionSchema,
  type ScreenPayload,
  type StoryClickAction,
  type StoryItem,
  type StoryPage,
  type StoryPagePhase,
  type StoryTimelineStep,
} from "@/lib/lesson-schemas";
import {
  appendPhase,
  createTwoInitialPhases,
  getEditorPhases,
  isEditorVirtualPhases,
  isItemVisibleInEditorPhase,
  removePhaseAt,
  sanitizePageForPayload,
  StoryPhasesColumn,
  StoryPhaseProperties,
  STORY_EDITOR_VIRTUAL_PHASE_ID,
} from "@/components/teacher/lesson-editor/story-editor-phases";
import { StoryItemEditorPanel } from "@/components/teacher/lesson-editor/StoryItemEditorPanel";
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
  return n || it.id;
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
    image_url: prev?.image_url ?? fallbackImage,
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
  };
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
  const [phasePanelCollapsed, setPhasePanelCollapsed] = useState(false);
  const [itemsCanvasCompact, setItemsCanvasCompact] = useState(false);
  const [triggerMenuCollapsedByItem, setTriggerMenuCollapsedByItem] = useState<
    Record<string, boolean>
  >({});
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
        <div className="space-y-4 rounded border border-sky-200 bg-sky-50 px-4 pb-4 pt-0">
          <div className="pt-3">
            <MediaUrlControls
              label="Page background image"
              value={selectedPage.background_image_url ?? ""}
              onChange={(v) =>
                updatePage(selectedPage.id, { background_image_url: v || undefined })
              }
              disabled={busy}
            />
          </div>
          <div className="sticky top-0 z-20 -mx-4 mb-0 border-b border-sky-200/70 bg-sky-50 px-4 py-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center justify-center gap-1">
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
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setPhasePanelCollapsed((v) => !v)}
                className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold leading-tight transition-colors ${
                  phasePanelCollapsed
                    ? "border-violet-300 bg-white text-violet-900 hover:bg-violet-50"
                    : "border-violet-500 bg-violet-100 text-violet-900 hover:bg-violet-200"
                }`}
                aria-expanded={!phasePanelCollapsed}
                title={phasePanelCollapsed ? "Expand phase editor" : "Collapse phase editor"}
              >
                {phasePanelCollapsed ? "Phases" : "Hide phases"}
              </button>
            </div>
          </div>

          <div className="relative mt-2">
            <div
              className={`sticky top-10 z-30 transition-[margin] duration-200 ${
                phasePanelCollapsed ? "mb-0" : "mb-3"
              }`}
            >
              <div
                className={`overflow-hidden transition-all duration-200 ease-out ${
                  phasePanelCollapsed ? "max-h-0 opacity-0" : "max-h-[26rem] opacity-100"
                }`}
              >
                <div className="rounded-xl border border-violet-300/80 bg-violet-50/95 p-2 shadow-md">
                  <StoryPhasesColumn
                    phases={editorPhasesForPage ?? []}
                    selectedPhaseId={selectedPhase?.id ?? STORY_EDITOR_VIRTUAL_PHASE_ID}
                    onSelect={(id) => {
                      setSelPhaseId(id);
                      setSelItemId(null);
                    }}
                    onAdd={addStoryPhase}
                    onRemove={removeStoryPhase}
                    busy={busy}
                  />
                </div>
              </div>
            </div>

          <div className="mt-1 grid min-h-0 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_min(22rem,30vw)]">
            <div className="min-w-0 space-y-4">
          <label className={labelClass()}>
            Page image fit
            <select
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={selectedPage.image_fit ?? image_fit}
              onChange={(e) =>
                updatePage(selectedPage.id, {
                  image_fit: e.target.value as "cover" | "contain",
                })
              }
            >
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
            </select>
          </label>
          <div className="grid gap-2 rounded border border-neutral-200 bg-white/70 p-2 sm:grid-cols-3">
            <label className="text-xs font-medium text-neutral-800">
              Crop X (%)
              <input
                type="number"
                min={-100}
                max={100}
                step={1}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={selectedPage.background_crop?.x_percent ?? 0}
                onChange={(e) => {
                  const x_percent = Number(e.target.value) || 0;
                  updatePage(selectedPage.id, {
                    background_crop: {
                      x_percent,
                      y_percent: selectedPage.background_crop?.y_percent ?? 0,
                      zoom_percent: selectedPage.background_crop?.zoom_percent ?? 100,
                    },
                  });
                }}
              />
            </label>
            <label className="text-xs font-medium text-neutral-800">
              Crop Y (%)
              <input
                type="number"
                min={-100}
                max={100}
                step={1}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={selectedPage.background_crop?.y_percent ?? 0}
                onChange={(e) => {
                  const y_percent = Number(e.target.value) || 0;
                  updatePage(selectedPage.id, {
                    background_crop: {
                      x_percent: selectedPage.background_crop?.x_percent ?? 0,
                      y_percent,
                      zoom_percent: selectedPage.background_crop?.zoom_percent ?? 100,
                    },
                  });
                }}
              />
            </label>
            <label className="text-xs font-medium text-neutral-800">
              Zoom (%)
              <input
                type="number"
                min={50}
                max={300}
                step={1}
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={selectedPage.background_crop?.zoom_percent ?? 100}
                onChange={(e) => {
                  const zoom_percent = Number(e.target.value) || 100;
                  updatePage(selectedPage.id, {
                    background_crop: {
                      x_percent: selectedPage.background_crop?.x_percent ?? 0,
                      y_percent: selectedPage.background_crop?.y_percent ?? 0,
                      zoom_percent,
                    },
                  });
                }}
              />
            </label>
          </div>
          <label className={labelClass()}>
            Background color (optional, hex)
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={selectedPage.background_color ?? ""}
              placeholder="#e8f6fd"
              onChange={(e) =>
                updatePage(selectedPage.id, {
                  background_color: e.target.value || undefined,
                })
              }
            />
          </label>
          <label className={labelClass()}>
            Video URL (optional — replaces background image)
            <input
              type="url"
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={selectedPage.video_url ?? ""}
              onChange={(e) =>
                updatePage(selectedPage.id, { video_url: e.target.value || undefined })
              }
            />
          </label>
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
          <MediaUrlControls
            label="Page sound (plays when page is shown — after first tap in player)"
            value={selectedPage.page_audio_url ?? ""}
            onChange={(v) =>
              updatePage(selectedPage.id, { page_audio_url: v || undefined })
            }
            disabled={busy}
            compact
          />

          <div className="rounded border border-neutral-200 bg-white p-3">
            <p className="mb-0.5 text-sm font-semibold">Items on this page</p>
            <p className="mb-2 text-[11px] text-neutral-500">
              <strong>Resize</strong> (sky corner) changes the object box on the page. Item image uses a
              simple scale value only.
            </p>
            {(selectedPage.background_image_url ?? image_url) ? (
              <div
                className={`relative transition-all duration-150 ${itemsCanvasCompact ? "mx-auto max-w-[520px]" : "w-full"}`}
              >
                <RectRegionEditor
                  imageUrl={(selectedPage.background_image_url ?? image_url)!}
                  imageFit={selectedPage.image_fit ?? image_fit}
                  stageAspectRatio="16 / 10"
                  cropXPercent={selectedPage.background_crop?.x_percent ?? 0}
                  cropYPercent={selectedPage.background_crop?.y_percent ?? 0}
                  cropZoomPercent={selectedPage.background_crop?.zoom_percent ?? 100}
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
                    const nextItems = regs.map((r) =>
                      rectToStoryItem(r, map.get(r.id), fallback),
                    );
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
                  renderRegion={(r) => {
                    const it = selectedPage.items.find((x) => x.id === r.id);
                    const src = it?.image_url;
                    if (!src) return null;
                    const dim =
                      !!selectedPhase &&
                      !!it &&
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
                {selectedItem && triggerMenuPos ? (
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
                        </>
                      )}
                    </div>
                    </div>
                  </div>
                ) : null}
                <div className="mt-2 flex flex-col items-center gap-1">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      title="Larger editor preview only. Does not change the lesson for students."
                      onClick={() => setItemsCanvasCompact(false)}
                      className={`rounded border px-2 py-1 text-xs font-semibold ${
                        !itemsCanvasCompact
                          ? "border-sky-500 bg-sky-100 text-sky-900"
                          : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      Wider editor
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      title="Smaller editor preview only. Does not change the lesson for students."
                      onClick={() => setItemsCanvasCompact(true)}
                      className={`rounded border px-2 py-1 text-xs font-semibold ${
                        itemsCanvasCompact
                          ? "border-sky-500 bg-sky-100 text-sky-900"
                          : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      Compact editor
                    </button>
                  </div>
                  <span className="text-[10px] text-neutral-500">Editor layout only</span>
                </div>
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
                disabled={busy || !selItemId}
                className="rounded border border-red-200 px-2 py-1 text-sm text-red-800"
                onClick={() => {
                  if (!selItemId && selItemIds.length === 0) return;
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
            <div className="min-w-0 space-y-3 lg:sticky lg:top-2 lg:max-h-[min(100vh,720px)] lg:overflow-y-auto">
              {selectedPhase && selectedPage ? (
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
              ) : null}
              {selectedItem && selectedPage ? (
                <StoryItemEditorPanel
                  selectedItem={selectedItem}
                  selectedPage={selectedPage}
                  pages={pages}
                  pushEmit={(next) => pushEmit(next)}
                  busy={busy}
                  image_url={image_url}
                />
              ) : null}
            </div>
          </div>
        </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
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
            Read-aloud override (optional — used when single-page or as fallback)
            <textarea
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              rows={2}
              value={read_aloud_text}
              onChange={(e) => {
                const v = e.target.value;
                setRead(v);
                emit({
                  image_url,
                  image_fit,
                  video_url,
                  body_text,
                  read_aloud_text: v,
                  tts_lang,
                  tip_text,
                  guide_image,
                  pages,
                  page_turn_style: pageTurn,
                });
              }}
            />
          </label>
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
          <div className="rounded border border-amber-200 bg-amber-50/80 p-3">
            <p className="mb-2 text-sm font-semibold text-amber-950">Student guide (tip)</p>
            <label className={labelClass()}>
              Guide tip text
              <input
                className="mt-1 w-full rounded border px-2 py-1 text-sm"
                value={tip_text}
                onChange={(e) => {
                  const v = e.target.value;
                  setTip(v);
                  emit({
                    image_url,
                    image_fit,
                    video_url,
                    body_text,
                    read_aloud_text,
                    tts_lang,
                    tip_text: v,
                    guide_image,
                    pages,
                    page_turn_style: pageTurn,
                  });
                }}
              />
            </label>
            <MediaUrlControls
              label="Guide image"
              value={guide_image}
              onChange={(v) => {
                setGuideImg(v);
                emit({
                  image_url,
                  image_fit,
                  video_url,
                  body_text,
                  read_aloud_text,
                  tts_lang,
                  tip_text,
                  guide_image: v,
                  pages,
                  page_turn_style: pageTurn,
                });
              }}
              disabled={busy}
              compact
            />
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-3 text-sm font-semibold text-neutral-800">Preview</p>
          <p className="mb-1 text-xs font-medium text-neutral-600">Story</p>
          <div className="relative mb-4 aspect-video w-full max-w-md overflow-hidden rounded border border-neutral-300 bg-white">
            {multi && selectedPage?.background_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedPage.background_image_url}
                alt=""
                className={`h-full w-full ${
                  (selectedPage.image_fit ?? image_fit) === "contain" ? "object-contain" : "object-cover"
                }`}
              />
            ) : !multi && image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image_url}
                alt=""
                className={`h-full w-full ${image_fit === "contain" ? "object-contain" : "object-cover"}`}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                No story image
              </div>
            )}
          </div>
          {(tip_text || guide_image) ? (
            <>
              <p className="mb-1 text-xs font-medium text-neutral-600">Guide</p>
              <div className="flex gap-3 rounded border border-amber-200 bg-amber-50 p-2">
                {guide_image ? (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded border border-neutral-300">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={guide_image} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : null}
                <p className="text-sm text-neutral-800">{tip_text || "—"}</p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
