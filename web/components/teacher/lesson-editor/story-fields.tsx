"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import {
  CanvasViewport,
  type CanvasViewportHandle,
} from "@/components/teacher/lesson-editor/CanvasViewport";
import {
  defaultRegion,
  nextRegionId,
  RectRegionEditor,
  type RectPercent,
} from "@/components/teacher/lesson-editor/RectRegionEditor";
import { StoryItemLayerContent } from "@/components/story/StoryItemLayerContent";
import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import { AudioUrlControls } from "@/components/teacher/media/AudioUrlControls";
import {
  storyAnimationPresetSchema,
  storyPayloadSchema,
  resolveStoryItemImageUrl,
  getItemTapGroupSatisfiedSequences,
  getPhasePoolQuotaMetSequences,
  type ScreenPayload,
  type StoryActionSequence,
  type StoryActionStep,
  type StoryCastEntry,
  type StoryClickAction,
  type StoryIdleAnimation,
  type StoryItem,
  type StoryPage,
  type StoryPagePhase,
  STORY_IDLE_PRESET_IDS,
} from "@/lib/lesson-schemas";
import {
  pickPathPanelPlacement,
  rectsOverlap,
  type PathPanelPlacement,
} from "@/lib/path-panel-avoidance";
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
import { MEDIA_PICKER_PAGE_SIZE } from "@/components/teacher/media/mediaPickerConstants";
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

const STORY_CANVAS_UNDO_MAX = 50;

function deepCloneStoryPages(src: StoryPage[]): StoryPage[] {
  return JSON.parse(JSON.stringify(src)) as StoryPage[];
}

/** Deep-clone items with new ids; remaps internal item_id / trigger wiring within the copied set. */
function cloneStoryItemsWithFreshIds(source: StoryItem[]): StoryItem[] {
  const raw = JSON.parse(JSON.stringify(source)) as StoryItem[];
  const itemIdMap = new Map<string, string>();
  for (const it of raw) {
    itemIdMap.set(it.id, newEntityId("item"));
  }

  return raw.map((it) => {
    const oldItemId = it.id;
    const newItemId = itemIdMap.get(oldItemId)!;

    let on_click = it.on_click;
    if (it.on_click?.triggers?.length) {
      const triggerIdMap = new Map<string, string>();
      const oldTriggers = it.on_click.triggers;
      for (let idx = 0; idx < oldTriggers.length; idx++) {
        const tr = oldTriggers[idx]!;
        const oldTid = tr.trigger_id ?? `${oldItemId}:tr:${idx}`;
        const newTid = newEntityId("taptr");
        if (tr.trigger_id) triggerIdMap.set(tr.trigger_id, newTid);
        triggerIdMap.set(oldTid, newTid);
      }
      const triggers = oldTriggers.map((tr, idx) => {
        const oldTid = tr.trigger_id ?? `${oldItemId}:tr:${idx}`;
        const newTid = triggerIdMap.get(oldTid)!;
        return {
          ...tr,
          trigger_id: newTid,
          item_id:
            tr.item_id && itemIdMap.has(tr.item_id) ? itemIdMap.get(tr.item_id)! : tr.item_id,
          after_trigger_id:
            tr.after_trigger_id && triggerIdMap.has(tr.after_trigger_id) ?
              triggerIdMap.get(tr.after_trigger_id)
            : tr.after_trigger_id,
        };
      });
      on_click = { ...it.on_click, triggers };
    }

    const tap_speeches = it.tap_speeches?.map((entry) => ({
      ...entry,
      id: newEntityId("tapspeech"),
    }));

    const action_sequences = it.action_sequences?.map((seq) => {
      const newSeqId = newEntityId("seq");
      const stepIdMap = new Map<string, string>();
      for (const step of seq.steps) {
        stepIdMap.set(step.id, newEntityId("step"));
      }
      return {
        ...seq,
        id: newSeqId,
        steps: seq.steps.map((step) => ({
          ...step,
          id: stepIdMap.get(step.id)!,
          target_item_id:
            step.target_item_id && itemIdMap.has(step.target_item_id) ?
              itemIdMap.get(step.target_item_id)
            : step.target_item_id,
          after_step_id:
            step.after_step_id && stepIdMap.has(step.after_step_id) ?
              stepIdMap.get(step.after_step_id)
            : step.after_step_id,
          smart_line_lines: step.smart_line_lines?.map((line) => ({
            ...line,
            id: newEntityId("smartline"),
          })),
        })),
      };
    });

    const idle_animations = it.idle_animations?.map((idle) => ({
      ...idle,
      id: newEntityId("idle"),
    }));

    return {
      ...it,
      id: newItemId,
      on_click,
      tap_speeches,
      action_sequences,
      idle_animations,
    };
  });
}

function labelClass() {
  return "mt-2 block text-sm font-medium text-neutral-800";
}

function clampPercentInput(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Drag payload for placing a cast-linked image on the scene canvas. */
const STORY_CAST_DRAG_MIME = "application/x-lesson-story-cast-id";

function clientPointToStagePercent(
  el: HTMLElement,
  clientX: number,
  clientY: number,
): { x_percent: number; y_percent: number } {
  const r = el.getBoundingClientRect();
  const x = ((clientX - r.left) / Math.max(1, r.width)) * 100;
  const y = ((clientY - r.top) / Math.max(1, r.height)) * 100;
  return {
    x_percent: clampPercentInput(x, 0, 100),
    y_percent: clampPercentInput(y, 0, 100),
  };
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

function storyStepWithKind(prev: StoryActionStep, kind: StoryActionStep["kind"]): StoryActionStep {
  const id = prev.id;
  const timing = prev.timing ?? "simultaneous";
  const delay_ms = prev.delay_ms;
  const play_once = prev.play_once;
  const after_step_id = prev.after_step_id;
  switch (kind) {
    case "emphasis":
      return {
        id,
        kind,
        timing,
        delay_ms,
        play_once,
        after_step_id,
        target_item_id: prev.target_item_id,
        emphasis_preset: prev.emphasis_preset ?? "grow",
        duration_ms: prev.duration_ms ?? 500,
      };
    case "move":
      return {
        id,
        kind,
        timing,
        delay_ms,
        play_once,
        after_step_id,
        target_item_id: prev.target_item_id,
        duration_ms: prev.duration_ms,
      };
    case "show_item":
    case "hide_item":
      return {
        id,
        kind,
        timing,
        delay_ms,
        play_once,
        after_step_id,
        target_item_id: prev.target_item_id,
      };
    case "play_sound":
      return {
        id,
        kind,
        timing,
        delay_ms,
        play_once,
        after_step_id,
        target_item_id: prev.target_item_id,
        sound_url: prev.sound_url,
      };
    case "tts":
      return {
        id,
        kind,
        timing,
        delay_ms,
        play_once,
        after_step_id,
        tts_text: prev.tts_text,
        tts_lang: prev.tts_lang,
      };
    case "smart_line":
      return {
        id,
        kind,
        timing,
        delay_ms,
        play_once,
        after_step_id,
        target_item_id: prev.target_item_id,
        smart_line_lines: prev.smart_line_lines,
        tts_lang: prev.tts_lang,
      };
    case "info_popup":
      return {
        id,
        kind,
        timing,
        delay_ms,
        play_once,
        after_step_id,
        popup_title: prev.popup_title ?? "Info",
        popup_body: prev.popup_body ?? "",
        popup_image_url: prev.popup_image_url,
        popup_video_url: prev.popup_video_url,
      };
    case "goto_page":
      return {
        id,
        kind,
        timing,
        delay_ms,
        play_once,
        after_step_id,
        goto_target: prev.goto_target ?? "next_page",
        goto_page_id: prev.goto_page_id,
      };
    default:
      return { ...prev, kind };
  }
}

function itemDisplayLabel(it: StoryItem): string {
  const n = it.name?.trim();
  const k = it.kind ?? "image";
  if (!n && k === "text") {
    const t = it.text?.trim();
    if (t) return t.slice(0, 24);
  }
  if (!n && k === "button") {
    const t = it.text?.trim();
    if (t) return t.slice(0, 24);
  }
  if (!n && k === "shape") return "Shape";
  if (!n && k === "line") return "Line";
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
    registry_id: prev?.registry_id,
    kind: prev?.kind ?? "image",
    image_url:
      prev?.image_url?.trim() ?
        prev.image_url
      : prev?.registry_id?.trim() ?
        undefined
      : fallbackImage,
    text: prev?.text,
    text_color: prev?.text_color,
    text_size_px: prev?.text_size_px,
    color_hex: prev?.color_hex,
    line_width_px: prev?.line_width_px,
    x_percent: r.x_percent,
    y_percent: r.y_percent,
    w_percent: r.w_percent,
    h_percent: r.h_percent,
    show_card: prev?.show_card ?? true,
    show_on_start: prev?.show_on_start ?? true,
    image_scale: prev?.image_scale ?? 1,
    image_flip_horizontal: prev?.image_flip_horizontal,
    image_flip_vertical: prev?.image_flip_vertical,
    z_index: prev?.z_index ?? 0,
    draggable_mode: prev?.draggable_mode ?? "none",
    drop_target_id: prev?.drop_target_id,
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

function pathPanelClassForPlacement(p: PathPanelPlacement): string {
  const base =
    "pointer-events-auto absolute z-[11] max-w-[min(100%,20rem)] rounded-md border border-fuchsia-300 bg-white/95 p-2 text-xs shadow";
  switch (p) {
    case "tl":
      return `${base} left-2 top-2`;
    case "tr":
      return `${base} right-2 top-2 left-auto`;
    case "bl":
      return `${base} left-2 bottom-2 top-auto`;
    case "br":
      return `${base} right-2 bottom-2 left-auto top-auto`;
    case "strip":
      return `${base} left-2 right-2 bottom-2 top-auto max-h-[min(42%,14rem)] overflow-y-auto`;
  }
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
  const [image_fit, setImageFit] = useState<"cover" | "contain">(initial.image_fit ?? "contain");
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
          image_fit: initial.image_fit ?? "contain",
          video_url: initial.video_url || undefined,
          body_text: initial.body_text,
          read_aloud_text: initial.read_aloud_text || undefined,
          items: [],
        },
      ],
  );
  const pagesRef = useRef(pages);
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);
  const [pageTurn, setPageTurn] = useState<"slide" | "curl">(
    initial.page_turn_style ?? "curl",
  );
  const [layoutMode, setLayoutMode] = useState<"book" | "slide">(
    initial.layout_mode ?? "book",
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
  const [castRegistryMenuOpen, setCastRegistryMenuOpen] = useState(false);
  const [cast, setCast] = useState<StoryCastEntry[]>(() => [...(initial.cast ?? [])]);
  const [selectedAnimationRowId, setSelectedAnimationRowId] = useState<string | null>(null);
  const [animationEditor, setAnimationEditor] = useState<AnimationEditorState | null>(null);
  const [dragSummaryStepIdx, setDragSummaryStepIdx] = useState<number | null>(null);
  const [dragEditorStepIdx, setDragEditorStepIdx] = useState<number | null>(null);
  const [pageContentMenuOpen, setPageContentMenuOpen] = useState(false);
  const [phasePinned, setPhasePinned] = useState(false);
  const [objectPinned, setObjectPinned] = useState(false);
  const [pageContentPinned, setPageContentPinned] = useState(false);
  const [bgChangeOverlayOpen, setBgChangeOverlayOpen] = useState(false);
  const [bgPresetAssets, setBgPresetAssets] = useState<MediaAssetRow[]>([]);
  const [bgPresetTotal, setBgPresetTotal] = useState(0);
  const [bgPresetLoading, setBgPresetLoading] = useState(false);
  const [bgPresetLoadingMore, setBgPresetLoadingMore] = useState(false);
  const [bgPresetErr, setBgPresetErr] = useState<string | null>(null);
  const [bgPresetQuery, setBgPresetQuery] = useState("");
  const [bgVideoUploading, setBgVideoUploading] = useState(false);
  const [bgVideoErr, setBgVideoErr] = useState<string | null>(null);
  const [bgVideoLibraryOpen, setBgVideoLibraryOpen] = useState(false);
  const [bgVideoLibraryAssets, setBgVideoLibraryAssets] = useState<MediaAssetRow[]>([]);
  const [bgVideoLibraryTotal, setBgVideoLibraryTotal] = useState(0);
  const [bgVideoLibraryQuery, setBgVideoLibraryQuery] = useState("");
  const [bgVideoLibraryLoading, setBgVideoLibraryLoading] = useState(false);
  const [bgVideoLibraryLoadingMore, setBgVideoLibraryLoadingMore] = useState(false);
  const [bgVideoLibraryErr, setBgVideoLibraryErr] = useState<string | null>(null);
  const [pathEditItemId, setPathEditItemId] = useState<string | null>(null);
  const [pathEditMode, setPathEditMode] = useState<"set_start" | "draw">("set_start");
  const [pathDraftWaypoints, setPathDraftWaypoints] = useState<
    Array<{ x_percent: number; y_percent: number }>
  >([]);
  const [pathDraftDurationMs, setPathDraftDurationMs] = useState(2000);
  /** CSS easing string; empty = omit (player uses linear). */
  const [pathDraftEasing, setPathDraftEasing] = useState("");
  const [pathSyncItemToStartOnSave, setPathSyncItemToStartOnSave] = useState(true);
  const [pathPanelPlacement, setPathPanelPlacement] = useState<PathPanelPlacement>("tl");
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
  const pathPanelOverlayRef = useRef<HTMLDivElement | null>(null);
  const pathPanelRef = useRef<HTMLDivElement | null>(null);
  const storyEditorColumnRef = useRef<HTMLDivElement | null>(null);
  const storySubBarRef = useRef<HTMLDivElement | null>(null);
  const storyFixedBarRef = useRef<HTMLDivElement | null>(null);
  const storyCanvasViewportRef = useRef<CanvasViewportHandle | null>(null);
  const [storyColumnBarRect, setStoryColumnBarRect] = useState({ left: 0, width: 0 });
  const [storyFixedBarHeight, setStoryFixedBarHeight] = useState(72);
  /** Pixel height of the sticky story chrome (View / pages / Animations row) — drives right-column `position:sticky` `top` and max-height. */
  const [storySubBarHeightPx, setStorySubBarHeightPx] = useState(48);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const lastLocalSigRef = useRef<string>("");
  const storyCanvasUndoRef = useRef<StoryPage[][]>([]);
  const storyCanvasRedoRef = useRef<StoryPage[][]>([]);
  const storyItemsClipboardRef = useRef<StoryItem[] | null>(null);

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
            image_fit: initial.image_fit ?? "contain",
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
          (loadedPages[0]?.image_fit ?? initial.image_fit ?? "contain")
        : (initial.image_fit ?? "contain"),
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
      layout_mode: initial.layout_mode ?? "book",
      cast: initial.cast ?? [],
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
    setImageFit(initial.image_fit ?? "contain");
    setVideoUrl(initial.video_url ?? "");
    setBody(initial.body_text);
    setRead(initial.read_aloud_text ?? "");
    setTts(initial.tts_lang ?? "en-US");
    setTip(initial.guide?.tip_text ?? "");
    setGuideImg(initial.guide?.image_url ?? "");
    setPages(loadedPages);
    setPageTurn(initial.page_turn_style ?? "curl");
    setLayoutMode(initial.layout_mode ?? "book");
    setCast([...(initial.cast ?? [])]);
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
      layout_mode?: "book" | "slide";
      cast?: StoryCastEntry[];
    }) => {
      const pg = opts.pages.map(sanitizePageForPayload);
      const multiOn = pg.length > 0;
      const first = pg[0];
      const lm = opts.layout_mode ?? layoutMode;
      const castForPayload = "cast" in opts ? (opts.cast ?? []) : cast;
      const castOut = castForPayload.length > 0 ? castForPayload : undefined;
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
        layout_mode: lm,
        cast: castOut,
        payload_version: castOut && castOut.length > 0 ? (2 as const) : undefined,
      };
      emitLive(onLivePayload, storyPayloadSchema, raw);
      const sig = stableStorySignature(storyPayloadSchema, raw);
      lastLocalSigRef.current = sig;
      return sig;
    },
    [cast, layoutMode, onLivePayload],
  );

  const pushEmit = useCallback(
    (nextPages: StoryPage[], overrides?: Partial<Parameters<typeof emit>[0]>) => {
      setPages(nextPages);
      const hasCast = overrides != null && "cast" in overrides;
      const resolvedCast = hasCast ? (overrides!.cast ?? []) : cast;
      if (hasCast) setCast(overrides!.cast ?? []);
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
        layout_mode: layoutMode,
        ...overrides,
        cast: resolvedCast,
      });
    },
    [
      body_text,
      cast,
      emit,
      guide_image,
      image_url,
      image_fit,
      layoutMode,
      read_aloud_text,
      tip_text,
      tts_lang,
      video_url,
      pageTurn,
    ],
  );

  const recordStoryCanvasUndo = useCallback(() => {
    const snap = deepCloneStoryPages(pagesRef.current);
    storyCanvasUndoRef.current.push(snap);
    if (storyCanvasUndoRef.current.length > STORY_CANVAS_UNDO_MAX) {
      storyCanvasUndoRef.current.shift();
    }
    storyCanvasRedoRef.current = [];
  }, []);

  const performStoryCanvasUndo = useCallback(() => {
    if (storyCanvasUndoRef.current.length === 0) return;
    const prev = storyCanvasUndoRef.current.pop()!;
    storyCanvasRedoRef.current.push(deepCloneStoryPages(pagesRef.current));
    const page = prev.find((p) => p.id === selPageId) ?? prev[0];
    const validIds = new Set(page?.items.map((i) => i.id) ?? []);
    const nextIds = selItemIds.filter((id) => validIds.has(id));
    const nextSingle =
      selItemId && validIds.has(selItemId) ? selItemId : (nextIds[0] ?? null);
    setSelItemIds(nextIds.length > 0 ? nextIds : nextSingle ? [nextSingle] : []);
    setSelItemId(nextSingle);
    pushEmit(prev);
  }, [pushEmit, selItemId, selItemIds, selPageId]);

  const performStoryCanvasRedo = useCallback(() => {
    if (storyCanvasRedoRef.current.length === 0) return;
    const nextSnap = storyCanvasRedoRef.current.pop()!;
    storyCanvasUndoRef.current.push(deepCloneStoryPages(pagesRef.current));
    if (storyCanvasUndoRef.current.length > STORY_CANVAS_UNDO_MAX) {
      storyCanvasUndoRef.current.shift();
    }
    const page = nextSnap.find((p) => p.id === selPageId) ?? nextSnap[0];
    const validIds = new Set(page?.items.map((i) => i.id) ?? []);
    const nextIds = selItemIds.filter((id) => validIds.has(id));
    const nextSingle =
      selItemId && validIds.has(selItemId) ? selItemId : (nextIds[0] ?? null);
    setSelItemIds(nextIds.length > 0 ? nextIds : nextSingle ? [nextSingle] : []);
    setSelItemId(nextSingle);
    pushEmit(nextSnap);
  }, [pushEmit, selItemId, selItemIds, selPageId]);

  const spawnItemFromCastDrop = useCallback(
    (castId: string, clientX: number, clientY: number) => {
      if (!selectedPage || busy) return;
      const entry = cast.find((c) => c.id === castId);
      if (!entry) return;
      const root = sceneCanvasRef.current;
      if (!root) return;
      const { x_percent: cx, y_percent: cy } = clientPointToStagePercent(root, clientX, clientY);
      recordStoryCanvasUndo();
      const id = nextRegionId(selectedPage.items.map(storyItemToRect), "item");
      const w = 18;
      const h = 14;
      let x = cx - w / 2;
      let y = cy - h / 2;
      x = clampPercentInput(x, 0, 100 - w);
      y = clampPercentInput(y, 0, 100 - h);
      const fallback =
        "https://placehold.co/120x80/f1f5f9/334155?text=Item";
      const castHasImg = !!entry.image_url?.trim();
      const newItem: StoryItem = {
        id,
        x_percent: x,
        y_percent: y,
        w_percent: w,
        h_percent: h,
        kind: "image",
        registry_id: entry.id,
        image_url: castHasImg ? undefined : fallback,
        image_scale: 1,
        show_card: true,
        show_on_start: true,
        z_index: selectedPage.items.length,
        enter: { preset: "fade_in", duration_ms: 500 },
        name: entry.name?.trim() || undefined,
      };
      const next = pages.map((p) =>
        p.id === selectedPage.id ? { ...p, items: [...p.items, newItem] } : p,
      );
      selectCanvasItem(id);
      pushEmit(next);
    },
    [busy, cast, pages, pushEmit, recordStoryCanvasUndo, selectCanvasItem, selectedPage],
  );

  const copySelectedCanvasItems = useCallback(() => {
    if (!selectedPage) return;
    const ids =
      selItemIds.length > 0 ? selItemIds : selItemId ? [selItemId] : [];
    if (ids.length === 0) return;
    const picked = ids
      .map((id) => selectedPage.items.find((it) => it.id === id))
      .filter((x): x is StoryItem => !!x);
    if (picked.length === 0) return;
    storyItemsClipboardRef.current = JSON.parse(JSON.stringify(picked)) as StoryItem[];
  }, [selectedPage, selItemId, selItemIds]);

  const pasteCanvasItems = useCallback(() => {
    if (!selectedPage || busy) return;
    const clip = storyItemsClipboardRef.current;
    if (!clip?.length) return;
    if (!(selectedPage.background_image_url ?? image_url)) return;
    recordStoryCanvasUndo();
    const dup = cloneStoryItemsWithFreshIds(clip);
    const maxZ = selectedPage.items.reduce((m, it) => Math.max(m, it.z_index ?? 0), -1);
    const withZ = dup.map((it, i) => ({
      ...it,
      x_percent: clampPercentInput(it.x_percent + 2, 0, 100 - it.w_percent),
      y_percent: clampPercentInput(it.y_percent + 2, 0, 100 - it.h_percent),
      z_index: maxZ + 1 + i,
    }));
    const next = pages.map((p) =>
      p.id === selectedPage.id ? { ...p, items: [...p.items, ...withZ] } : p,
    );
    const newIds = withZ.map((it) => it.id);
    setSelItemIds(newIds);
    setSelItemId(newIds[0] ?? null);
    pushEmit(next);
  }, [
    busy,
    image_url,
    pages,
    pushEmit,
    recordStoryCanvasUndo,
    selectedPage,
  ]);

  const duplicateCanvasItems = useCallback(() => {
    if (!selectedPage || busy) return;
    if (!(selectedPage.background_image_url ?? image_url)) return;
    const ids =
      selItemIds.length > 0 ? selItemIds : selItemId ? [selItemId] : [];
    if (ids.length === 0) return;
    const picked = ids
      .map((id) => selectedPage.items.find((it) => it.id === id))
      .filter((x): x is StoryItem => !!x);
    if (picked.length === 0) return;
    recordStoryCanvasUndo();
    const dup = cloneStoryItemsWithFreshIds(
      JSON.parse(JSON.stringify(picked)) as StoryItem[],
    );
    const maxZ = selectedPage.items.reduce((m, it) => Math.max(m, it.z_index ?? 0), -1);
    const withZ = dup.map((it, i) => ({
      ...it,
      x_percent: clampPercentInput(it.x_percent + 2, 0, 100 - it.w_percent),
      y_percent: clampPercentInput(it.y_percent + 2, 0, 100 - it.h_percent),
      z_index: maxZ + 1 + i,
    }));
    const next = pages.map((p) =>
      p.id === selectedPage.id ? { ...p, items: [...p.items, ...withZ] } : p,
    );
    const newIds = withZ.map((it) => it.id);
    setSelItemIds(newIds);
    setSelItemId(newIds[0] ?? null);
    pushEmit(next);
  }, [
    busy,
    image_url,
    pages,
    pushEmit,
    recordStoryCanvasUndo,
    selectedPage,
    selItemId,
    selItemIds,
  ]);

  const deleteSelectedCanvasItems = useCallback(() => {
    if (!selectedPage || busy) return;
    if (!selItemId && selItemIds.length === 0) return;
    recordStoryCanvasUndo();
    const removeIds = new Set(selItemIds.length > 0 ? selItemIds : [selItemId!]);
    const next = pages.map((p) =>
      p.id === selectedPage.id ? pruneDeletedItemReferences(p, removeIds) : p,
    );
    setSelItemId(null);
    setSelItemIds([]);
    pushEmit(next);
  }, [
    busy,
    pages,
    pushEmit,
    recordStoryCanvasUndo,
    selectedPage,
    selItemId,
    selItemIds,
  ]);

  useEffect(() => {
    if (!multi || !selectedPage) return;
    const canvasActive = !!(selectedPage.background_image_url ?? image_url);
    const onKeyDown = (e: KeyboardEvent) => {
      if (bgChangeOverlayOpen) return;
      if (e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable='true']")) return;

      if (canvasActive && !busy && (e.key === "Delete" || e.key === "Backspace")) {
        const ids =
          selItemIds.length > 0 ? selItemIds : selItemId ? [selItemId] : [];
        if (ids.length === 0) return;
        e.preventDefault();
        deleteSelectedCanvasItems();
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === "z" || e.key === "Z") {
        e.preventDefault();
        if (e.shiftKey) performStoryCanvasRedo();
        else performStoryCanvasUndo();
        return;
      }
      if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        performStoryCanvasRedo();
        return;
      }
      if (!canvasActive || busy) return;
      if (e.key === "c" || e.key === "C") {
        const ids =
          selItemIds.length > 0 ? selItemIds : selItemId ? [selItemId] : [];
        if (ids.length === 0) return;
        e.preventDefault();
        copySelectedCanvasItems();
        return;
      }
      if (e.key === "v" || e.key === "V") {
        if (!storyItemsClipboardRef.current?.length) return;
        e.preventDefault();
        pasteCanvasItems();
        return;
      }
      if (e.key === "d" || e.key === "D") {
        const ids =
          selItemIds.length > 0 ? selItemIds : selItemId ? [selItemId] : [];
        if (ids.length === 0) return;
        e.preventDefault();
        duplicateCanvasItems();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    multi,
    selectedPage,
    image_url,
    busy,
    bgChangeOverlayOpen,
    selItemId,
    selItemIds,
    performStoryCanvasUndo,
    performStoryCanvasRedo,
    copySelectedCanvasItems,
    pasteCanvasItems,
    duplicateCanvasItems,
    deleteSelectedCanvasItems,
  ]);

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
    setPathDraftEasing(selectedItem.path?.easing?.trim() ?? "");
    setPathPanelPlacement("tl");
  }, [selectedItem, selectedPage]);

  const cancelPathEdit = useCallback(() => {
    setPathEditItemId(null);
    setPathEditMode("set_start");
    setPathDraftWaypoints([]);
    setPathDraftEasing("");
    setPathPanelPlacement("tl");
  }, []);

  const commitPathEdit = useCallback(() => {
    if (!selectedPage || !pathEditingItem) return;
    const easingTrim = pathDraftEasing.trim();
    const nextPath =
      pathDraftWaypoints.length >= 2 ?
        {
          waypoints: pathDraftWaypoints,
          duration_ms: Math.max(0, pathDraftDurationMs),
          ...(easingTrim ? { easing: easingTrim } : {}),
        }
      : undefined;
    const first = pathDraftWaypoints[0];
    const next = pages.map((p) =>
      p.id === selectedPage.id ?
        {
          ...p,
          items: p.items.map((it) => {
            if (it.id !== pathEditingItem.id) return it;
            if (
              pathSyncItemToStartOnSave &&
              first &&
              nextPath &&
              Number.isFinite(first.x_percent) &&
              Number.isFinite(first.y_percent)
            ) {
              return {
                ...it,
                x_percent: first.x_percent,
                y_percent: first.y_percent,
                path: nextPath,
              };
            }
            return { ...it, path: nextPath };
          }),
        }
      : p,
    );
    pushEmit(next);
    setPathEditItemId(null);
    setPathEditMode("set_start");
    setPathDraftWaypoints([]);
    setPathDraftEasing("");
    setPathPanelPlacement("tl");
  }, [
    pages,
    pathDraftDurationMs,
    pathDraftEasing,
    pathDraftWaypoints,
    pathEditingItem,
    pathSyncItemToStartOnSave,
    pushEmit,
    selectedPage,
  ]);

  useLayoutEffect(() => {
    if (!pathEditActive || !pathEditingItem?.id) return;
    const root = sceneCanvasRef.current;
    const panel = pathPanelRef.current;
    const overlay = pathPanelOverlayRef.current;
    if (!root || !panel || !overlay) return;
    const itemEl = root.querySelector(`[data-region-id="${CSS.escape(pathEditingItem.id)}"]`);
    if (!itemEl) return;
    const id = requestAnimationFrame(() => {
      const ir = itemEl.getBoundingClientRect();
      const pr = panel.getBoundingClientRect();
      const or = overlay.getBoundingClientRect();
      const pad = 8;
      if (!rectsOverlap(ir, pr, pad)) return;
      const next = pickPathPanelPlacement(or, ir, pr.width, pr.height, pad);
      setPathPanelPlacement((prev) => (prev === next ? prev : next));
    });
    return () => cancelAnimationFrame(id);
  }, [
    pathEditActive,
    pathEditingItem?.id,
    pathEditingItem?.h_percent,
    pathEditingItem?.w_percent,
    pathEditingItem?.x_percent,
    pathEditingItem?.y_percent,
    pathEditMode,
    pathPanelPlacement,
  ]);

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
  const showCastPanel = !!selectedPage && castRegistryMenuOpen;
  const showPageContentPanel =
    !!selectedPage &&
    (pageContentPinned || (pageContentMenuOpen && !animationsMenuOpen && !castRegistryMenuOpen));
  const showObjectPanel =
    !!selectedPage && (objectPinned || !!selectedItem);
  const showPhasePanel =
    !!selectedPage &&
    (phasePinned ||
      (!selectedItem && !pageContentMenuOpen && !animationsMenuOpen && !castRegistryMenuOpen));
  /** Must match which panels actually render (e.g. phase needs `selectedPhase`). */
  const phasePanelRendered = !!(showPhasePanel && selectedPhase);
  const visibleEditorPanels = [
    showAnimationsPanel,
    showCastPanel,
    showPageContentPanel,
    showObjectPanel,
    phasePanelRendered,
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
          : seq.event === "tap_group_satisfied" ?
            `Tap pool done · ${ownerItemLabel ?? "item"}`
          : seq.event === "pool_quota_met" ?
            `Phase pool done${phaseLabel ? ` · ${phaseLabel}` : ""}`
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
      pushRows(
        getItemTapGroupSatisfiedSequences(selectedItem),
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
        pushRows(
          getPhasePoolQuotaMetSequences(phase),
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
      pushRows(
        getPhasePoolQuotaMetSequences(selectedPhase),
        "phase",
        selectedPhase.id,
        undefined,
        undefined,
        selectedPhase.name?.trim() || selectedPhase.id,
      );
    }
    return rows;
  }, [selectedPage, selectedPhase, selectedItem]);

  const autoplayAnimationRows = useMemo(
    () =>
      animationRows.filter(
        (r) =>
          r.sequence.event === "page_enter" || r.sequence.event === "phase_enter",
      ),
    [animationRows],
  );

  const tapAnimationRows = useMemo(
    () => animationRows.filter((r) => r.sequence.event === "click"),
    [animationRows],
  );

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

  const idleRowsForPanel = useMemo((): StoryIdleAnimation[] => {
    if (!selectedPage) return [];
    if (selectedItem) return selectedItem.idle_animations ?? [];
    if (
      selectedPhase &&
      pageHasRealPhases &&
      selectedPage.phases?.some((ph) => ph.id === selectedPhase.id)
    ) {
      const ph = selectedPage.phases.find((p) => p.id === selectedPhase.id);
      return ph?.idle_animations ?? [];
    }
    return selectedPage.idle_animations ?? [];
  }, [selectedPage, selectedItem, selectedPhase, pageHasRealPhases]);

  const idleScopeDescription = useMemo(() => {
    if (!selectedPage) return "";
    if (selectedItem) {
      return `Object “${itemDisplayLabel(selectedItem)}” — idles are stored on this item.`;
    }
    if (
      selectedPhase &&
      pageHasRealPhases &&
      selectedPage.phases?.some((ph) => ph.id === selectedPhase.id)
    ) {
      return `Phase “${selectedPhase.name?.trim() || selectedPhase.id.slice(0, 8)}” — each row needs a target object.`;
    }
    return "Whole page — each row needs a target object.";
  }, [selectedPage, selectedItem, selectedPhase, pageHasRealPhases]);

  const patchIdleRow = useCallback(
    (idleId: string, patch: Partial<StoryIdleAnimation>) => {
      if (!selectedPage) return;
      const apply = (list: StoryIdleAnimation[]) =>
        list.map((row) => (row.id === idleId ? { ...row, ...patch } : row));
      if (selectedItem) {
        updatePage(selectedPage.id, {
          items: selectedPage.items.map((it) =>
            it.id === selectedItem.id ?
              { ...it, idle_animations: apply(it.idle_animations ?? []) }
            : it,
          ),
        });
        return;
      }
      if (
        selectedPhase &&
        pageHasRealPhases &&
        selectedPage.phases?.some((ph) => ph.id === selectedPhase.id)
      ) {
        const ph = selectedPage.phases.find((p) => p.id === selectedPhase.id);
        updateCurrentPhaseById(selectedPhase.id, {
          idle_animations: apply(ph?.idle_animations ?? []),
        });
        return;
      }
      updatePage(selectedPage.id, {
        idle_animations: apply(selectedPage.idle_animations ?? []),
      });
    },
    [pageHasRealPhases, selectedItem, selectedPage, selectedPhase, updatePage, updateCurrentPhaseById],
  );

  const removeIdleRow = useCallback(
    (idleId: string) => {
      if (!selectedPage) return;
      const apply = (list: StoryIdleAnimation[]) => list.filter((row) => row.id !== idleId);
      if (selectedItem) {
        updatePage(selectedPage.id, {
          items: selectedPage.items.map((it) =>
            it.id === selectedItem.id ?
              { ...it, idle_animations: apply(it.idle_animations ?? []) }
            : it,
          ),
        });
        return;
      }
      if (
        selectedPhase &&
        pageHasRealPhases &&
        selectedPage.phases?.some((ph) => ph.id === selectedPhase.id)
      ) {
        const ph = selectedPage.phases.find((p) => p.id === selectedPhase.id);
        updateCurrentPhaseById(selectedPhase.id, {
          idle_animations: apply(ph?.idle_animations ?? []),
        });
        return;
      }
      updatePage(selectedPage.id, {
        idle_animations: apply(selectedPage.idle_animations ?? []),
      });
    },
    [pageHasRealPhases, selectedItem, selectedPage, selectedPhase, updatePage, updateCurrentPhaseById],
  );

  const addIdleAnimation = useCallback(() => {
    if (!selectedPage || selectedPage.items.length === 0) return;
    const row: StoryIdleAnimation = {
      id: newEntityId("idle"),
      name: "Idle loop",
      preset: "gentle_float",
      period_ms: 2200,
      amplitude: 0.35,
    };
    if (selectedItem) {
      updatePage(selectedPage.id, {
        items: selectedPage.items.map((it) =>
          it.id === selectedItem.id ?
            { ...it, idle_animations: [...(it.idle_animations ?? []), row] }
          : it,
        ),
      });
      return;
    }
    const withTarget: StoryIdleAnimation = {
      ...row,
      target_item_id: selectedPage.items[0]!.id,
    };
    if (
      selectedPhase &&
      pageHasRealPhases &&
      selectedPage.phases?.some((ph) => ph.id === selectedPhase.id)
    ) {
      const ph = selectedPage.phases.find((p) => p.id === selectedPhase.id);
      updateCurrentPhaseById(selectedPhase.id, {
        idle_animations: [...(ph?.idle_animations ?? []), withTarget],
      });
      return;
    }
    updatePage(selectedPage.id, {
      idle_animations: [...(selectedPage.idle_animations ?? []), withTarget],
    });
  }, [pageHasRealPhases, selectedItem, selectedPage, selectedPhase, updatePage, updateCurrentPhaseById]);

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
      if (step.kind === "smart_line") {
        return {
          ...step,
          smart_line_lines:
            step.smart_line_lines && step.smart_line_lines.length > 0 ?
              step.smart_line_lines
            : [{ id: newEntityId("line"), priority: 100 }],
        };
      }
      let next: StoryActionStep = { ...step, smart_line_lines: undefined };
      if (step.kind === "info_popup") {
        next = {
          ...next,
          target_item_id: undefined,
          goto_target: undefined,
          goto_page_id: undefined,
        };
      } else if (step.kind === "goto_page") {
        next = {
          ...next,
          target_item_id: undefined,
          popup_title: undefined,
          popup_body: undefined,
          popup_image_url: undefined,
          popup_video_url: undefined,
        };
      }
      return next;
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
        limit: MEDIA_PICKER_PAGE_SIZE,
        offset: 0,
      })
        .then(({ rows, total }) => {
          if (!cancelled) {
            setBgVideoLibraryAssets(rows);
            setBgVideoLibraryTotal(total);
          }
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
    if (!bgChangeOverlayOpen) return;
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setBgPresetLoading(true);
      setBgPresetErr(null);
      searchTeacherMedia({
        kind: "image",
        tags: ["background"],
        q: bgPresetQuery.trim(),
        limit: MEDIA_PICKER_PAGE_SIZE,
        offset: 0,
      })
        .then(({ rows, total }) => {
          if (!cancelled) {
            setBgPresetAssets(rows);
            setBgPresetTotal(total);
          }
        })
        .catch((e: unknown) => {
          if (!cancelled) {
            setBgPresetErr(e instanceof Error ? e.message : "Failed to load preset backgrounds");
          }
        })
        .finally(() => {
          if (!cancelled) setBgPresetLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [bgChangeOverlayOpen, bgPresetQuery]);

  const loadMoreBgVideoLibrary = useCallback(async () => {
    if (
      bgVideoLibraryLoadingMore ||
      bgVideoLibraryLoading ||
      bgVideoLibraryAssets.length >= bgVideoLibraryTotal
    ) {
      return;
    }
    setBgVideoLibraryLoadingMore(true);
    setBgVideoLibraryErr(null);
    try {
      const { rows, total } = await searchTeacherMedia({
        kind: "video",
        q: bgVideoLibraryQuery.trim(),
        limit: MEDIA_PICKER_PAGE_SIZE,
        offset: bgVideoLibraryAssets.length,
      });
      setBgVideoLibraryTotal(total);
      setBgVideoLibraryAssets((prev) => [...prev, ...rows]);
    } catch (e: unknown) {
      setBgVideoLibraryErr(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setBgVideoLibraryLoadingMore(false);
    }
  }, [
    bgVideoLibraryLoadingMore,
    bgVideoLibraryLoading,
    bgVideoLibraryAssets.length,
    bgVideoLibraryTotal,
    bgVideoLibraryQuery,
  ]);

  const loadMoreBgPreset = useCallback(async () => {
    if (bgPresetLoadingMore || bgPresetLoading || bgPresetAssets.length >= bgPresetTotal) return;
    setBgPresetLoadingMore(true);
    setBgPresetErr(null);
    try {
      const { rows, total } = await searchTeacherMedia({
        kind: "image",
        tags: ["background"],
        q: bgPresetQuery.trim(),
        limit: MEDIA_PICKER_PAGE_SIZE,
        offset: bgPresetAssets.length,
      });
      setBgPresetTotal(total);
      setBgPresetAssets((prev) => [...prev, ...rows]);
    } catch (e: unknown) {
      setBgPresetErr(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setBgPresetLoadingMore(false);
    }
  }, [
    bgPresetLoadingMore,
    bgPresetLoading,
    bgPresetAssets.length,
    bgPresetTotal,
    bgPresetQuery,
  ]);

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

  useLayoutEffect(() => {
    const col = storyEditorColumnRef.current;
    if (!col) return;

    const updateColumnRect = () => {
      const r = col.getBoundingClientRect();
      setStoryColumnBarRect({ left: r.left, width: r.width });
    };

    const roCol = new ResizeObserver(updateColumnRect);
    roCol.observe(col);
    updateColumnRect();

    const bottomBar = storyFixedBarRef.current;
    let roBottom: ResizeObserver | undefined;
    if (bottomBar) {
      const syncBottom = () => {
        setStoryFixedBarHeight(Math.ceil(bottomBar.getBoundingClientRect().height));
      };
      syncBottom();
      roBottom = new ResizeObserver(syncBottom);
      roBottom.observe(bottomBar);
    }

    const subBar = storySubBarRef.current;
    let roSub: ResizeObserver | undefined;
    if (subBar) {
      const syncSub = () => {
        setStorySubBarHeightPx(Math.ceil(subBar.getBoundingClientRect().height));
      };
      syncSub();
      roSub = new ResizeObserver(syncSub);
      roSub.observe(subBar);
    }

    window.addEventListener("resize", updateColumnRect);
    window.addEventListener("scroll", updateColumnRect, true);

    return () => {
      roCol.disconnect();
      roBottom?.disconnect();
      roSub?.disconnect();
      window.removeEventListener("resize", updateColumnRect);
      window.removeEventListener("scroll", updateColumnRect, true);
    };
  }, [multi, selectedPage?.id, editorRightPanelPct, visibleEditorPanels]);

  const storySceneChromeBottomPad = storyFixedBarHeight + 12;

  return (
    <div ref={rootRef} className="flex min-h-0 min-w-0 flex-1 flex-col space-y-0">
      {multi && selectedPage ? (
        <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-visible bg-sky-50/50 pb-4 pt-0">
          <div
            ref={storySubBarRef}
            className="sticky top-0 z-30 border-b border-sky-200/80 bg-sky-50/95 px-2 py-0.5 backdrop-blur-sm sm:px-3"
          >
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <div className="flex shrink-0 items-center gap-1 border-r border-sky-300/80 pr-1.5">
                <span className="hidden text-[9px] font-bold uppercase tracking-wide text-neutral-500 sm:inline">
                  View
                </span>
                <div className="inline-flex rounded border border-neutral-300 bg-white p-px text-[10px] leading-none">
                  {(["book", "slide"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={busy}
                      className={
                        layoutMode === m ?
                          "rounded px-1.5 py-0.5 font-semibold text-white bg-violet-600"
                        : "rounded px-1.5 py-0.5 font-medium text-neutral-700 hover:bg-neutral-100"
                      }
                      title={
                        m === "book" ?
                          "Book-style player (page turn motion)"
                        : "Slide deck (dots between pages)"
                      }
                      onClick={() => {
                        setLayoutMode(m);
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
                          page_turn_style: pageTurn,
                          layout_mode: m,
                        });
                      }}
                    >
                      {m === "book" ? "Book" : "Slides"}
                    </button>
                  ))}
                </div>
                <label className="flex shrink-0 items-center gap-0.5 text-[9px] text-neutral-600">
                  <span className="hidden font-semibold uppercase tracking-wide sm:inline">Turn</span>
                  <select
                    className="max-w-[6.5rem] rounded border border-neutral-300 bg-white px-0.5 py-px text-[10px] leading-tight"
                    value={pageTurn}
                    disabled={busy}
                    title="Motion between pages in the student player"
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
                    <option value="curl">Curl</option>
                    <option value="slide">Swipe</option>
                  </select>
                </label>
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-0.5">
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
                className={`rounded-t border px-2 py-0.5 text-[10px] leading-tight transition-colors ${
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
                className="rounded-t border border-dashed border-sky-300 bg-sky-100/30 px-2 py-0.5 text-[10px] leading-tight text-sky-900 transition-colors hover:bg-white/70"
              onClick={addPage}
            >
              +Pg
            </button>
            {pages.length > 1 ? (
              <button
                type="button"
                disabled={busy}
                className="rounded-t border border-transparent bg-sky-100/30 px-2 py-0.5 text-[10px] font-semibold leading-tight text-red-700 transition-colors hover:border-red-200 hover:bg-white/80"
                onClick={() => removePage(selectedPage.id)}
                title="Remove selected page"
              >
                Del
              </button>
            ) : null}
              <span className="mx-0.5 h-4 w-px shrink-0 bg-violet-200" aria-hidden />
              {(editorPhasesForPage ?? []).map((ph, i) => (
                <div key={ph.id} className="flex items-stretch">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setSelPhaseId(ph.id);
                      setSelItemId(null);
                    }}
                    className={`rounded-l border px-1.5 py-0.5 text-[10px] leading-tight transition-colors ${
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
                      className="rounded-r border border-l-0 border-violet-200 bg-violet-50 px-0.5 text-[9px] font-bold text-violet-800 hover:bg-violet-100"
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
                className="rounded border border-dashed border-violet-400 bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-900 hover:bg-violet-100"
                onClick={addStoryPhase}
              >
                +Ph
              </button>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setAnimationsMenuOpen((v) => {
                      const next = !v;
                      if (next) setCastRegistryMenuOpen(false);
                      return next;
                    });
                  }}
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none transition-colors ${
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
                  onClick={() => {
                    setCastRegistryMenuOpen((v) => {
                      const next = !v;
                      if (next) setAnimationsMenuOpen(false);
                      return next;
                    });
                  }}
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none transition-colors ${
                    castRegistryMenuOpen
                      ? "border-emerald-500 bg-emerald-100 text-emerald-950 hover:bg-emerald-200"
                      : "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                  }`}
                  title={
                    castRegistryMenuOpen ? "Close cast / props list" : "Open cast & props (shared characters)"
                  }
                >
                  🎭 Cast
                </button>
                <button
                  type="button"
                  onClick={() => setPageContentMenuOpen((v) => !v)}
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none transition-colors ${
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

          <div className="relative z-0 mt-0 min-h-0 flex-1 overflow-visible pl-1 pr-0.5 sm:pl-2 sm:pr-1">
          <div ref={editorSplitRef} className="mt-0 min-h-0 items-start gap-1 md:flex">
            <div
              ref={storyEditorColumnRef}
              className="min-w-0 max-w-full space-y-4 overflow-visible md:min-w-0 md:flex-1"
              style={{ paddingBottom: storySceneChromeBottomPad }}
            >
            {(selectedPage.background_image_url ?? image_url) ? (
              <CanvasViewport
                ref={storyCanvasViewportRef}
                key={selectedPage.id}
                disabled={busy}
                clip={false}
              >
              <div
                ref={sceneCanvasRef}
                className="relative w-full overflow-visible"
                style={{ containerType: "inline-size" }}
                onDragOver={(e) => {
                  if (busy) return;
                  const types = e.dataTransfer.types ?? [];
                  if (!Array.from(types).includes(STORY_CAST_DRAG_MIME)) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (busy) return;
                  let castId = e.dataTransfer.getData(STORY_CAST_DRAG_MIME).trim();
                  if (!castId) {
                    const plain = e.dataTransfer.getData("text/plain").trim();
                    castId = plain.startsWith("story-cast:") ? plain.slice("story-cast:".length).trim() : "";
                  }
                  if (!castId) return;
                  spawnItemFromCastDrop(castId, e.clientX, e.clientY);
                }}
              >
                <RectRegionEditor
                  clipToStage={false}
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
                      const pk = prev?.kind ?? "image";
                      if (pk !== "text" && pk !== "button") return nextItem;
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
                  onInteractionStart={recordStoryCanvasUndo}
                  disabled={busy}
                  showHorizontalResizeHandle={(r) => {
                    const it = selectedPage.items.find((x) => x.id === r.id);
                    const k = it?.kind ?? "image";
                    return k === "text" || k === "button";
                  }}
                  renderRegion={(r) => {
                    const it = selectedPage.items.find((x) => x.id === r.id);
                    if (!it) return null;
                    const k = it.kind ?? "image";
                    const displayUrl =
                      k === "image" ?
                        (resolveStoryItemImageUrl(it, cast) ?? it.image_url?.trim())
                      : it.image_url?.trim();
                    if (k === "image" && !displayUrl) return null;
                    const dim =
                      !!selectedPhase &&
                      !isItemVisibleInEditorPhase(
                        selectedPhase,
                        it,
                        pageHasRealPhases,
                      );
                    const layerItem =
                      k === "image" && displayUrl ?
                        { ...it, image_url: displayUrl }
                      : it;
                    return (
                      <div
                        className={`h-full w-full${dim ? " opacity-40" : ""}`}
                        title={dim ? "Hidden in this phase (see right panel)" : undefined}
                      >
                        <StoryItemLayerContent item={layerItem} />
                      </div>
                    );
                  }}
                />
                {pathEditActive ? (
                  <div
                    ref={pathPanelOverlayRef}
                    className="pointer-events-none absolute inset-0 z-10"
                  >
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
                    <div
                      ref={pathPanelRef}
                      className={pathPanelClassForPlacement(pathPanelPlacement)}
                    >
                      <p className="font-semibold text-fuchsia-900">
                        Set move path · {itemDisplayLabel(pathEditingItem)}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-neutral-600">
                        Waypoints use stage percent coordinates; values below 0 or above 100 start
                        off-screen. Add a <span className="font-semibold">move</span> step to the
                        page&apos;s <span className="font-semibold">page enter</span> sequence (or
                        legacy timeline) so the path runs when students open the page.
                      </p>
                      <p className="mt-1 text-neutral-700">
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
                      <label className="mt-2 block text-[11px] text-neutral-700">
                        Easing
                        <select
                          className="mt-1 w-full rounded border bg-white px-1 py-0.5 text-xs"
                          value={pathDraftEasing}
                          onChange={(e) => setPathDraftEasing(e.target.value)}
                        >
                          <option value="">Linear (default)</option>
                          <option value="ease">ease</option>
                          <option value="ease-in">ease-in</option>
                          <option value="ease-out">ease-out</option>
                          <option value="ease-in-out">ease-in-out</option>
                          <option value="cubic-bezier(0.22, 1, 0.36, 1)">smooth out</option>
                        </select>
                      </label>
                      <label className="mt-2 flex cursor-pointer items-start gap-2 text-[11px] text-neutral-700">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={pathSyncItemToStartOnSave}
                          onChange={(e) => setPathSyncItemToStartOnSave(e.target.checked)}
                        />
                        <span>
                          On save, move object to path start (first waypoint) so layout matches the
                          beginning of the path.
                        </span>
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
              </CanvasViewport>
            ) : (
              <p className="text-sm text-amber-800">
                Add a background image to place and drag items.
              </p>
            )}
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
              className="min-w-0 w-full space-y-2 md:flex md:min-h-0 md:w-[var(--editor-right-width)] md:flex-col md:gap-2 md:overflow-y-auto md:self-start md:space-y-0"
              style={
                {
                  "--editor-right-width": `clamp(20rem, ${editorRightPanelPct}%, 52rem)`,
                  maxHeight: `calc(100dvh - var(--lesson-editor-toolbar-height, 2.75rem) - ${storySubBarHeightPx}px)`,
                } as unknown as CSSProperties
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
                        title="Adds a page-start, phase-start, or tap animation from your current selection (object / phase / scene)."
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
                  <div className="h-full min-h-0 space-y-3 overflow-y-auto">
                    {selectedItem ? (
                      <p className="px-1 text-[11px] text-fuchsia-900/90">
                        Autoplay lists page and phase starts that touch{" "}
                        <strong>{itemDisplayLabel(selectedItem)}</strong>
                        {selectedPhase ? (
                          <>
                            {" "}
                            (phase <strong>{selectedPhase.name?.trim() || selectedPhase.id}</strong>
                            ).
                          </>
                        ) : (
                          "."
                        )}{" "}
                        Tap animations are interactions on this object.
                      </p>
                    ) : (
                      <p className="px-1 text-[11px] text-fuchsia-900/90">
                        <strong>Autoplay</strong> runs when the page or a phase begins (motion, show/hide,
                        timed sounds). <strong>Tap</strong> lists click-driven animations; select an object
                        to edit those.
                      </p>
                    )}
                    <div className="space-y-1.5 rounded-lg border border-violet-200 bg-violet-50/50 p-2">
                      <p className="px-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900">
                        Autoplay
                      </p>
                      <label className="flex cursor-pointer items-start gap-2 px-0.5 text-[11px] font-medium text-violet-950">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={selectedPage.auto_play ?? false}
                          onChange={(e) =>
                            updatePage(selectedPage.id, { auto_play: e.target.checked })
                          }
                        />
                        <span>
                          Run autoplay when the student opens this page (page- and phase-start sequences
                          below). Sounds that need a user gesture still wait until they tap Listen.
                        </span>
                      </label>
                      <div className="space-y-2 rounded-lg border border-violet-200/90 bg-white/80 p-2">
                        <p className="px-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900">
                          Idle loops
                        </p>
                        <p className="px-0.5 text-[10px] leading-snug text-violet-900/85">
                          {idleScopeDescription} Motion runs in the lesson preview and student player. Respects
                          “reduce motion” in the OS.
                        </p>
                        <div className="px-0.5">
                          <button
                            type="button"
                            disabled={busy || !selectedPage.items.length}
                            title={
                              !selectedPage.items.length ?
                                "Add at least one object to attach idle motion."
                              : "Add a looping animation for the current scope (object, phase, or page)."
                            }
                            onClick={() => addIdleAnimation()}
                            className="rounded border border-violet-400 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-950 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            + Add idle
                          </button>
                        </div>
                        {idleRowsForPanel.length === 0 ? (
                          <p className="px-0.5 text-[11px] text-neutral-600">
                            No idle loops in this scope. Select an object for item-level idles, or deselect
                            and choose a phase (if any) for phase-wide targets.
                          </p>
                        ) : (
                          <div className="max-h-48 space-y-2 overflow-y-auto pr-0.5">
                            {idleRowsForPanel.map((idle) => (
                              <div
                                key={idle.id}
                                className="space-y-1.5 rounded border border-violet-100 bg-violet-50/40 p-2 text-[11px]"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <input
                                    type="text"
                                    className="min-w-0 flex-1 rounded border border-violet-200 bg-white px-1.5 py-0.5 text-[11px]"
                                    value={idle.name ?? ""}
                                    placeholder="Label"
                                    onChange={(e) =>
                                      patchIdleRow(idle.id, {
                                        name: e.target.value || undefined,
                                      })
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="shrink-0 rounded border border-red-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-red-800 hover:bg-red-50"
                                    onClick={() => removeIdleRow(idle.id)}
                                  >
                                    Remove
                                  </button>
                                </div>
                                {!selectedItem ? (
                                  <label className="flex flex-col gap-0.5 text-[10px] font-medium text-violet-950">
                                    Target object
                                    <select
                                      className="rounded border border-violet-200 bg-white px-1 py-0.5 text-[11px]"
                                      value={idle.target_item_id ?? ""}
                                      onChange={(e) =>
                                        patchIdleRow(idle.id, {
                                          target_item_id: e.target.value || undefined,
                                        })
                                      }
                                    >
                                      {selectedPage.items.map((it) => (
                                        <option key={it.id} value={it.id}>
                                          {itemDisplayLabel(it)}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                ) : null}
                                <label className="flex flex-col gap-0.5 text-[10px] font-medium text-violet-950">
                                  Preset
                                  <select
                                    className="rounded border border-violet-200 bg-white px-1 py-0.5 text-[11px]"
                                    value={idle.preset}
                                    onChange={(e) =>
                                      patchIdleRow(idle.id, {
                                        preset: e.target.value as StoryIdleAnimation["preset"],
                                      })
                                    }
                                  >
                                    {STORY_IDLE_PRESET_IDS.map((p) => (
                                      <option key={p} value={p}>
                                        {p.replace(/_/g, " ")}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  <label className="flex flex-col gap-0.5 text-[10px] font-medium text-violet-950">
                                    Period (ms)
                                    <input
                                      type="number"
                                      min={100}
                                      max={60_000}
                                      className="w-24 rounded border border-violet-200 bg-white px-1 py-0.5 text-[11px]"
                                      value={idle.period_ms ?? 2200}
                                      onChange={(e) => {
                                        const v = Number(e.target.value);
                                        patchIdleRow(idle.id, {
                                          period_ms: Number.isFinite(v) ? v : 2200,
                                        });
                                      }}
                                    />
                                  </label>
                                  <label className="flex flex-col gap-0.5 text-[10px] font-medium text-violet-950">
                                    Strength
                                    <input
                                      type="number"
                                      min={0}
                                      max={1}
                                      step={0.05}
                                      className="w-20 rounded border border-violet-200 bg-white px-1 py-0.5 text-[11px]"
                                      value={idle.amplitude ?? 0.35}
                                      onChange={(e) => {
                                        const v = Number(e.target.value);
                                        patchIdleRow(idle.id, {
                                          amplitude: Number.isFinite(v) ? v : 0.35,
                                        });
                                      }}
                                    />
                                  </label>
                                </div>
                                {pageHasRealPhases && selectedPage.phases && selectedPage.phases.length > 0 ?
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-semibold text-violet-900">
                                      Phases (empty = all)
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {selectedPage.phases.map((ph) => {
                                        const allIds = selectedPage.phases!.map((p) => p.id);
                                        const cur = idle.active_phase_ids;
                                        const active =
                                          !cur || cur.length === 0 ?
                                            true
                                          : cur.includes(ph.id);
                                        return (
                                          <label
                                            key={ph.id}
                                            className="flex cursor-pointer items-center gap-1 rounded border border-violet-200/80 bg-white px-1.5 py-0.5 text-[10px]"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={active}
                                              onChange={() => {
                                                const base =
                                                  cur && cur.length > 0 ? [...cur] : [...allIds];
                                                const set = new Set(base);
                                                if (set.has(ph.id)) set.delete(ph.id);
                                                else set.add(ph.id);
                                                if (set.size === 0 || set.size === allIds.length) {
                                                  patchIdleRow(idle.id, {
                                                    active_phase_ids: undefined,
                                                  });
                                                } else {
                                                  patchIdleRow(idle.id, {
                                                    active_phase_ids: [...set],
                                                  });
                                                }
                                              }}
                                            />
                                            <span>{ph.name?.trim() || ph.id.slice(0, 8)}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="overflow-hidden rounded border border-violet-200/80 bg-white">
                        <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-violet-100 bg-violet-50/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-900">
                          <span>Animation</span>
                          <span>Trigger</span>
                          <span>Impacted object</span>
                        </div>
                        <div className="max-h-36 overflow-y-auto">
                          {autoplayAnimationRows.map((row) => (
                            <button
                              key={row.id}
                              type="button"
                              onClick={() => setSelectedAnimationRowId(row.id)}
                              onDoubleClick={() => startAnimationEditor(row)}
                              className={`grid w-full grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-violet-100 px-2 py-1 text-left text-xs transition-colors ${
                                selectedAnimationRowId === row.id
                                  ? "bg-violet-100/70 text-violet-950"
                                  : "bg-white text-neutral-800 hover:bg-violet-50/80"
                              }`}
                            >
                              <span className="truncate">{row.name}</span>
                              <span className="truncate">{row.trigger}</span>
                              <span className="truncate">{row.impacted}</span>
                            </button>
                          ))}
                          {autoplayAnimationRows.length === 0 ? (
                            <p className="px-2 py-2 text-[11px] text-neutral-600">
                              No sequences yet. Deselect objects, pick an optional phase, then{" "}
                              <strong>+ Add animation</strong> for page- or phase-start steps.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="px-0.5 text-[10px] font-bold uppercase tracking-wide text-fuchsia-900">
                        Tap / interaction
                      </p>
                      <div className="overflow-hidden rounded border border-fuchsia-200 bg-white">
                        <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-fuchsia-100 bg-fuchsia-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-900">
                          <span>Animation</span>
                          <span>Trigger</span>
                          <span>Impacted object</span>
                        </div>
                        <div className="max-h-36 overflow-y-auto">
                          {tapAnimationRows.map((row) => (
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
                          {tapAnimationRows.length === 0 ? (
                            <p className="px-2 py-2 text-[11px] text-neutral-600">
                              {selectedItem ?
                                "No tap animations for this object yet. Use + Add animation while it is selected."
                              : "Select an object on the canvas to add or list tap / click animations."}
                            </p>
                          ) : null}
                        </div>
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
                    {selectedItem && selectedPage ? (
                      <div className="mt-2 rounded border border-emerald-200 bg-emerald-50/50 p-2 text-xs">
                        <p className="font-semibold text-emerald-950">Tap pool (parent object)</p>
                        <p className="mb-2 text-[10px] text-neutral-600">
                          Defines a counted tap pool for this object’s children. Add a{" "}
                          <strong>tap_group_satisfied</strong> animation on this object for
                          optional “all done” effects. Phases can reference this pool via{" "}
                          <strong>Tap pool (item group)</strong>.
                        </p>
                        {selectedItem.tap_interaction_group ? (
                          <div className="space-y-2">
                            <label className="block text-[11px] font-medium text-neutral-800">
                              Group id
                              <input
                                className="mt-0.5 w-full rounded border px-1 py-0.5 text-[11px]"
                                value={selectedItem.tap_interaction_group.id}
                                onChange={(e) => {
                                  const id = e.target.value.trim();
                                  if (!id) return;
                                  const tg = selectedItem.tap_interaction_group!;
                                  setPages((prev) =>
                                    prev.map((p) =>
                                      p.id === selectedPage.id ?
                                        {
                                          ...p,
                                          items: p.items.map((it) =>
                                            it.id === selectedItem.id ?
                                              {
                                                ...it,
                                                tap_interaction_group: { ...tg, id },
                                              }
                                            : it,
                                          ),
                                        }
                                      : p,
                                    ),
                                  );
                                }}
                              />
                            </label>
                            <p className="text-[10px] font-medium text-neutral-800">
                              Count taps on these objects
                            </p>
                            <ul className="max-h-28 space-y-0.5 overflow-y-auto text-[11px]">
                              {selectedPage.items
                                .filter((it) => it.id !== selectedItem.id)
                                .map((it) => {
                                  const tg = selectedItem.tap_interaction_group!;
                                  const on = tg.child_item_ids.includes(it.id);
                                  return (
                                    <li key={`tg-ch-${it.id}`}>
                                      <label className="flex items-center gap-1">
                                        <input
                                          type="checkbox"
                                          checked={on}
                                          onChange={() => {
                                            const nextChild = on ?
                                              tg.child_item_ids.filter((x) => x !== it.id)
                                            : [...tg.child_item_ids, it.id];
                                            if (nextChild.length === 0) return;
                                            setPages((prev) =>
                                              prev.map((p) =>
                                                p.id === selectedPage.id ?
                                                  {
                                                    ...p,
                                                    items: p.items.map((x) =>
                                                      x.id === selectedItem.id ?
                                                        {
                                                          ...x,
                                                          tap_interaction_group: {
                                                            ...tg,
                                                            child_item_ids: nextChild,
                                                          },
                                                        }
                                                      : x,
                                                    ),
                                                  }
                                                : p,
                                              ),
                                            );
                                          }}
                                        />
                                        {it.name?.trim() || it.id}
                                      </label>
                                    </li>
                                  );
                                })}
                            </ul>
                            <label className="flex items-center gap-1 text-[11px]">
                              <input
                                type="checkbox"
                                checked={
                                  !!selectedItem.tap_interaction_group.include_parent_in_pool
                                }
                                onChange={(e) => {
                                  const tg = selectedItem.tap_interaction_group!;
                                  setPages((prev) =>
                                    prev.map((p) =>
                                      p.id === selectedPage.id ?
                                        {
                                          ...p,
                                          items: p.items.map((it) =>
                                            it.id === selectedItem.id ?
                                              {
                                                ...it,
                                                tap_interaction_group: {
                                                  ...tg,
                                                  include_parent_in_pool: e.target.checked,
                                                },
                                              }
                                            : it,
                                          ),
                                        }
                                      : p,
                                    ),
                                  );
                                }}
                              />
                              Parent taps count toward pool
                            </label>
                            <label className="block text-[11px] font-medium text-neutral-800">
                              Min distinct objects tapped
                              <input
                                type="number"
                                min={1}
                                className="mt-0.5 w-full rounded border px-1 py-0.5 text-[11px]"
                                value={
                                  selectedItem.tap_interaction_group.min_distinct_items ?? ""
                                }
                                placeholder="(optional)"
                                onChange={(e) => {
                                  const raw = e.target.value.trim();
                                  const v =
                                    raw === "" ? undefined : Math.max(1, Number(raw) || 1);
                                  const tg = selectedItem.tap_interaction_group!;
                                  setPages((prev) =>
                                    prev.map((p) =>
                                      p.id === selectedPage.id ?
                                        {
                                          ...p,
                                          items: p.items.map((it) =>
                                            it.id === selectedItem.id ?
                                              {
                                                ...it,
                                                tap_interaction_group: {
                                                  ...tg,
                                                  min_distinct_items: v,
                                                },
                                              }
                                            : it,
                                          ),
                                        }
                                      : p,
                                    ),
                                  );
                                }}
                              />
                            </label>
                            <label className="block text-[11px] font-medium text-neutral-800">
                              Min total taps on pool (optional)
                              <input
                                type="number"
                                min={1}
                                className="mt-0.5 w-full rounded border px-1 py-0.5 text-[11px]"
                                value={
                                  selectedItem.tap_interaction_group.min_aggregate_taps ?? ""
                                }
                                placeholder="—"
                                onChange={(e) => {
                                  const raw = e.target.value.trim();
                                  const v =
                                    raw === "" ? undefined : Math.max(1, Number(raw) || 1);
                                  const tg = selectedItem.tap_interaction_group!;
                                  setPages((prev) =>
                                    prev.map((p) =>
                                      p.id === selectedPage.id ?
                                        {
                                          ...p,
                                          items: p.items.map((it) =>
                                            it.id === selectedItem.id ?
                                              {
                                                ...it,
                                                tap_interaction_group: {
                                                  ...tg,
                                                  min_aggregate_taps: v,
                                                },
                                              }
                                            : it,
                                          ),
                                        }
                                      : p,
                                    ),
                                  );
                                }}
                              />
                            </label>
                            <label className="block text-[11px] font-medium text-neutral-800">
                              On satisfy sequence (
                              <code className="text-[10px]">tap_group_satisfied</code>)
                              <select
                                className="mt-0.5 w-full rounded border px-1 py-0.5 text-[11px]"
                                value={
                                  selectedItem.tap_interaction_group.on_satisfy_sequence_id ?? ""
                                }
                                onChange={(e) => {
                                  const v = e.target.value.trim();
                                  const tg = selectedItem.tap_interaction_group!;
                                  setPages((prev) =>
                                    prev.map((p) =>
                                      p.id === selectedPage.id ?
                                        {
                                          ...p,
                                          items: p.items.map((it) =>
                                            it.id === selectedItem.id ?
                                              {
                                                ...it,
                                                tap_interaction_group: {
                                                  ...tg,
                                                  on_satisfy_sequence_id: v || undefined,
                                                },
                                              }
                                            : it,
                                          ),
                                        }
                                      : p,
                                    ),
                                  );
                                }}
                              >
                                <option value="">None</option>
                                {getItemTapGroupSatisfiedSequences(selectedItem).map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name?.trim() || s.id}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="button"
                              className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-900 hover:bg-red-100"
                              onClick={() => {
                                setPages((prev) =>
                                  prev.map((p) =>
                                    p.id === selectedPage.id ?
                                      {
                                        ...p,
                                        items: p.items.map((it) =>
                                          it.id === selectedItem.id ?
                                            { ...it, tap_interaction_group: undefined }
                                          : it,
                                        ),
                                      }
                                    : p,
                                  ),
                                );
                              }}
                            >
                              Remove tap pool
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="rounded border border-emerald-300 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100"
                            onClick={() => {
                              const others = selectedPage.items
                                .filter((it) => it.id !== selectedItem.id)
                                .map((it) => it.id);
                              const child_item_ids = others.slice(0, 1);
                              if (child_item_ids.length === 0) return;
                              const gid = `grp_${selectedItem.id.slice(0, 8)}`;
                              setPages((prev) =>
                                prev.map((p) =>
                                  p.id === selectedPage.id ?
                                    {
                                      ...p,
                                      items: p.items.map((it) =>
                                        it.id === selectedItem.id ?
                                          {
                                            ...it,
                                            tap_interaction_group: {
                                              id: gid,
                                              child_item_ids,
                                              include_parent_in_pool: false,
                                              min_distinct_items: 1,
                                              min_taps_per_distinct_item: 1,
                                            },
                                          }
                                        : it,
                                      ),
                                    }
                                  : p,
                                ),
                              );
                            }}
                          >
                            Add tap pool on this object
                          </button>
                        )}
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
              {showCastPanel && selectedPage ? (
                <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-emerald-300/80 bg-emerald-50/60 p-2">
                  <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
                      Cast &amp; props
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded border border-emerald-400 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 hover:bg-emerald-100"
                        onClick={() => {
                          const row: StoryCastEntry = {
                            id: newEntityId("cast"),
                            role: "character",
                            name: undefined,
                            image_url: undefined,
                          };
                          pushEmit(pages, { cast: [...cast, row] });
                        }}
                      >
                        + Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setCastRegistryMenuOpen(false)}
                        className="rounded border border-emerald-300 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 hover:bg-emerald-50"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <p className="mb-2 px-1 text-[11px] leading-snug text-emerald-900/90">
                    Shared identities for characters and props. Drag a row onto the scene to place an
                    instance. Use <strong>Object</strong> to link, unlink, or promote art into the cast.
                  </p>
                  <div className="h-full min-h-0 space-y-2 overflow-y-auto">
                    {cast.length === 0 ? (
                      <p className="px-1 text-xs text-neutral-600">
                        No cast entries yet. Add one here, then set its default image, or promote from a
                        selected canvas object.
                      </p>
                    ) : null}
                    {cast.map((row) => (
                      <div
                        key={row.id}
                        draggable={!busy}
                        onDragStart={(ev) => {
                          if (busy) return;
                          ev.dataTransfer.effectAllowed = "copy";
                          ev.dataTransfer.setData(STORY_CAST_DRAG_MIME, row.id);
                          ev.dataTransfer.setData("text/plain", `story-cast:${row.id}`);
                        }}
                        className="space-y-2 rounded-lg border border-emerald-200 bg-white/90 p-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono text-neutral-500">{row.id.slice(0, 8)}…</span>
                          <button
                            type="button"
                            disabled={busy}
                            className="rounded border border-red-200 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-50"
                            onClick={() => {
                              const fallback =
                                "https://placehold.co/120x80/f1f5f9/334155?text=Item";
                              const nextCast = cast.filter((c) => c.id !== row.id);
                              const nextPages = pages.map((p) => ({
                                ...p,
                                items: p.items.map((it) => {
                                  if (it.registry_id !== row.id) return it;
                                  const resolved =
                                    it.image_url?.trim() || row.image_url?.trim() || fallback;
                                  const { registry_id: _r, ...rest } = it;
                                  return { ...rest, image_url: resolved };
                                }),
                              }));
                              pushEmit(nextPages, { cast: nextCast });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <label className={labelClass()}>
                          Label
                          <input
                            type="text"
                            className="mt-1 w-full rounded border px-2 py-1 text-sm"
                            placeholder="e.g. Hero"
                            value={row.name ?? ""}
                            disabled={busy}
                            onChange={(e) => {
                              const name = e.target.value.trim() || undefined;
                              pushEmit(pages, {
                                cast: cast.map((c) => (c.id === row.id ? { ...c, name } : c)),
                              });
                            }}
                          />
                        </label>
                        <label className={labelClass()}>
                          Role
                          <select
                            className="mt-1 w-full rounded border px-2 py-1 text-sm"
                            value={row.role}
                            disabled={busy}
                            onChange={(e) => {
                              const role = e.target.value as StoryCastEntry["role"];
                              pushEmit(pages, {
                                cast: cast.map((c) => (c.id === row.id ? { ...c, role } : c)),
                              });
                            }}
                          >
                            <option value="character">Character</option>
                            <option value="prop">Prop</option>
                          </select>
                        </label>
                        <MediaUrlControls
                          label="Default image URL"
                          value={row.image_url ?? ""}
                          onChange={async (v) => {
                            pushEmit(pages, {
                              cast: cast.map((c) =>
                                c.id === row.id ? { ...c, image_url: v || undefined } : c,
                              ),
                            });
                          }}
                          disabled={busy}
                          compact
                        />
                        <p className="text-[10px] text-neutral-500">
                          Drag this card onto the scene (with a background) to add a linked instance.
                        </p>
                      </div>
                    ))}
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
                        pushEmit={(next, overrides) => pushEmit(next, overrides)}
                        cast={cast}
                        busy={busy}
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
          <div
            ref={storyFixedBarRef}
            className="pointer-events-auto fixed z-[45] border-t border-neutral-200/90 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm"
            style={
              {
                left: storyColumnBarRect.left,
                width: storyColumnBarRect.width,
                bottom: 0,
                paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
              } as CSSProperties
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-2 py-2 sm:px-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy || !(selectedPage.background_image_url ?? image_url)}
                  className="rounded border bg-white px-2 py-1 text-sm font-semibold"
                  onClick={() => {
                    recordStoryCanvasUndo();
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
                    recordStoryCanvasUndo();
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
                  disabled={busy || !(selectedPage.background_image_url ?? image_url)}
                  className="rounded border border-teal-200 bg-white px-2 py-1 text-sm font-semibold text-teal-900"
                  onClick={() => {
                    recordStoryCanvasUndo();
                    const id = nextRegionId(
                      selectedPage.items.map(storyItemToRect),
                      "shape",
                    );
                    const base = defaultRegion(id);
                    const newItem: StoryItem = {
                      ...base,
                      kind: "shape",
                      color_hex: "#3b82f6",
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
                  Add shape
                </button>
                <button
                  type="button"
                  disabled={busy || !(selectedPage.background_image_url ?? image_url)}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-sm font-semibold text-slate-900"
                  onClick={() => {
                    recordStoryCanvasUndo();
                    const id = nextRegionId(
                      selectedPage.items.map(storyItemToRect),
                      "line",
                    );
                    const base = defaultRegion(id);
                    const newItem: StoryItem = {
                      ...base,
                      kind: "line",
                      w_percent: Math.max(base.w_percent, 24),
                      h_percent: Math.max(base.h_percent, 10),
                      color_hex: "#0f172a",
                      line_width_px: 3,
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
                  Add line
                </button>
                <button
                  type="button"
                  disabled={busy || !(selectedPage.background_image_url ?? image_url)}
                  className="rounded border border-sky-300 bg-white px-2 py-1 text-sm font-semibold text-sky-900"
                  onClick={() => {
                    recordStoryCanvasUndo();
                    const id = nextRegionId(
                      selectedPage.items.map(storyItemToRect),
                      "btn",
                    );
                    const base = defaultRegion(id);
                    const newItem: StoryItem = {
                      ...base,
                      kind: "button",
                      text: "Button",
                      color_hex: "#0ea5e9",
                      text_color: "#ffffff",
                      text_size_px: 18,
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
                  Add button
                </button>
                <button
                  type="button"
                  disabled={busy || (!selItemId && selItemIds.length === 0)}
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
                    recordStoryCanvasUndo();
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
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy || !(selectedPage.background_image_url ?? image_url)}
                  title="Wheel: zoom · Middle-drag or Space+drag empty canvas: pan · Ctrl+Z/Y: undo/redo · Ctrl+C/V/D: copy/paste/duplicate · Delete: remove selection"
                  onClick={() => storyCanvasViewportRef.current?.resetView()}
                  className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
                >
                  Reset view
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setBgChangeOverlayOpen(true)}
                  className="rounded border border-sky-400 bg-white px-3 py-1.5 text-sm font-semibold text-sky-900 shadow-sm hover:bg-sky-50"
                >
                  Change background
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      ) : null}

      {bgChangeOverlayOpen && selectedPage ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Change page background"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setBgChangeOverlayOpen(false);
              setBgVideoLibraryOpen(false);
            }
          }}
        >
          <div
            className="flex max-h-[min(90vh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-sky-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-sky-100 bg-sky-50/80 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-sky-950">Change background</p>
                <p className="text-[11px] text-sky-900/80">
                  Presets are images in your media library tagged <strong>background</strong>. Other options
                  apply to this page only.
                </p>
              </div>
              <button
                type="button"
                className="rounded border border-sky-300 bg-white px-2 py-1 text-xs font-semibold text-sky-900 hover:bg-sky-50"
                onClick={() => {
                  setBgChangeOverlayOpen(false);
                  setBgVideoLibraryOpen(false);
                }}
              >
                Close
              </button>
            </div>
            <input
              ref={bgVideoFileRef}
              type="file"
              accept="video/mp4,video/webm,video/ogg,video/quicktime"
              className="hidden"
              disabled={busy || bgVideoUploading}
              onChange={(e) => void onBackgroundVideoFileChange(e)}
            />
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  Preset backgrounds
                </p>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  Choose from library images that include the tag <strong>background</strong>.
                </p>
                <input
                  type="text"
                  value={bgPresetQuery}
                  onChange={(e) => setBgPresetQuery(e.target.value)}
                  placeholder="Search by name or filename…"
                  className="mt-2 w-full rounded border border-neutral-200 px-2 py-1.5 text-sm"
                />
                <div className="mt-2 max-h-52 overflow-y-auto rounded border border-neutral-100 bg-neutral-50/50 p-2">
                  {bgPresetLoading ? (
                    <p className="text-xs text-neutral-600">Loading presets…</p>
                  ) : bgPresetErr ? (
                    <p className="text-xs text-red-700">{bgPresetErr}</p>
                  ) : bgPresetAssets.length === 0 ? (
                    <p className="text-xs text-neutral-600">
                      {bgPresetTotal === 0 && !bgPresetQuery.trim() ?
                        <>
                          No preset images yet. Tag assets with <strong>background</strong> in the media
                          library, or use a custom URL below.
                        </>
                      : <>
                          No preset images match this search. Tag assets with <strong>background</strong> in
                          the media library, or use a custom URL below.
                        </>}
                    </p>
                  ) : (
                    <>
                      <p className="mb-1 text-[10px] text-neutral-500">
                        Showing {bgPresetAssets.length} of {bgPresetTotal}
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                        {bgPresetAssets.map((asset) => {
                          const active =
                            (selectedPage.background_image_url ?? "") === asset.public_url;
                          return (
                            <button
                              key={asset.id}
                              type="button"
                              title={asset.meta_item_name || asset.original_filename}
                              onClick={() =>
                                updatePage(selectedPage.id, {
                                  background_image_url: asset.public_url,
                                })
                              }
                              className={`overflow-hidden rounded-lg border-2 text-left transition-colors ${
                                active ?
                                  "border-sky-600 ring-2 ring-sky-200"
                                : "border-transparent hover:border-sky-300"
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- library URLs from teacher storage */}
                              <img
                                src={asset.public_url}
                                alt=""
                                className="h-24 w-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                              <span className="line-clamp-2 block px-1 py-0.5 text-[10px] text-neutral-700">
                                {asset.meta_item_name?.trim() || asset.original_filename}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {bgPresetAssets.length < bgPresetTotal ? (
                        <div className="mt-2 flex justify-center">
                          <button
                            type="button"
                            disabled={bgPresetLoadingMore}
                            onClick={() => void loadMoreBgPreset()}
                            className="rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] font-semibold hover:bg-neutral-50 disabled:opacity-50"
                          >
                            {bgPresetLoadingMore ? "Loading…" : "Load more"}
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </section>
              <section>
                <label className="block text-xs font-semibold text-neutral-700">
                  Custom image URL
                  <input
                    type="url"
                    className="mt-1 w-full rounded border border-neutral-200 px-2 py-1.5 text-sm"
                    placeholder="https://…"
                    value={selectedPage.background_image_url ?? ""}
                    onChange={(e) =>
                      updatePage(selectedPage.id, {
                        background_image_url: e.target.value || undefined,
                      })
                    }
                  />
                </label>
              </section>
              <section>
                <p className="text-xs font-semibold text-neutral-700">Solid color (underlay)</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
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
                    className="w-36 rounded border border-neutral-200 px-2 py-1 text-xs"
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
                    Clear color
                  </button>
                </div>
              </section>
              <section className="rounded border border-neutral-200 bg-neutral-50/80 p-3">
                <p className="text-xs font-semibold text-neutral-700">Background video</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || bgVideoUploading}
                    onClick={() => bgVideoFileRef.current?.click()}
                    className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold"
                  >
                    {bgVideoUploading ? "Uploading…" : "Upload video"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgVideoLibraryOpen((v) => !v)}
                    className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-semibold"
                  >
                    {bgVideoLibraryOpen ? "Hide video library" : "Video library"}
                  </button>
                  {selectedPage.video_url ? (
                    <button
                      type="button"
                      onClick={() => updatePage(selectedPage.id, { video_url: undefined })}
                      className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-800"
                    >
                      Remove video
                    </button>
                  ) : null}
                </div>
                <label className="mt-2 block text-xs font-medium text-neutral-800">
                  Video URL
                  <input
                    type="url"
                    className="mt-1 w-full rounded border px-2 py-1 text-sm"
                    value={selectedPage.video_url ?? ""}
                    onChange={(e) =>
                      updatePage(selectedPage.id, { video_url: e.target.value || undefined })
                    }
                  />
                </label>
                {bgVideoErr ? <p className="mt-1 text-xs text-red-700">{bgVideoErr}</p> : null}
                {bgVideoLibraryOpen ? (
                  <div className="mt-2 rounded border border-neutral-200 bg-white p-2">
                    <input
                      type="text"
                      value={bgVideoLibraryQuery}
                      onChange={(e) => setBgVideoLibraryQuery(e.target.value)}
                      placeholder="Search videos"
                      className="w-full rounded border px-2 py-1 text-xs"
                    />
                    <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                      {bgVideoLibraryLoading ? (
                        <p className="text-xs text-neutral-600">Loading…</p>
                      ) : bgVideoLibraryErr ? (
                        <p className="text-xs text-red-700">{bgVideoLibraryErr}</p>
                      ) : bgVideoLibraryAssets.length === 0 ? (
                        <p className="text-xs text-neutral-600">
                          {bgVideoLibraryTotal === 0 && !bgVideoLibraryQuery.trim() ?
                            "No videos in the library yet."
                          : "No videos match this search."}
                        </p>
                      ) : (
                        <>
                          <p className="text-[10px] text-neutral-500">
                            Showing {bgVideoLibraryAssets.length} of {bgVideoLibraryTotal}
                          </p>
                          {bgVideoLibraryAssets.map((asset) => (
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
                          ))}
                          {bgVideoLibraryAssets.length < bgVideoLibraryTotal ? (
                            <div className="pt-1">
                              <button
                                type="button"
                                disabled={bgVideoLibraryLoadingMore}
                                onClick={() => void loadMoreBgVideoLibrary()}
                                className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] font-semibold hover:bg-neutral-50 disabled:opacity-50"
                              >
                                {bgVideoLibraryLoadingMore ? "Loading…" : "Load more"}
                              </button>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
              </section>
              <section>
                <p className="text-xs font-semibold text-neutral-700">Background image fit</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updatePage(selectedPage.id, { image_fit: "cover" })}
                    className={`rounded border px-3 py-1 text-xs font-semibold ${
                      (selectedPage.image_fit ?? image_fit) === "cover" ?
                        "border-sky-600 bg-sky-100 text-sky-950"
                      : "border-neutral-300 bg-white text-neutral-800"
                    }`}
                  >
                    Cover
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePage(selectedPage.id, { image_fit: "contain" })}
                    className={`rounded border px-3 py-1 text-xs font-semibold ${
                      (selectedPage.image_fit ?? image_fit) === "contain" ?
                        "border-sky-600 bg-sky-100 text-sky-950"
                      : "border-neutral-300 bg-white text-neutral-800"
                    }`}
                  >
                    Contain
                  </button>
                </div>
              </section>
              <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
                <button
                  type="button"
                  className="rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50"
                  onClick={() =>
                    updatePage(selectedPage.id, { background_image_url: undefined })
                  }
                >
                  Clear background image
                </button>
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
                                  i === idx ?
                                    storyStepWithKind(s, e.target.value as StoryActionStep["kind"])
                                  : s,
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
                            <option value="info_popup">info_popup</option>
                            <option value="goto_page">goto_page</option>
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
                      {step.kind === "info_popup" ? (
                        <div className="space-y-2 rounded border border-sky-200 bg-sky-50/50 p-2">
                          <p className="text-[10px] text-sky-950">
                            Shows a modal over the story. Good for tap-to-explain on slide layouts.
                          </p>
                          <label className="text-[11px] text-neutral-700">
                            Title
                            <input
                              className="mt-1 w-full rounded border px-2 py-1 text-xs"
                              value={step.popup_title ?? ""}
                              onChange={(e) =>
                                updateAnimationEditorSequence((seq) => ({
                                  ...seq,
                                  steps: seq.steps.map((s, i) =>
                                    i === idx ?
                                      { ...s, popup_title: e.target.value || undefined }
                                    : s,
                                  ),
                                }))
                              }
                            />
                          </label>
                          <label className="text-[11px] text-neutral-700">
                            Body
                            <textarea
                              className="mt-1 w-full rounded border px-2 py-1 text-xs"
                              rows={3}
                              value={step.popup_body ?? ""}
                              onChange={(e) =>
                                updateAnimationEditorSequence((seq) => ({
                                  ...seq,
                                  steps: seq.steps.map((s, i) =>
                                    i === idx ?
                                      { ...s, popup_body: e.target.value || undefined }
                                    : s,
                                  ),
                                }))
                              }
                            />
                          </label>
                          <label className="text-[11px] text-neutral-700">
                            Image URL (optional)
                            <input
                              className="mt-1 w-full rounded border px-2 py-1 text-xs"
                              value={step.popup_image_url ?? ""}
                              onChange={(e) =>
                                updateAnimationEditorSequence((seq) => ({
                                  ...seq,
                                  steps: seq.steps.map((s, i) =>
                                    i === idx ?
                                      { ...s, popup_image_url: e.target.value || undefined }
                                    : s,
                                  ),
                                }))
                              }
                            />
                          </label>
                          <label className="text-[11px] text-neutral-700">
                            Video URL (optional)
                            <input
                              className="mt-1 w-full rounded border px-2 py-1 text-xs"
                              value={step.popup_video_url ?? ""}
                              onChange={(e) =>
                                updateAnimationEditorSequence((seq) => ({
                                  ...seq,
                                  steps: seq.steps.map((s, i) =>
                                    i === idx ?
                                      { ...s, popup_video_url: e.target.value || undefined }
                                    : s,
                                  ),
                                }))
                              }
                            />
                          </label>
                        </div>
                      ) : null}
                      {step.kind === "goto_page" ? (
                        <div className="space-y-2 rounded border border-violet-200 bg-violet-50/50 p-2">
                          <p className="text-[10px] text-violet-950">
                            Moves within this story&apos;s pages (or advances the lesson on last page →
                            next).
                          </p>
                          <label className="text-[11px] text-neutral-700">
                            Go to
                            <select
                              className="mt-1 w-full rounded border px-1 py-1 text-xs"
                              value={step.goto_target ?? "next_page"}
                              onChange={(e) =>
                                updateAnimationEditorSequence((seq) => ({
                                  ...seq,
                                  steps: seq.steps.map((s, i) => {
                                    if (i !== idx) return s;
                                    const goto_target = e.target.value as NonNullable<
                                      StoryActionStep["goto_target"]
                                    >;
                                    return {
                                      ...s,
                                      goto_target,
                                      goto_page_id:
                                        goto_target === "page_id" ? s.goto_page_id : undefined,
                                    };
                                  }),
                                }))
                              }
                            >
                              <option value="next_page">Next page</option>
                              <option value="prev_page">Previous page</option>
                              <option value="page_id">Specific page…</option>
                            </select>
                          </label>
                          {step.goto_target === "page_id" ? (
                            <label className="text-[11px] text-neutral-700">
                              Page
                              <select
                                className="mt-1 w-full rounded border px-1 py-1 text-xs"
                                value={step.goto_page_id ?? ""}
                                onChange={(e) =>
                                  updateAnimationEditorSequence((seq) => ({
                                    ...seq,
                                    steps: seq.steps.map((s, i) =>
                                      i === idx ?
                                        { ...s, goto_page_id: e.target.value || undefined }
                                      : s,
                                    ),
                                  }))
                                }
                              >
                                <option value="">Select page…</option>
                                {pages.map((pg) => (
                                  <option key={pg.id} value={pg.id}>
                                    {pg.title?.trim() || pg.id.slice(0, 8)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}
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

      {!multi ? (
        <div className="space-y-4">
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-neutral-200 bg-neutral-50/90 p-3">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold text-neutral-800">Student view</span>
                  <div className="inline-flex rounded border border-neutral-300 bg-white p-0.5 text-xs">
                    {(["book", "slide"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        disabled={busy}
                        className={
                          layoutMode === m ?
                            "rounded bg-violet-600 px-2 py-1 font-semibold text-white"
                          : "rounded px-2 py-1 font-medium text-neutral-700 hover:bg-neutral-100"
                        }
                        onClick={() => {
                          setLayoutMode(m);
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
                            layout_mode: m,
                          });
                        }}
                      >
                        {m === "book" ? "Book" : "Slides"}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-neutral-700">
                    <span className="shrink-0 font-medium">Page change</span>
                    <select
                      className="max-w-[9rem] rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-xs"
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
                          pages: [],
                          page_turn_style: v,
                        });
                      }}
                    >
                      <option value="curl">Book curl</option>
                      <option value="slide">Slide swipe</option>
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className="shrink-0 rounded border border-sky-600 bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                  onClick={() => startMultiFromLegacy()}
                >
                  Scene &amp; pages editor…
                </button>
              </div>
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
        </div>
      ) : null}
    </div>
  );
}
