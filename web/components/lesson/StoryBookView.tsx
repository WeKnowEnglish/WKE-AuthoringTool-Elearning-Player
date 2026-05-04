"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { StoryItemLayerContent } from "@/components/story/StoryItemLayerContent";
import { GuideBlock } from "@/components/lesson/interactions/shared";
import type { LessonPlayerVisualEdit } from "@/components/lesson/lesson-player-edit";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import {
  KidButton,
} from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { speakText, speakTextAndWait, stopSpeaking } from "@/lib/audio/tts";
import { bumpTapSpeechCounter, resolveTapSpeechEntry } from "@/lib/story-tap-speech";
import {
  getItemClickActionSequences,
  getPageEnterActionSequences,
  getPhaseEnterActionSequences,
} from "@/lib/story-action-sequences";
import {
  findTapInteractionGroupOnPage,
  getItemTapGroupSatisfiedSequences,
  getNormalizedStoryPages,
  getPhaseInteractionKind,
  getPhasePoolQuotaMetSequences,
  getPhaseVisibleItemWhitelist,
  getResolvedPhaseTransition,
  getStartPhaseIdFromNormalizedPage,
  getStoryLayoutMode,
  getStoryPageTurnStyle,
  storyPayloadSchema,
  type StoryActionSequence,
  type StoryActionStep,
  type StoryAnimationPreset,
  type StoryItem,
  type StoryPage,
  type StoryPagePhase,
  type StartPlaygroundTapReward,
  type StoryPayload,
} from "@/lib/lesson-schemas";
import { resolveStoryIdleForItem, storyIdleClassForPreset } from "@/lib/story-idle";
import { isStoryPassSatisfied } from "@/lib/story-pass";
import {
  buildUnifiedReactionsFromStoryPage,
  compileUnifiedReactionBody,
  isStoryUnifiedDispatchEnabled,
} from "@/lib/story-unified";
import type { StoryUnifiedNavPayload, StoryUnifiedReactionRow } from "@/lib/story-unified/schema";

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function pageEnterHasScheduledSounds(page: StoryPage): boolean {
  const sequences = getPageEnterActionSequences(page, { includeLegacy: true });
  return sequences.some((seq) =>
    seq.steps.some(
      (step) => step.kind === "play_sound" && !!(step.sound_url?.trim()),
    ),
  );
}

function enterClassForPreset(preset: StoryAnimationPreset | undefined): string {
  const p = preset ?? "fade_in";
  if (p === "none") return "story-in-none";
  return `story-in-${p}`;
}

function tapQuotaThresholdsMet(
  poolItemIds: string[],
  perItem: Record<string, number>,
  aggregate: number,
  minDistinct: number | undefined,
  minTapsPerDistinct: number,
  minAggregate: number | undefined,
): boolean {
  let ok = true;
  if (minAggregate != null && minAggregate >= 1) {
    ok = ok && aggregate >= minAggregate;
  }
  if (minDistinct != null && minDistinct >= 1) {
    const n = poolItemIds.filter(
      (id) => (perItem[id] ?? 0) >= minTapsPerDistinct,
    ).length;
    ok = ok && n >= minDistinct;
  }
  return ok;
}

type Props = {
  screenId: string;
  payload: StoryPayload;
  muted: boolean;
  compactPreview?: boolean;
  canvasEdit: boolean;
  visualEdit?: LessonPlayerVisualEdit;
  lessonBackDisabled: boolean;
  onNextScreen: () => void;
  onBackScreen: () => void;
  /** When `payload.pass_rule` is set, parent marks lesson-level pass (rewards / advance). */
  interactionScreenPassed?: boolean;
  onInteractionPass?: () => void;
  onInteractionWrong?: () => void;
  /** Start / completion playground: minimal chrome, optional tap rewards. */
  embedMode?: "bookend";
  /** Replaces the last-page primary label (e.g. start CTA). */
  bookendPrimaryLabel?: string;
  bookendTapRewardByItemId?: Record<string, StartPlaygroundTapReward>;
  onBookendTapReward?: (detail: {
    itemId: string;
    rule: StartPlaygroundTapReward;
    /** 1-based tap count for this item within max_triggers (for reward event idempotency). */
    triggerOrdinal: number;
  }) => void;
  /** When true with `embedMode: "bookend"`, hide Back/Next (parent supplies navigation). */
  bookendHideNav?: boolean;
};

export function StoryBookView({
  screenId,
  payload,
  muted,
  compactPreview = false,
  canvasEdit,
  visualEdit,
  lessonBackDisabled,
  onNextScreen,
  onBackScreen,
  interactionScreenPassed = false,
  onInteractionPass,
  onInteractionWrong,
  embedMode,
  bookendPrimaryLabel,
  bookendTapRewardByItemId,
  onBookendTapReward,
  bookendHideNav = false,
}: Props) {
  const pages = useMemo(() => getNormalizedStoryPages(payload), [payload]);
  const turnStyle = getStoryPageTurnStyle(payload);
  const layoutMode = getStoryLayoutMode(payload);
  const isMulti = (payload.pages?.length ?? 0) > 0;
  // Keep page-turn and enter animations visible in both teacher preview and student view.
  const shouldReduceMotion = false;

  const [pageIndex, setPageIndex] = useState(0);
  const [pageTurnKey, setPageTurnKey] = useState(0);
  const [pageTurnDir, setPageTurnDir] = useState<"next" | "back">("next");
  const [activeStoryPhaseId, setActiveStoryPhaseId] = useState<string | null>(null);
  const activeStoryPhaseIdRef = useRef<string | null>(null);
  const [hiddenItemIds, setHiddenItemIds] = useState<Record<string, boolean>>({});
  const [activeVariableOutcomeByHost, setActiveVariableOutcomeByHost] = useState<
    Record<string, string>
  >({});
  const [visitedPageIds, setVisitedPageIds] = useState<Record<string, true>>({});
  const [deckDragCheckDone, setDeckDragCheckDone] = useState<Record<string, boolean>>({});
  const [deckFreeDragPos, setDeckFreeDragPos] = useState<
    Record<string, { x_percent: number; y_percent: number }>
  >({});
  const deckFreeDragPosRef = useRef(deckFreeDragPos);
  useEffect(() => {
    deckFreeDragPosRef.current = deckFreeDragPos;
  }, [deckFreeDragPos]);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioUnlockedRef = useRef(false);
  const pageFrameRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const deckDragSessionRef = useRef<{
    id: string;
    dx: number;
    dy: number;
    startX: number;
    startY: number;
  } | null>(null);
  const passReportedRef = useRef(false);
  const pageSheenRef = useRef<HTMLDivElement | null>(null);
  const pageFoldShadowRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const pageAudioRef = useRef<HTMLAudioElement | null>(null);
  const itemAudioRef = useRef<HTMLAudioElement | null>(null);
  const pathAbortRef = useRef<AbortController | null>(null);
  const triggerLastEndAtRef = useRef<Record<string, number>>({});
  const actionSequenceIndexRef = useRef<Record<string, number>>({});
  const actionStepLockRef = useRef<Record<string, boolean>>({});
  const clickSequenceTimersRef = useRef<Record<string, number[]>>({});
  const tapSpeechCountersRef = useRef<Record<string, number>>({});
  const phaseAutoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Tap pool counters for `tap_interaction_group` (key `g:${groupId}`). */
  const tapGroupBucketsRef = useRef<
    Record<string, { perItem: Record<string, number>; aggregate: number }>
  >({});
  const tapGroupFiredRef = useRef<Set<string>>(new Set());
  const bookendTapRewardCountsRef = useRef<Record<string, number>>({});
  /** Tap pool counters for phase `pool_interaction_quota` (key `p:${phaseId}`). */
  const phasePoolBucketsRef = useRef<
    Record<string, { perItem: Record<string, number>; aggregate: number }>
  >({});
  const phasePoolFiredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    audioUnlockedRef.current = audioUnlocked;
  }, [audioUnlocked]);

  useEffect(() => {
    activeStoryPhaseIdRef.current = activeStoryPhaseId;
  }, [activeStoryPhaseId]);

  const safeIndex = Math.min(pageIndex, Math.max(0, pages.length - 1));
  const page = pages[safeIndex];
  useEffect(() => {
    const initialByHost: Record<string, string> = {};
    for (const it of page.items) {
      if ((it.kind ?? "image") !== "variable") continue;
      const initial = it.variable_config?.initial_outcome_item_id?.trim();
      if (initial) initialByHost[it.id] = initial;
    }
    setActiveVariableOutcomeByHost(initialByHost);
  }, [page.id, page.items]);

  const getPreferredItemSoundUrl = useCallback(
    (item: StoryItem | undefined): string | undefined => {
      if (!item?.tap_speeches?.length) return undefined;
      const activePhaseId =
        page.phasesExplicit ?
          (activeStoryPhaseIdRef.current ?? getStartPhaseIdFromNormalizedPage(page))
        : null;
      const sorted = [...item.tap_speeches].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
      const selected = sorted.find((entry) => {
        const sound = entry.sound_url?.trim();
        if (!sound) return false;
        if (!entry.phase_ids || entry.phase_ids.length === 0) return true;
        if (!activePhaseId) return false;
        return entry.phase_ids.includes(activePhaseId);
      });
      return selected?.sound_url?.trim() || undefined;
    },
    [page],
  );
  const currentStoryPhase: StoryPagePhase | null = useMemo(() => {
    if (!page.phasesExplicit) return null;
    const sid = activeStoryPhaseId ?? getStartPhaseIdFromNormalizedPage(page);
    return page.phases.find((p) => p.id === sid) ?? page.phases[0] ?? null;
  }, [page, activeStoryPhaseId, page.phases, page.phasesExplicit]);

  const pageEnterSequenceIds = useMemo(
    () =>
      new Set(
        getPageEnterActionSequences(page as unknown as StoryPage, { includeLegacy: true }).map(
          (s) => s.id,
        ),
      ),
    [page],
  );
  const variableOutcomeMetaByItemId = useMemo(() => {
    const out = new Map<string, { hostId: string; lockChoice: boolean }>();
    for (const it of page.items) {
      if ((it.kind ?? "image") !== "variable") continue;
      const cfg = it.variable_config;
      if (!cfg?.outcome_item_ids?.length) continue;
      const lockChoice = cfg.lock_choice ?? true;
      for (const outcomeId of cfg.outcome_item_ids) {
        out.set(outcomeId, { hostId: it.id, lockChoice });
      }
    }
    return out;
  }, [page.items]);
  const variableHiddenItemIds = useMemo(() => {
    const hidden: Record<string, boolean> = {};
    for (const it of page.items) {
      if ((it.kind ?? "image") !== "variable") continue;
      const cfg = it.variable_config;
      if (!cfg?.outcome_item_ids?.length) continue;
      const selected =
        activeVariableOutcomeByHost[it.id] ?? cfg.initial_outcome_item_id?.trim() ?? undefined;
      if (!selected) continue;
      for (const outcomeId of cfg.outcome_item_ids) {
        if (outcomeId !== selected) hidden[outcomeId] = true;
      }
    }
    return hidden;
  }, [page.items, activeVariableOutcomeByHost]);

  /** When set, page/phase enter + phase auto timer run from compiled rows; taps, pools, and drag-match still use legacy paths. */
  const storyUnifiedRows = useMemo(() => {
    if (!isStoryUnifiedDispatchEnabled()) return null;
    const built = buildUnifiedReactionsFromStoryPage(page);
    if (built.parseErrors.length > 0) return null;
    return built.rows;
  }, [page]);

  const pageRef = useRef(page);
  const currentStoryPhaseRef = useRef(currentStoryPhase);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  useEffect(() => {
    currentStoryPhaseRef.current = currentStoryPhase;
  }, [currentStoryPhase]);

  useEffect(() => {
    tapGroupBucketsRef.current = {};
    tapGroupFiredRef.current = new Set();
  }, [page.id]);

  useEffect(() => {
    bookendTapRewardCountsRef.current = {};
  }, [screenId, embedMode]);

  useEffect(() => {
    phasePoolBucketsRef.current = {};
    phasePoolFiredRef.current = new Set();
  }, [currentStoryPhase?.id, page.id]);

  const [matchAssignments, setMatchAssignments] = useState<Record<string, string>>(
    {},
  );
  const [dragGhost, setDragGhost] = useState<{
    itemId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const dragSessionRef = useRef<{
    itemId: string;
    startX: number;
    startY: number;
    width: number;
    height: number;
  } | null>(null);
  const runItemTapEffectsRef = useRef<
    | ((
        item: StoryItem,
        opts?: { skipRequestLine?: boolean; skipPhaseClickAdvance?: boolean },
      ) => void)
    | null
  >(null);
  useEffect(() => {
    queueMicrotask(() => {
      setMatchAssignments({});
    });
    tapSpeechCountersRef.current = {};
  }, [activeStoryPhaseId, page.id]);
  const storyHighlightIdSet =
    !currentStoryPhase?.highlight_item_ids?.length ?
      new Set<string>()
    : new Set(currentStoryPhase.highlight_item_ids);
  const lastPage = safeIndex >= pages.length - 1;
  const firstPage = safeIndex === 0;
  const lessonGated = !!payload.pass_rule;
  const passSatisfied = useMemo(
    () =>
      isStoryPassSatisfied({
        pass_rule: payload.pass_rule,
        pages: pages.map((p) => ({
          id: p.id,
          items: p.items.map((it) => ({
            id: it.id,
            draggable_mode: it.draggable_mode,
            drop_target_id: it.drop_target_id,
          })),
        })),
        dragCheckDone: deckDragCheckDone,
        visitedPageIds,
      }),
    [payload.pass_rule, pages, deckDragCheckDone, visitedPageIds],
  );
  const lessonAdvanceOk =
    !lessonGated || interactionScreenPassed || passSatisfied;
  const interactionLocked = interactionScreenPassed || (lessonGated && passSatisfied);

  useEffect(() => {
    passReportedRef.current = false;
    const pid = pages[safeIndex]?.id;
    queueMicrotask(() => {
      setDeckDragCheckDone({});
      setDeckFreeDragPos({});
      setVisitedPageIds(pid ? { [pid]: true } : {});
    });
  }, [screenId]);

  useEffect(() => {
    const pid = pages[safeIndex]?.id;
    if (!pid) return;
    setVisitedPageIds((prev) => (prev[pid] ? prev : { ...prev, [pid]: true }));
  }, [safeIndex, pages]);

  useEffect(() => {
    if (!lessonGated || passReportedRef.current || !passSatisfied) return;
    passReportedRef.current = true;
    onInteractionPass?.();
  }, [lessonGated, passSatisfied, onInteractionPass]);
  const prefersReducedMotion = usePrefersReducedMotion();
  const activePhaseForIdle = useMemo(() => {
    if (!page.phasesExplicit) return null;
    return activeStoryPhaseId ?? getStartPhaseIdFromNormalizedPage(page);
  }, [page, activeStoryPhaseId]);

  const pagesNavRef = useRef(pages);
  const safeIndexRef = useRef(safeIndex);
  const lessonBackDisabledRef = useRef(lessonBackDisabled);
  const jumpToPageRef = useRef<(i: number) => void>(() => {});
  const onNextScreenRef = useRef<() => void>(() => {});
  const onBackScreenRef = useRef<() => void>(() => {});

  useEffect(() => {
    pagesNavRef.current = pages;
  }, [pages]);
  useEffect(() => {
    safeIndexRef.current = safeIndex;
  }, [safeIndex]);
  useEffect(() => {
    lessonBackDisabledRef.current = lessonBackDisabled;
  }, [lessonBackDisabled]);

  const [infoPopup, setInfoPopup] = useState<{
    title: string;
    body: string;
    image_url?: string;
    video_url?: string;
  } | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setInfoPopup(null);
    });
  }, [page.id]);

  const runItemEmphasis = useCallback(
    (
      item: StoryItem,
      emphasisPreset?: StoryActionStep["emphasis_preset"],
      durationOverrideMs?: number,
    ) => {
      const el = document.querySelector<HTMLElement>(
        `[data-story-item-inner="${screenId}-${item.id}"]`,
      );
      if (!el) return;
      const preset = emphasisPreset ?? item.emphasis?.preset ?? "grow";
      const dur = durationOverrideMs ?? item.emphasis?.duration_ms ?? 500;
      const growScale = Math.max(
        0.01,
        (item.emphasis?.grow_scale_percent ?? item.emphasis?.scale_percent ?? 112) / 100,
      );
      const shrinkRaw = item.emphasis?.shrink_scale_percent ?? item.emphasis?.scale_percent ?? 15;
      // Backward compatibility: old values >100 meant "start at 115% and return to 100%".
      const shrinkByPercent = shrinkRaw > 100 ? shrinkRaw - 100 : shrinkRaw;
      const shrinkScale = Math.max(0.05, 1 - shrinkByPercent / 100);
      const kf: Keyframe[] =
        preset === "shrink" ?
          [
            { transform: "scale(1)" },
            { transform: `scale(${shrinkScale})` },
            { transform: "scale(1)" },
          ]
        : preset === "spin" ?
          [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }]
        : preset === "wobble" ?
          [
            { transform: "rotate(0deg)" },
            { transform: "rotate(-6deg)" },
            { transform: "rotate(6deg)" },
            { transform: "rotate(0deg)" },
          ]
        : preset === "fade_in" ?
          [{ opacity: 0.55 }, { opacity: 1 }]
        : preset === "fade_out" ?
          [{ opacity: 1 }, { opacity: 0.6 }, { opacity: 1 }]
        : [{ transform: "scale(1)" }, { transform: `scale(${growScale})` }, { transform: "scale(1)" }];
      const easing =
        preset === "spin" ? "linear"
        : preset === "wobble" ? "ease-in-out"
        : "cubic-bezier(0.22, 1, 0.36, 1)";
      el.animate(kf, {
        duration: dur,
        easing,
        fill: "none",
        composite: "replace",
      });
    },
    [screenId],
  );

  const runItemPath = useCallback(
    (item: StoryItem) => {
      if (!item.path || item.path.waypoints.length < 2) return;
      pathAbortRef.current?.abort();
      const ac = new AbortController();
      pathAbortRef.current = ac;
      const el = document.querySelector<HTMLElement>(
        `[data-story-item="${screenId}-${item.id}"]`,
      );
      if (!el) return;
      const { waypoints, duration_ms, easing: pathEasing } = item.path;
      const kf = waypoints.map((w) => ({
        left: `${w.x_percent}%`,
        top: `${w.y_percent}%`,
      }));
      const easing = pathEasing?.trim() || "linear";
      const anim = el.animate(kf as Keyframe[], {
        duration: duration_ms,
        fill: "forwards",
        easing,
      });
      anim.addEventListener("finish", () => ac.abort(), { signal: ac.signal });
    },
    [screenId],
  );

  const runActionStep = useCallback(
    (
      step: StoryActionStep,
      itemById: Map<string, StoryItem>,
      ownerItemId: string | null,
      sequenceId: string,
    ) => {
      const targetId = step.target_item_id ?? ownerItemId ?? undefined;
      const target = targetId ? itemById.get(targetId) : undefined;
      switch (step.kind) {
        case "play_sound":
          if (!muted && itemAudioRef.current) {
            const soundToPlay = step.sound_url?.trim() || getPreferredItemSoundUrl(target);
            if (!soundToPlay) break;
            itemAudioRef.current.src = soundToPlay;
            void itemAudioRef.current.play().catch(() => {});
          }
          break;
        case "emphasis":
          if (target) runItemEmphasis(target, step.emphasis_preset, step.duration_ms);
          break;
        case "move":
          if (target && step.duration_ms != null && step.duration_ms >= 0) {
            const runMove = () => {
              const el = document.querySelector<HTMLElement>(
                `[data-story-item="${screenId}-${target.id}"]`,
              );
              if (el && target.path && target.path.waypoints.length >= 2) {
                const kf = target.path.waypoints.map((w) => ({
                  left: `${w.x_percent}%`,
                  top: `${w.y_percent}%`,
                }));
                const easing = target.path.easing?.trim() || "linear";
                el.animate(kf as Keyframe[], {
                  duration: step.duration_ms,
                  fill: "forwards",
                  easing,
                });
                return;
              }
              runItemPath(target);
            };
            // If move follows show_item, wait one paint for visibility state to apply.
            requestAnimationFrame(runMove);
          } else if (target) {
            requestAnimationFrame(() => runItemPath(target));
          }
          break;
        case "show_item":
          if (!targetId) break;
          setHiddenItemIds((prev) => {
            if (!prev[targetId]) return prev;
            const next = { ...prev };
            delete next[targetId];
            return next;
          });
          break;
        case "hide_item":
          if (!targetId) break;
          setHiddenItemIds((prev) => ({ ...prev, [targetId]: true }));
          break;
        case "toggle_item":
          if (!targetId) break;
          setHiddenItemIds((prev) => {
            if (prev[targetId]) {
              const next = { ...prev };
              delete next[targetId];
              return next;
            }
            return { ...prev, [targetId]: true };
          });
          break;
        case "tts":
          if (step.tts_text?.trim() && !muted) {
            void speakText(step.tts_text, {
              lang: step.tts_lang || payload.tts_lang,
              muted,
            });
          }
          break;
        case "smart_line": {
          const itemId = ownerItemId ?? targetId;
          if (!itemId) break;
          const activePhaseId =
            page.phasesExplicit ?
              (activeStoryPhaseIdRef.current ?? getStartPhaseIdFromNormalizedPage(page))
            : null;
          const entries = (step.smart_line_lines ?? []).map((line, idx) => ({
            id: line.id || `${sequenceId}:${step.id}:${idx}`,
            priority: line.priority,
            text: line.text,
            sound_url: line.sound_url,
            max_plays: line.max_plays,
            phase_ids: line.active_phase_ids,
          }));
          const resolved = resolveTapSpeechEntry({
            entries,
            activePhaseId,
            itemId: `${itemId}:${step.id}`,
            counters: tapSpeechCountersRef.current,
          });
          const spokenLine = resolved?.entry.text?.trim();
          if (spokenLine && !muted) {
            void speakText(spokenLine, {
              lang: step.tts_lang || payload.tts_lang,
              muted,
            });
          }
          const soundUrl = resolved?.entry.sound_url?.trim();
          if (soundUrl && !muted && itemAudioRef.current) {
            itemAudioRef.current.src = soundUrl;
            void itemAudioRef.current.play().catch(() => {});
          }
          tapSpeechCountersRef.current = bumpTapSpeechCounter(
            tapSpeechCountersRef.current,
            resolved,
          );
          break;
        }
        case "info_popup":
          setInfoPopup({
            title: step.popup_title?.trim() || "Info",
            body: step.popup_body?.trim() || "",
            image_url: step.popup_image_url?.trim() || undefined,
            video_url: step.popup_video_url?.trim() || undefined,
          });
          break;
        case "goto_page": {
          const pgs = pagesNavRef.current;
          const idx = safeIndexRef.current;
          const t = step.goto_target ?? "next_page";
          if (t === "next_page") {
            if (idx < pgs.length - 1) jumpToPageRef.current(idx + 1);
            else onNextScreenRef.current();
          } else if (t === "prev_page") {
            if (idx > 0) jumpToPageRef.current(idx - 1);
            else if (!lessonBackDisabledRef.current) onBackScreenRef.current();
          } else if (t === "page_id" && step.goto_page_id) {
            const j = pgs.findIndex((pg) => pg.id === step.goto_page_id);
            if (j >= 0) jumpToPageRef.current(j);
          }
          break;
        }
        default:
          break;
      }
    },
    [getPreferredItemSoundUrl, muted, page, payload.tts_lang, runItemEmphasis, runItemPath, screenId],
  );

  const getActionStepDurationMs = useCallback(
    (
      step: StoryActionStep,
      itemById: Map<string, StoryItem>,
      ownerItemId: string | null,
    ) => {
      const targetId = step.target_item_id ?? ownerItemId ?? undefined;
      const target = targetId ? itemById.get(targetId) : undefined;
      if (step.kind === "move") return step.duration_ms ?? target?.path?.duration_ms ?? 0;
      if (step.kind === "emphasis") return step.duration_ms ?? target?.emphasis?.duration_ms ?? 500;
      if (
        step.kind === "show_item" ||
        step.kind === "hide_item" ||
        step.kind === "toggle_item"
      ) {
        return 40;
      }
      return 0;
    },
    [],
  );

  const runActionSequence = useCallback(
    (
      sequence: StoryActionSequence,
      itemById: Map<string, StoryItem>,
      ownerItemId: string | null,
      opts?: { baseDelayMs?: number },
    ): {
      timers: number[];
      chainEndMs: number;
      isFinalNextClickSegment: boolean;
      hadScheduledSteps: boolean;
    } => {
      const timers: number[] = [];
      const baseDelay = Math.max(0, opts?.baseDelayMs ?? 0);
      const rows = sequence.steps.map((step, idx) => ({
        step,
        idx,
        stepId: step.id || `${sequence.id}:${idx}`,
        mode: step.timing ?? "simultaneous",
      }));
      const scheduled: Array<{
        step: StoryActionStep;
        delayMs: number;
        key: string;
        stepId: string;
        durationMs: number;
      }> = [];
      const scheduledIds = new Set<string>();
      let isFinalNextClickSegment = false;
      const scheduleRow = (row: (typeof rows)[number], delayMs: number) => {
        if (scheduledIds.has(row.stepId)) return;
        const lockKey = `${sequence.id}:${row.stepId}`;
        if (row.step.play_once && actionStepLockRef.current[lockKey]) return;
        const durationMs = Math.max(
          0,
          getActionStepDurationMs(row.step, itemById, ownerItemId),
        );
        scheduledIds.add(row.stepId);
        scheduled.push({
          step: row.step,
          delayMs: Math.max(0, baseDelay + delayMs + (row.step.delay_ms ?? 0)),
          key: lockKey,
          stepId: row.stepId,
          durationMs,
        });
      };

      const nextClickRows = rows.filter((x) => x.mode === "next_click");
      const seqKey = `${sequence.id}:${ownerItemId ?? "scene"}`;
      const clickStageIndex = actionSequenceIndexRef.current[seqKey] ?? 0;
      if (nextClickRows.length > 0) {
        const gateIndexes = rows
          .map((row, idx) => (row.mode === "next_click" ? idx : -1))
          .filter((idx) => idx >= 0);
        const gateStartIdx = gateIndexes[clickStageIndex];
        if (gateStartIdx != null) {
          isFinalNextClickSegment = clickStageIndex === gateIndexes.length - 1;
          const gateEndIdx = gateIndexes[clickStageIndex + 1] ?? rows.length;
          const gateRow = rows[gateStartIdx];
          if (gateRow) {
            scheduleRow(gateRow, 0);
            let prevStartMs = 0;
            let prevEndMs = Math.max(
              0,
              getActionStepDurationMs(gateRow.step, itemById, ownerItemId),
            );
            for (let i = gateStartIdx + 1; i < gateEndIdx; i += 1) {
              const row = rows[i];
              if (!row || row.mode === "next_click") continue;
              const durationMs = Math.max(
                0,
                getActionStepDurationMs(row.step, itemById, ownerItemId),
              );
              const startMs =
                row.mode === "after_previous" ? prevEndMs
                : row.mode === "simultaneous" ? prevStartMs
                : prevEndMs;
              scheduleRow(row, startMs);
              prevStartMs = startMs;
              prevEndMs = Math.max(prevEndMs, startMs + durationMs);
            }
          }
        }
        actionSequenceIndexRef.current[seqKey] =
          clickStageIndex < gateIndexes.length ? clickStageIndex + 1 : clickStageIndex;
      } else {
        let prevStartMs = 0;
        let prevEndMs = 0;
        for (const row of rows) {
          if (row.mode === "next_click") continue;
          const durationMs = Math.max(
            0,
            getActionStepDurationMs(row.step, itemById, ownerItemId),
          );
          const startMs =
            row.mode === "after_previous" ? prevEndMs
            : row.mode === "simultaneous" ? prevStartMs
            : prevEndMs;
          scheduleRow(row, startMs);
          prevStartMs = startMs;
          prevEndMs = Math.max(prevEndMs, startMs + durationMs);
        }
      }

      const hadScheduledSteps = scheduled.length > 0;
      if (nextClickRows.length === 0) {
        isFinalNextClickSegment = hadScheduledSteps;
      }

      let chainEndMs = 0;
      for (const x of scheduled) {
        chainEndMs = Math.max(chainEndMs, x.delayMs + x.durationMs);
      }

      for (const x of scheduled) {
        if (x.delayMs <= 0) {
          if (x.step.play_once) actionStepLockRef.current[x.key] = true;
          triggerLastEndAtRef.current[x.stepId] = performance.now() + x.durationMs;
          runActionStep(x.step, itemById, ownerItemId, sequence.id);
        } else {
          const t = window.setTimeout(() => {
            if (x.step.play_once) actionStepLockRef.current[x.key] = true;
            triggerLastEndAtRef.current[x.stepId] = performance.now() + x.durationMs;
            runActionStep(x.step, itemById, ownerItemId, sequence.id);
          }, x.delayMs);
          timers.push(t);
        }
      }
      return { timers, chainEndMs, isFinalNextClickSegment, hadScheduledSteps };
    },
    [getActionStepDurationMs, runActionStep],
  );

  const applyUnifiedNavRef = useRef<(nav: StoryUnifiedNavPayload) => void>(() => {});

  const applyUnifiedNav = useCallback(
    (nav: StoryUnifiedNavPayload) => {
      switch (nav.kind) {
        case "phase_id":
          activeStoryPhaseIdRef.current = nav.phase_id;
          setActiveStoryPhaseId(nav.phase_id);
          break;
        case "next_phase": {
          const pg = pageRef.current;
          const cur = activeStoryPhaseIdRef.current ?? getStartPhaseIdFromNormalizedPage(pg);
          const ph = pg.phases.find((p) => p.id === cur);
          const next = ph?.next_phase_id;
          if (next) {
            activeStoryPhaseIdRef.current = next;
            setActiveStoryPhaseId(next);
          }
          break;
        }
        case "story_page": {
          const idx = safeIndexRef.current;
          const pgs = pagesNavRef.current;
          if (nav.target === "next") {
            if (idx < pgs.length - 1) jumpToPageRef.current(idx + 1);
            else onNextScreenRef.current();
          } else if (nav.target === "prev") {
            if (idx > 0) jumpToPageRef.current(idx - 1);
            else if (!lessonBackDisabledRef.current) onBackScreenRef.current();
          } else if (nav.target === "page_id" && nav.page_id) {
            const j = pgs.findIndex((pg) => pg.id === nav.page_id);
            if (j >= 0) jumpToPageRef.current(j);
          }
          break;
        }
        case "lesson_screen":
          onNextScreenRef.current();
          break;
        case "lesson_pass":
          onInteractionPass?.();
          break;
        case "end_phase":
        default:
          break;
      }
    },
    [onInteractionPass],
  );

  useEffect(() => {
    applyUnifiedNavRef.current = applyUnifiedNav;
  }, [applyUnifiedNav]);

  const runStoryUnifiedReactionRow = useCallback(
    (row: StoryUnifiedReactionRow, itemById: Map<string, StoryItem>, ownerItemId: string | null) => {
      const seqId = row.id ?? row.source_sequence_id ?? "story-unified";
      const { sequence, navAfter } = compileUnifiedReactionBody(
        seqId,
        row.reaction_body,
        ownerItemId ?? row.owner_item_id ?? null,
      );
      const filtered: StoryActionSequence = {
        ...sequence,
        steps: sequence.steps.filter(
          (step) => !(step.kind === "play_sound" && !audioUnlockedRef.current),
        ),
      };
      const timers: number[] = [];
      if (filtered.steps.length > 0) {
        timers.push(
          ...runActionSequence(filtered, itemById, ownerItemId ?? row.owner_item_id ?? null).timers,
        );
      }
      if (navAfter) {
        queueMicrotask(() => {
          applyUnifiedNavRef.current(navAfter);
        });
      }
      return timers;
    },
    [runActionSequence],
  );

  const evaluateTapPoolQuotas = useCallback(
    (tappedItemId: string) => {
      const pg = pageRef.current;
      const itemById = new Map(pg.items.map((it) => [it.id, it]));

      for (const parentItem of pg.items) {
        const tg = parentItem.tap_interaction_group;
        if (!tg) continue;
        const pool: string[] = [...tg.child_item_ids];
        if (tg.include_parent_in_pool) pool.push(parentItem.id);
        if (!pool.includes(tappedItemId)) continue;

        const gKey = `g:${tg.id}`;
        const bucket =
          tapGroupBucketsRef.current[gKey] ?? { perItem: {}, aggregate: 0 };
        bucket.perItem[tappedItemId] = (bucket.perItem[tappedItemId] ?? 0) + 1;
        bucket.aggregate += 1;
        tapGroupBucketsRef.current[gKey] = bucket;

        if (
          !tapQuotaThresholdsMet(
            pool,
            bucket.perItem,
            bucket.aggregate,
            tg.min_distinct_items,
            tg.min_taps_per_distinct_item ?? 1,
            tg.min_aggregate_taps,
          )
        ) {
          continue;
        }
        if (tapGroupFiredRef.current.has(gKey)) continue;
        tapGroupFiredRef.current.add(gKey);

        let itemChainMs = 0;
        const onSat = tg.on_satisfy_sequence_id?.trim();
        if (onSat) {
          const satSeq = getItemTapGroupSatisfiedSequences(parentItem).find(
            (s) => s.id === onSat,
          );
          if (satSeq) {
            const filtered: StoryActionSequence = {
              ...satSeq,
              steps: satSeq.steps.filter(
                (step) =>
                  !(step.kind === "play_sound" && !audioUnlockedRef.current),
              ),
            };
            const r0 = runActionSequence(filtered, itemById, parentItem.id);
            itemChainMs = Math.max(0, Math.ceil(r0.chainEndMs));
            const bucketTimers = clickSequenceTimersRef.current[parentItem.id] ?? [];
            clickSequenceTimersRef.current[parentItem.id] = [
              ...bucketTimers,
              ...r0.timers,
            ];
          }
        }

        let phaseChainMs = 0;
        let advanceTo: string | null = null;
        let doPhaseAdvance = false;
        if (pg.phasesExplicit) {
          const aid =
            activeStoryPhaseIdRef.current ??
            getStartPhaseIdFromNormalizedPage(pg);
          const phTap = pg.phases.find((p) => p.id === aid);
          if (
            phTap &&
            getPhaseInteractionKind(phTap) === "click_to_advance"
          ) {
            const tr = getResolvedPhaseTransition(phTap);
            if (tr?.type === "tap_group" && tr.group_id === tg.id) {
              const psat = tr.satisfaction_sequence_id?.trim();
              if (psat) {
                const pseq = getPhasePoolQuotaMetSequences(phTap).find(
                  (s) => s.id === psat,
                );
                if (pseq) {
                  const pf: StoryActionSequence = {
                    ...pseq,
                    steps: pseq.steps.filter(
                      (step) =>
                        !(step.kind === "play_sound" && !audioUnlockedRef.current),
                    ),
                  };
                  const r1 = runActionSequence(pf, itemById, null);
                  phaseChainMs = Math.max(0, Math.ceil(r1.chainEndMs));
                }
              }
              if (tr.advance_after_satisfaction !== false) {
                doPhaseAdvance = true;
                advanceTo = tr.next_phase_id;
              }
            }
          }
        }

        const pageIdAtFire = pg.id;
        const runAdvance = () => {
          if (pageRef.current.id !== pageIdAtFire) return;
          if (doPhaseAdvance && advanceTo) {
            activeStoryPhaseIdRef.current = advanceTo;
            setActiveStoryPhaseId(advanceTo);
          }
        };
        const delayMs = itemChainMs + phaseChainMs;
        if (delayMs > 0) {
          window.setTimeout(runAdvance, delayMs);
        } else {
          runAdvance();
        }
      }

      if (!pg.phasesExplicit) return;

      const aidPool =
        activeStoryPhaseIdRef.current ?? getStartPhaseIdFromNormalizedPage(pg);
      const phPool = pg.phases.find((p) => p.id === aidPool);
      if (!phPool || getPhaseInteractionKind(phPool) !== "click_to_advance") {
        return;
      }
      const rPool = getResolvedPhaseTransition(phPool);
      if (rPool?.type !== "pool_interaction_quota") return;
      if (!rPool.pool_item_ids.includes(tappedItemId)) return;

      const pKey = `p:${phPool.id}`;
      const bPool =
        phasePoolBucketsRef.current[pKey] ?? { perItem: {}, aggregate: 0 };
      bPool.perItem[tappedItemId] = (bPool.perItem[tappedItemId] ?? 0) + 1;
      bPool.aggregate += 1;
      phasePoolBucketsRef.current[pKey] = bPool;

      if (
        !tapQuotaThresholdsMet(
          rPool.pool_item_ids,
          bPool.perItem,
          bPool.aggregate,
          rPool.min_distinct_items,
          rPool.min_taps_per_distinct_item,
          rPool.min_aggregate_taps,
        )
      ) {
        return;
      }
      if (phasePoolFiredRef.current.has(pKey)) return;
      phasePoolFiredRef.current.add(pKey);

      let poolSatMs = 0;
      const poolSat = rPool.satisfaction_sequence_id?.trim();
      if (poolSat) {
        const pseq = getPhasePoolQuotaMetSequences(phPool).find(
          (s) => s.id === poolSat,
        );
        if (pseq) {
          const pf: StoryActionSequence = {
            ...pseq,
            steps: pseq.steps.filter(
              (step) =>
                !(step.kind === "play_sound" && !audioUnlockedRef.current),
            ),
          };
          const rSat = runActionSequence(pf, itemById, null);
          poolSatMs = Math.max(0, Math.ceil(rSat.chainEndMs));
        }
      }
      const pageIdPool = pg.id;
      const advancePool = () => {
        if (pageRef.current.id !== pageIdPool) return;
        if (rPool.advance_after_satisfaction === false) return;
        activeStoryPhaseIdRef.current = rPool.next_phase_id;
        setActiveStoryPhaseId(rPool.next_phase_id);
      };
      if (poolSatMs > 0) window.setTimeout(advancePool, poolSatMs);
      else advancePool();
    },
    [runActionSequence, setActiveStoryPhaseId],
  );

  useEffect(() => {
    queueMicrotask(() => {
      setActiveStoryPhaseId(null);
    });
  }, [page.id]);

  useEffect(() => {
    if (!page.auto_play) return;
    const itemById = new Map(page.items.map((it) => [it.id, it]));
    const timers: number[] = [];
    const startId = getStartPhaseIdFromNormalizedPage(page);

    let ranUnifiedPageEnter = false;
    if (storyUnifiedRows) {
      const rows = storyUnifiedRows.filter(
        (r) =>
          r.trigger === "phase_enter" &&
          r.phase_id === startId &&
          !!r.source_sequence_id &&
          pageEnterSequenceIds.has(r.source_sequence_id),
      );
      if (rows.length > 0) {
        ranUnifiedPageEnter = true;
        for (const row of rows) {
          timers.push(...runStoryUnifiedReactionRow(row, itemById, row.owner_item_id ?? null));
        }
      }
    }
    if (!ranUnifiedPageEnter) {
      const sequences = getPageEnterActionSequences(page, { includeLegacy: true });
      if (sequences.length === 0) return;
      for (const sequence of sequences) {
        const filtered: StoryActionSequence = {
          ...sequence,
          steps: sequence.steps.filter(
            (step) => !(step.kind === "play_sound" && !audioUnlockedRef.current),
          ),
        };
        timers.push(...runActionSequence(filtered, itemById, null).timers);
      }
    }
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [
    page.auto_play,
    page.items,
    page.id,
    page.action_sequences,
    page.timeline,
    page.phases,
    pageEnterSequenceIds,
    runActionSequence,
    runStoryUnifiedReactionRow,
    storyUnifiedRows,
  ]);

  useEffect(() => {
    for (const list of Object.values(clickSequenceTimersRef.current)) {
      for (const t of list) window.clearTimeout(t);
    }
    clickSequenceTimersRef.current = {};
    triggerLastEndAtRef.current = {};
    actionSequenceIndexRef.current = {};
    actionStepLockRef.current = {};
    const startId =
      activeStoryPhaseId ?? getStartPhaseIdFromNormalizedPage(page);
    const phase = page.phases.find((p) => p.id === startId) ?? page.phases[0];
    const initialHidden: Record<string, boolean> = {};
    for (const it of page.items) {
      if (page.phasesExplicit && phase) {
        const w = getPhaseVisibleItemWhitelist(phase);
        if (w) {
          initialHidden[it.id] = !w.includes(it.id);
        } else {
          if (it.show_on_start === false) initialHidden[it.id] = true;
        }
      } else {
        if (it.show_on_start === false) initialHidden[it.id] = true;
      }
    }
    queueMicrotask(() => {
      setHiddenItemIds(initialHidden);
    });
  }, [page.id, page.items, page.phases, page.phasesExplicit, activeStoryPhaseId]);

  useEffect(() => {
    if (phaseAutoTimerRef.current) {
      clearTimeout(phaseAutoTimerRef.current);
      phaseAutoTimerRef.current = null;
    }
    if (!page.phasesExplicit) return;
    if (!currentStoryPhase) return;
    if (getPhaseInteractionKind(currentStoryPhase) === "legacy") return;

    if (storyUnifiedRows) {
      const timerRow = storyUnifiedRows.find(
        (r) =>
          r.trigger === "timer" &&
          r.phase_id === currentStoryPhase.id &&
          typeof r.timer_delay_ms === "number",
      );
      if (timerRow) {
        phaseAutoTimerRef.current = setTimeout(() => {
          const itemById = new Map(pageRef.current.items.map((it) => [it.id, it]));
          runStoryUnifiedReactionRow(timerRow, itemById, timerRow.owner_item_id ?? null);
        }, timerRow.timer_delay_ms ?? 0);
        return () => {
          if (phaseAutoTimerRef.current) {
            clearTimeout(phaseAutoTimerRef.current);
            phaseAutoTimerRef.current = null;
          }
        };
      }
    }

    const r = getResolvedPhaseTransition(currentStoryPhase);
    if (r?.type !== "auto") return;
    phaseAutoTimerRef.current = setTimeout(() => {
      activeStoryPhaseIdRef.current = r.next_phase_id;
      setActiveStoryPhaseId(r.next_phase_id);
    }, r.delay_ms);
    return () => {
      if (phaseAutoTimerRef.current) {
        clearTimeout(phaseAutoTimerRef.current);
        phaseAutoTimerRef.current = null;
      }
    };
  }, [
    currentStoryPhase,
    page.id,
    page.phasesExplicit,
    storyUnifiedRows,
    runStoryUnifiedReactionRow,
  ]);

  useEffect(() => {
    if (!page.phasesExplicit || !currentStoryPhase) return;
    const timers: number[] = [];
    const raf = requestAnimationFrame(() => {
      const itemById = new Map(page.items.map((it) => [it.id, it]));
      let ranUnifiedPhaseEnter = false;
      if (storyUnifiedRows) {
        const rows = storyUnifiedRows.filter(
          (r) =>
            r.trigger === "phase_enter" &&
            r.phase_id === currentStoryPhase.id &&
            (!r.source_sequence_id || !pageEnterSequenceIds.has(r.source_sequence_id)),
        );
        if (rows.length > 0) {
          ranUnifiedPhaseEnter = true;
          for (const row of rows) {
            timers.push(...runStoryUnifiedReactionRow(row, itemById, row.owner_item_id ?? null));
          }
        }
      }
      if (!ranUnifiedPhaseEnter) {
        const sequences = getPhaseEnterActionSequences(currentStoryPhase, { includeLegacy: true });
        if (sequences.length === 0) return;
        for (const sequence of sequences) {
          timers.push(...runActionSequence(sequence, itemById, null).timers);
        }
      }
    });
    return () => {
      cancelAnimationFrame(raf);
      for (const t of timers) window.clearTimeout(t);
    };
  }, [
    currentStoryPhase,
    currentStoryPhase?.id,
    currentStoryPhase?.on_enter,
    currentStoryPhase?.action_sequences,
    page.id,
    page.items,
    page.phasesExplicit,
    pageEnterSequenceIds,
    runActionSequence,
    runStoryUnifiedReactionRow,
    storyUnifiedRows,
  ]);

  useEffect(() => {
    if (!page.phasesExplicit || !currentStoryPhase?.dialogue?.start?.trim() || muted) return;
    const hasRecordedPageAudio = !!page.page_audio_url?.trim();
    if (hasRecordedPageAudio) return;
    const phaseStartText = currentStoryPhase.dialogue.start.trim();
    const startPhaseId = getStartPhaseIdFromNormalizedPage(page);
    const isStartPhase = currentStoryPhase.id === startPhaseId;
    const pageStartText = page.read_aloud_text?.trim() || page.body_text?.trim();
    const shouldPlayPageFirst =
      isStartPhase && !!page.auto_play_page_text && !!pageStartText;

    const controller = new AbortController();
    void (async () => {
      if (shouldPlayPageFirst) {
        await speakTextAndWait(pageStartText, {
          lang: payload.tts_lang,
          muted,
          signal: controller.signal,
        });
      }
      if (controller.signal.aborted) return;
      void speakText(phaseStartText, {
        lang: payload.tts_lang,
        muted,
      });
    })();
    return () => controller.abort();
  }, [
    currentStoryPhase?.id,
    currentStoryPhase?.dialogue?.start,
    page.id,
    page.phasesExplicit,
    page.page_audio_url,
    page.auto_play_page_text,
    page.read_aloud_text,
    page.body_text,
    muted,
    payload.tts_lang,
  ]);

  useEffect(() => {
    if (!page.page_audio_url || muted) return;
    if (!audioUnlocked) return;
    const a = pageAudioRef.current;
    if (!a) return;
    a.src = page.page_audio_url;
    void a.play().catch(() => {});
    return () => {
      a.pause();
    };
  }, [page.page_audio_url, page.id, muted, audioUnlocked, safeIndex]);

  const goPageNext = useCallback(() => {
    playSfx("tap", muted);
    setAudioUnlocked(true);
    if (!lastPage) {
      setPageTurnDir("next");
      setPageTurnKey((k) => k + 1);
      setPageIndex(Math.min(safeIndex + 1, pages.length - 1));
    } else {
      if (lessonGated && !lessonAdvanceOk) return;
      onNextScreen();
    }
  }, [
    lastPage,
    lessonAdvanceOk,
    lessonGated,
    muted,
    onNextScreen,
    pages.length,
    safeIndex,
  ]);

  const goPageBack = useCallback(() => {
    playSfx("tap", muted);
    setAudioUnlocked(true);
    if (!firstPage) {
      setPageTurnDir("back");
      setPageTurnKey((k) => k + 1);
      setPageIndex(Math.max(0, safeIndex - 1));
    } else if (!lessonBackDisabled) {
      onBackScreen();
    }
  }, [firstPage, lessonBackDisabled, muted, onBackScreen, safeIndex]);

  const jumpToPage = useCallback(
    (i: number) => {
      if (i === safeIndex || i < 0 || i >= pages.length) return;
      playSfx("tap", muted);
      setAudioUnlocked(true);
      setPageTurnDir(i > safeIndex ? "next" : "back");
      setPageTurnKey((k) => k + 1);
      setPageIndex(i);
    },
    [muted, pages.length, safeIndex],
  );

  useEffect(() => {
    jumpToPageRef.current = jumpToPage;
  }, [jumpToPage]);
  useEffect(() => {
    onNextScreenRef.current = onNextScreen;
  }, [onNextScreen]);
  useEffect(() => {
    onBackScreenRef.current = onBackScreen;
  }, [onBackScreen]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX;
    if (end == null) return;
    const dx = end - start;
    if (Math.abs(dx) < 56) return;
    if (dx < 0) goPageNext();
    else goPageBack();
  };

  useEffect(() => {
    if (pageTurnKey === 0) return;
    const el = pageFrameRef.current;
    if (!el) return;
    const sheen = pageSheenRef.current;
    const foldShadow = pageFoldShadowRef.current;
    const nextDir = pageTurnDir === "next";
    const keyframes: Keyframe[] =
      turnStyle === "slide"
        ? [
            {
              transform: `translateX(${nextDir ? "16%" : "-16%"})`,
              opacity: 0.78,
            },
            { transform: "translateX(0)", opacity: 1 },
          ]
        : [
            {
              transform: `perspective(1700px) rotateY(${nextDir ? "-16deg" : "16deg"}) translateX(${nextDir ? "4%" : "-4%"}) scale(0.985)`,
              filter: "brightness(0.9) saturate(0.97)",
              opacity: 0.86,
            },
            {
              transform: `perspective(1700px) rotateY(${nextDir ? "-6deg" : "6deg"}) translateX(${nextDir ? "1.2%" : "-1.2%"}) scale(0.996)`,
              filter: "brightness(1) saturate(1)",
              opacity: 0.97,
            },
            {
              transform: "translateX(0) scale(1)",
              filter: "brightness(1) saturate(1)",
              opacity: 1,
            },
          ];
    if (turnStyle === "curl") {
      el.style.transformOrigin = nextDir ? "left center" : "right center";
      el.style.transformStyle = "preserve-3d";
      el.style.backfaceVisibility = "hidden";
    }
    const anim = el.animate(keyframes, {
      duration: turnStyle === "slide" ? 420 : 520,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      fill: "both",
    });
    const sheenAnim =
      turnStyle === "curl" && sheen
        ? sheen.animate(
            [
              {
                opacity: 0,
                transform: `translateX(${nextDir ? "-32%" : "32%"}) skewX(${nextDir ? "-14deg" : "14deg"})`,
              },
              {
              opacity: 0.34,
                transform: "translateX(0%) skewX(0deg)",
              },
              {
                opacity: 0,
                transform: `translateX(${nextDir ? "34%" : "-34%"}) skewX(${nextDir ? "14deg" : "-14deg"})`,
              },
            ],
            {
              duration: 520,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              fill: "both",
            },
          )
        : null;
    const foldAnim =
      turnStyle === "curl" && foldShadow
        ? foldShadow.animate(
            [
              {
                opacity: 0.02,
                transform: `translateX(${nextDir ? "-6%" : "6%"}) scaleX(0.92)`,
              },
              {
                opacity: 0.28,
                transform: "translateX(0) scaleX(1.02)",
              },
              {
                opacity: 0,
                transform: `translateX(${nextDir ? "5%" : "-5%"}) scaleX(1)`,
              },
            ],
            {
              duration: 520,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              fill: "both",
            },
          )
        : null;
    return () => {
      anim.cancel();
      sheenAnim?.cancel();
      foldAnim?.cancel();
      if (turnStyle === "curl") {
        el.style.transformOrigin = "";
        el.style.transformStyle = "";
        el.style.backfaceVisibility = "";
      }
    };
  }, [pageTurnKey, pageTurnDir, turnStyle]);

  useEffect(
    () => () => {
      stopSpeaking();
      pathAbortRef.current?.abort();
      pathAbortRef.current = null;
      const pa = pageAudioRef.current;
      if (pa) {
        pa.pause();
        try {
          pa.currentTime = 0;
        } catch {
          /* ignore */
        }
      }
      const ia = itemAudioRef.current;
      if (ia) {
        ia.pause();
        try {
          ia.currentTime = 0;
        } catch {
          /* ignore */
        }
      }
      if (phaseAutoTimerRef.current) {
        clearTimeout(phaseAutoTimerRef.current);
        phaseAutoTimerRef.current = null;
      }
      for (const list of Object.values(clickSequenceTimersRef.current)) {
        for (const t of list) window.clearTimeout(t);
      }
      clickSequenceTimersRef.current = {};
    },
    [],
  );

  const patchPayload = (next: StoryPayload) => {
    visualEdit?.onPayloadChange(screenId, next);
  };

  const listenCurrent = () => {
    playSfx("tap", muted);
    setAudioUnlocked(true);
    const recordedPageAudio = page.page_audio_url?.trim();
    if (recordedPageAudio && pageAudioRef.current && !muted) {
      pageAudioRef.current.src = recordedPageAudio;
      void pageAudioRef.current.play().catch(() => {});
      return;
    }
    void speakText(page.read_aloud_text || page.body_text, {
      lang: payload.tts_lang,
      muted,
    });
  };

  const runItemTapEffects = useCallback(
    (
      item: StoryItem,
      opts?: { skipRequestLine?: boolean; skipPhaseClickAdvance?: boolean },
    ) => {
      setAudioUnlocked(true);
      playSfx("tap", muted);
      const existingTimers = clickSequenceTimersRef.current[item.id] ?? [];
      for (const t of existingTimers) window.clearTimeout(t);
      clickSequenceTimersRef.current[item.id] = [];
      if (itemAudioRef.current) {
        itemAudioRef.current.pause();
        itemAudioRef.current.currentTime = 0;
      }
      const itemById = new Map(page.items.map((it) => [it.id, it]));
      const activePhaseId =
        page.phasesExplicit ?
          (activeStoryPhaseIdRef.current ?? getStartPhaseIdFromNormalizedPage(page))
        : null;
      const hasNewClickSequences = (item.action_sequences ?? []).some((seq) => seq.event === "click");
      const sequences = getItemClickActionSequences(item, {
        includeLegacy: !hasNewClickSequences,
        activePhaseId,
      });
      for (const sequence of sequences) {
        const filtered: StoryActionSequence = {
          ...sequence,
          steps: sequence.steps.filter((step) =>
            opts?.skipRequestLine ? step.kind !== "smart_line" : true,
          ),
        };
        const runResult = runActionSequence(filtered, itemById, item.id);
        if (runResult.timers.length > 0) {
          clickSequenceTimersRef.current[item.id] = [
            ...(clickSequenceTimersRef.current[item.id] ?? []),
            ...runResult.timers,
          ];
        }

        if (
          !opts?.skipPhaseClickAdvance &&
          page.phasesExplicit &&
          runResult.hadScheduledSteps &&
          runResult.isFinalNextClickSegment
        ) {
          const aid =
            activeStoryPhaseIdRef.current ?? getStartPhaseIdFromNormalizedPage(page);
          const ph = page.phases.find((p) => p.id === aid);
          if (ph && getPhaseInteractionKind(ph) === "click_to_advance") {
            const r = getResolvedPhaseTransition(ph);
            if (
              r?.type === "sequence_complete" &&
              r.sequence_id === sequence.id
            ) {
              const ms = Math.max(0, Math.ceil(runResult.chainEndMs));
              const targetPhaseId = r.next_phase_id;
              const phaseIdAtSchedule = ph.id;
              const seqId = sequence.id;
              const t = window.setTimeout(() => {
                const pg = pageRef.current;
                const curAid =
                  activeStoryPhaseIdRef.current ??
                  getStartPhaseIdFromNormalizedPage(pg);
                if (curAid !== phaseIdAtSchedule) return;
                const phNow = pg.phases.find((p) => p.id === phaseIdAtSchedule);
                if (!phNow) return;
                const rNow = getResolvedPhaseTransition(phNow);
                if (rNow?.type !== "sequence_complete" || rNow.sequence_id !== seqId) {
                  return;
                }
                activeStoryPhaseIdRef.current = targetPhaseId;
                setActiveStoryPhaseId(targetPhaseId);
              }, ms);
              clickSequenceTimersRef.current[item.id] = [
                ...(clickSequenceTimersRef.current[item.id] ?? []),
                t,
              ];
            }
          }
        }
      }

      if (embedMode === "bookend" && bookendTapRewardByItemId && onBookendTapReward) {
        const rule = bookendTapRewardByItemId[item.id];
        if (rule) {
          const maxT = rule.max_triggers ?? 1;
          const prevN = bookendTapRewardCountsRef.current[item.id] ?? 0;
          if (prevN < maxT) {
            const triggerOrdinal = prevN + 1;
            bookendTapRewardCountsRef.current[item.id] = triggerOrdinal;
            const su = rule.play_sound_url?.trim();
            if (su && !muted && itemAudioRef.current) {
              try {
                itemAudioRef.current.src = su;
                void itemAudioRef.current.play().catch(() => {});
              } catch {
                /* ignore */
              }
            }
            onBookendTapReward({ itemId: item.id, rule, triggerOrdinal });
          }
        }
      }

      queueMicrotask(() => {
        if (opts?.skipPhaseClickAdvance) return;
        if (!page.phasesExplicit) {
          evaluateTapPoolQuotas(item.id);
          return;
        }
        const aid =
          activeStoryPhaseIdRef.current ?? getStartPhaseIdFromNormalizedPage(page);
        const ph = page.phases.find((p) => p.id === aid);
        if (!ph) {
          evaluateTapPoolQuotas(item.id);
          return;
        }
        const kind = getPhaseInteractionKind(ph);
        if (kind === "drag_match") {
          return;
        }
        if (kind === "legacy") {
          if (ph.advance_on_item_tap_id === item.id && ph.next_phase_id) {
            activeStoryPhaseIdRef.current = ph.next_phase_id;
            setActiveStoryPhaseId(ph.next_phase_id);
          }
          evaluateTapPoolQuotas(item.id);
          return;
        }
        if (kind === "none") {
          evaluateTapPoolQuotas(item.id);
          return;
        }
        const r = getResolvedPhaseTransition(ph);
        if (r?.type === "on_click" && r.target_item_id === item.id) {
          activeStoryPhaseIdRef.current = r.next_phase_id;
          setActiveStoryPhaseId(r.next_phase_id);
        }
        evaluateTapPoolQuotas(item.id);
      });
    },
    [
      muted,
      page,
      runActionSequence,
      evaluateTapPoolQuotas,
      embedMode,
      bookendTapRewardByItemId,
      onBookendTapReward,
    ],
  );

  useEffect(() => {
    runItemTapEffectsRef.current = runItemTapEffects;
  });

  const handleItemPointerUp = useCallback(
    (item: StoryItem) => {
      const variableOwner = variableOutcomeMetaByItemId.get(item.id);
      if (variableOwner) {
        setActiveVariableOutcomeByHost((prev) => {
          const current = prev[variableOwner.hostId];
          if (current === item.id) return prev;
          if (variableOwner.lockChoice && current && current !== item.id) return prev;
          return { ...prev, [variableOwner.hostId]: item.id };
        });
      }
      const deckMode = item.draggable_mode ?? "none";
      if (deckMode === "free" || deckMode === "check_target") {
        return;
      }
      const ph = currentStoryPhaseRef.current;
      if (
        page.phasesExplicit &&
        ph &&
        getPhaseInteractionKind(ph) === "drag_match" &&
        ph.drag_match?.draggable_item_ids.includes(item.id)
      ) {
        return;
      }
      runItemTapEffects(item, {});
    },
    [page.phasesExplicit, runItemTapEffects, variableOutcomeMetaByItemId],
  );

  const onDraggablePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, item: StoryItem) => {
      e.preventDefault();
      if (e.button !== 0) return;
      const deckMode = item.draggable_mode ?? "none";
      if (deckMode === "free" || deckMode === "check_target") {
        return;
      }
      const ph = currentStoryPhaseRef.current;
      if (
        !ph?.drag_match ||
        getPhaseInteractionKind(ph) !== "drag_match" ||
        !ph.drag_match.draggable_item_ids.includes(item.id)
      ) {
        return;
      }
      setAudioUnlocked(true);
      const startX = e.clientX;
      const startY = e.clientY;
      const br = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
      dragSessionRef.current = {
        itemId: item.id,
        startX,
        startY,
        width: br.width,
        height: br.height,
      };
      const onMove = (ev: PointerEvent) => {
        const sess = dragSessionRef.current;
        if (!sess) return;
        const d = Math.hypot(ev.clientX - sess.startX, ev.clientY - sess.startY);
        if (d > 8) {
          setDraggingItemId(item.id);
          setDragGhost({
            itemId: item.id,
            x: ev.clientX,
            y: ev.clientY,
            width: sess.width,
            height: sess.height,
          });
        }
      };
      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        const sess = dragSessionRef.current;
        dragSessionRef.current = null;
        setDragGhost(null);
        setDraggingItemId(null);
        if (!sess) return;
        const dist = Math.hypot(
          ev.clientX - sess.startX,
          ev.clientY - sess.startY,
        );
        const curPh = currentStoryPhaseRef.current;
        const curPage = pageRef.current;
        if (!curPh?.drag_match) return;
        if (dist < 8) {
          const tapped = curPage.items.find((x) => x.id === sess.itemId);
          if (tapped) runItemTapEffectsRef.current?.(tapped, {});
          return;
        }
        if (!curPh.drag_match.draggable_item_ids.includes(sess.itemId)) {
          return;
        }
        let targetId: string | null = null;
        for (const tid of curPh.drag_match.target_item_ids) {
          const el = document.querySelector<HTMLElement>(
            `[data-story-item="${screenId}-${tid}"]`,
          );
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (
            ev.clientX >= r.left &&
            ev.clientX <= r.right &&
            ev.clientY >= r.top &&
            ev.clientY <= r.bottom
          ) {
            targetId = tid;
            break;
          }
        }
        if (!targetId) return;
        const expected = curPh.drag_match.correct_map[sess.itemId];
        if (targetId === expected) {
          setMatchAssignments((prev) => ({
            ...prev,
            [sess.itemId]: targetId!,
          }));
          playSfx("correct", muted);
        } else {
          playSfx("wrong", muted);
          if (curPh.dialogue?.error?.trim()) {
            void speakText(curPh.dialogue.error, {
              lang: payload.tts_lang,
              muted,
            });
          }
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [muted, payload.tts_lang, screenId],
  );

  const onDeckPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, item: StoryItem) => {
      e.preventDefault();
      if (e.button !== 0) return;
      if (interactionLocked) return;
      const mode = item.draggable_mode ?? "none";
      if (mode !== "free" && mode !== "check_target") return;
      setAudioUnlocked(true);
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cur =
        deckFreeDragPos[item.id] ?? {
          x_percent: item.x_percent,
          y_percent: item.y_percent,
        };
      deckDragSessionRef.current = {
        id: item.id,
        dx: e.clientX - rect.left - (cur.x_percent / 100) * rect.width,
        dy: e.clientY - rect.top - (cur.y_percent / 100) * rect.height,
        startX: e.clientX,
        startY: e.clientY,
      };
      const onMove = (ev: PointerEvent) => {
        const sess = deckDragSessionRef.current;
        if (!sess || sess.id !== item.id) return;
        const r = stageRef.current?.getBoundingClientRect();
        if (!r) return;
        const nx = ((ev.clientX - r.left - sess.dx) / r.width) * 100;
        const ny = ((ev.clientY - r.top - sess.dy) / r.height) * 100;
        const dragged = pageRef.current.items.find((x) => x.id === item.id);
        if (!dragged) return;
        setDeckFreeDragPos((prev) => ({
          ...prev,
          [sess.id]: {
            x_percent: Math.max(0, Math.min(100 - dragged.w_percent, nx)),
            y_percent: Math.max(0, Math.min(100 - dragged.h_percent, ny)),
          },
        }));
      };
      const onUp = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        const sess = deckDragSessionRef.current;
        deckDragSessionRef.current = null;
        if (!sess || sess.id !== item.id) return;
        const dist = Math.hypot(ev.clientX - sess.startX, ev.clientY - sess.startY);
        const curPage = pageRef.current;
        const dragged = curPage.items.find((x) => x.id === item.id);
        if (!dragged) return;
        if (dist < 8) {
          runItemTapEffectsRef.current?.(dragged, {});
          return;
        }
        if (mode !== "check_target") return;
        const pos =
          deckFreeDragPosRef.current[dragged.id] ?? {
            x_percent: dragged.x_percent,
            y_percent: dragged.y_percent,
          };
        const targetId = dragged.drop_target_id;
        const target = targetId ? curPage.items.find((x) => x.id === targetId) : undefined;
        const cx = pos.x_percent + dragged.w_percent / 2;
        const cy = pos.y_percent + dragged.h_percent / 2;
        const hit =
          target &&
          cx >= target.x_percent &&
          cx <= target.x_percent + target.w_percent &&
          cy >= target.y_percent &&
          cy <= target.y_percent + target.h_percent;
        if (hit) {
          setDeckDragCheckDone((prev) => ({ ...prev, [dragged.id]: true }));
          playSfx("correct", muted);
        } else {
          playSfx("wrong", muted);
          onInteractionWrong?.();
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [deckFreeDragPos, interactionLocked, muted, onInteractionWrong],
  );

  useEffect(() => {
    if (!currentStoryPhase?.drag_match) return;
    if (getPhaseInteractionKind(currentStoryPhase) !== "drag_match") {
      return;
    }
    const r = getResolvedPhaseTransition(currentStoryPhase);
    if (r?.type !== "all_matched") return;
    const dm = currentStoryPhase.drag_match;
    for (const did of dm.draggable_item_ids) {
      if (matchAssignments[did] !== dm.correct_map[did]) return;
    }
    queueMicrotask(() => {
      activeStoryPhaseIdRef.current = r.next_phase_id;
      setActiveStoryPhaseId(r.next_phase_id);
    });
  }, [currentStoryPhase, matchAssignments, activeStoryPhaseId, page.id]);

  const stage = (
    <div
      ref={stageRef}
      className={clsx(
        "relative w-full overflow-hidden rounded-lg border-4 border-kid-ink",
        (page.image_fit ?? "contain") === "contain" ? "bg-white" : "bg-neutral-900/5",
        shouldReduceMotion && "story-reduce-motion",
      )}
      style={{
        aspectRatio: "16 / 10",
        backgroundColor: page.background_color || undefined,
        containerType: "inline-size",
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <audio ref={pageAudioRef} preload="metadata" className="hidden" />
      <audio ref={itemAudioRef} preload="metadata" className="hidden" />

      {canvasEdit && page.phasesExplicit ? (
        <div className="pointer-events-auto absolute right-1 top-1 z-30 rounded bg-white/95 px-2 py-1 text-[10px] shadow md:text-xs">
          <label className="flex items-center gap-1 text-neutral-800">
            Phase
            <select
              className="max-w-[10rem] rounded border border-neutral-300 bg-white px-1 py-0.5 text-[10px]"
              value={
                activeStoryPhaseId ?? getStartPhaseIdFromNormalizedPage(page)
              }
              onChange={(e) => setActiveStoryPhaseId(e.target.value)}
            >
              {page.phases.map((ph) => (
                <option key={ph.id} value={ph.id}>
                  {ph.name?.trim() || ph.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {page.video_url ? (
        <video
          controls
          className="absolute inset-0 h-full w-full object-cover"
          src={page.video_url}
        />
      ) : page.background_image_url ? (
        <Image
          src={page.background_image_url}
          alt=""
          fill
          className={(page.image_fit ?? "contain") === "contain" ? "object-contain" : "object-cover"}
          sizes="(max-width:768px) 100vw, 42rem"
          unoptimized={page.background_image_url.includes("placehold.co")}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-200/80 text-neutral-500">
          No background
        </div>
      )}

      {[...page.items]
        .sort((a, b) => (a.z_index ?? 0) - (b.z_index ?? 0))
        .map((item) => {
          if (hiddenItemIds[item.id] || variableHiddenItemIds[item.id]) return null;
          const deckMode = item.draggable_mode ?? "none";
          const isDeckDraggable = deckMode === "free" || deckMode === "check_target";
          const isDeckMatched =
            deckMode === "check_target" && !!deckDragCheckDone[item.id];
          const isDraggable =
            page.phasesExplicit &&
            currentStoryPhase &&
            getPhaseInteractionKind(currentStoryPhase) === "drag_match" &&
            currentStoryPhase.drag_match?.draggable_item_ids.includes(item.id);
          const dm = currentStoryPhase?.drag_match;
          const isMatched =
            isDraggable &&
            dm &&
            matchAssignments[item.id] === dm.correct_map[item.id];
          const afterMatch = dm?.after_correct_match ?? "return_home";
          if (isMatched && afterMatch === "hide") {
            return null;
          }
          const stickTarget =
            isMatched &&
            afterMatch === "stick_on_target" &&
            dm
              ? page.items.find((t) => t.id === dm.correct_map[item.id])
              : null;
          const deckPos = deckFreeDragPos[item.id];
          const layout = stickTarget
            ? {
                left: stickTarget.x_percent,
                top: stickTarget.y_percent,
                w: stickTarget.w_percent,
                h: stickTarget.h_percent,
              }
            : {
                left: deckPos?.x_percent ?? item.x_percent,
                top: deckPos?.y_percent ?? item.y_percent,
                w: item.w_percent,
                h: item.h_percent,
              };
          const enter = item.enter?.preset ?? "fade_in";
          const dur = item.enter?.duration_ms ?? 500;
          const enterCls = enterClassForPreset(enter);
          const itemKind = item.kind ?? "image";
          const defaultAria =
            itemKind === "text" ? "Story text"
            : itemKind === "shape" ? "Story shape"
            : itemKind === "line" ? "Story line"
            : itemKind === "button" ? "Story button"
            : itemKind === "variable" ? "Variable host"
            : "Story picture";
          const resolvedIdle =
            prefersReducedMotion ?
              null
            : resolveStoryIdleForItem(item, page, activePhaseForIdle);
          const idleCls =
            resolvedIdle ? storyIdleClassForPreset(resolvedIdle.preset) : null;
          const idleStyle: CSSProperties | undefined =
            resolvedIdle ?
              {
                ["--story-idle-amp" as string]: String(resolvedIdle.amplitude ?? 0.35),
                ["--story-idle-period" as string]: `${resolvedIdle.period_ms ?? 2200}ms`,
              }
            : undefined;
          return (
            <button
              key={`${page.id}:${pageTurnKey}:${item.id}`}
              type="button"
              data-story-item={`${screenId}-${item.id}`}
              aria-label={
                item.name?.trim() ? `${item.name.trim()} (story item)` : defaultAria
              }
              className={clsx(
                "story-item-anim absolute box-border touch-manipulation appearance-none border-0 bg-transparent p-0 m-0",
                (isDraggable && !isMatched) || (isDeckDraggable && !isDeckMatched) ?
                  "touch-none cursor-grab active:cursor-grabbing"
                : "",
                enter !== "none" && enterCls,
                page.phasesExplicit &&
                  storyHighlightIdSet.has(item.id) &&
                  "ring-2 ring-amber-400 ring-offset-1",
                draggingItemId === item.id && "invisible",
                (isMatched || isDeckMatched) && "ring-2 ring-green-500 ring-offset-1",
              )}
              style={{
                left: `${layout.left}%`,
                top: `${layout.top}%`,
                width: `${layout.w}%`,
                height: `${layout.h}%`,
                zIndex: 10 + (item.z_index ?? 0) + (stickTarget ? 15 : 0),
                ["--story-dur" as string]: `${dur}ms`,
              }}
              onPointerDown={
                interactionLocked ? undefined
                : isDraggable && !isMatched ?
                  (e) => onDraggablePointerDown(e, item)
                : isDeckDraggable && !isDeckMatched ?
                  (e) => onDeckPointerDown(e, item)
                : undefined
              }
              onPointerUp={
                isDraggable && !isMatched ? undefined : () => handleItemPointerUp(item)
              }
            >
              <span
                data-story-item-inner={`${screenId}-${item.id}`}
                className={clsx(
                  "relative block h-full w-full",
                  item.show_card !== false &&
                    "rounded-md border-2 border-kid-ink/40 bg-white/90 shadow-md",
                )}
              >
                <span
                  className={clsx(
                    "story-item-idle-layer relative block h-full w-full",
                    itemKind !== "text" && itemKind !== "line" && "overflow-hidden",
                    idleCls,
                  )}
                  style={idleStyle}
                >
                  <StoryItemLayerContent item={item} />
                </span>
              </span>
            </button>
          );
        })}
      {page.phasesExplicit && currentStoryPhase?.dialogue?.start?.trim() ? (
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 bg-black/50 px-3 py-2 text-center text-sm text-white"
          role="status"
        >
          {currentStoryPhase.dialogue.start}
        </div>
      ) : null}
    </div>
  );

  const storyDragPreviewPortal = useMemo(() => {
    if (typeof document === "undefined" || !dragGhost) return null;
    const gi = page.items.find((i) => i.id === dragGhost.itemId);
    if (!gi) return null;
    return createPortal(
      <div
        className="pointer-events-none"
        style={{
          position: "fixed",
          left: dragGhost.x,
          top: dragGhost.y,
          width: dragGhost.width,
          height: dragGhost.height,
          zIndex: 10000,
          transform: "translate(-50%, -50%)",
        }}
        aria-hidden
      >
        <div
          className={clsx(
            "relative h-full w-full",
            (gi.kind ?? "image") !== "text" && (gi.kind ?? "image") !== "line" && "overflow-hidden",
            gi.show_card !== false &&
              "rounded-md border-2 border-kid-ink/50 bg-white/95 shadow-xl",
          )}
        >
          <StoryItemLayerContent item={gi} />
        </div>
      </div>,
      document.body,
    );
  }, [dragGhost, page.items]);

  useEffect(() => {
    if (!draggingItemId) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.cursor = prev;
    };
  }, [draggingItemId]);

  useEffect(() => {
    if (!infoPopup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInfoPopup(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [infoPopup]);

  return (
    <div>
      <p className="sr-only" aria-live="polite">
        Page {safeIndex + 1} of {pages.length}
      </p>
      {storyDragPreviewPortal}
      {infoPopup && typeof document !== "undefined" ?
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
            role="presentation"
            onClick={() => setInfoPopup(null)}
          >
            <KidPanel
              className="relative max-h-[85vh] max-w-lg w-full overflow-y-auto p-4 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="story-info-popup-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="story-info-popup-title" className="text-lg font-bold text-kid-ink">
                {infoPopup.title}
              </h2>
              {infoPopup.body ?
                <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-800">{infoPopup.body}</p>
              : null}
              {infoPopup.image_url ?
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={infoPopup.image_url}
                  alt=""
                  className="mt-3 max-h-52 w-full rounded object-contain"
                />
              : null}
              {infoPopup.video_url ?
                <video
                  controls
                  className="mt-3 w-full rounded"
                  src={infoPopup.video_url}
                />
              : null}
              <div className="mt-4 flex justify-end">
                <KidButton type="button" variant="accent" onClick={() => setInfoPopup(null)}>
                  Close
                </KidButton>
              </div>
            </KidPanel>
          </div>,
          document.body,
        )
      : null}

      <div
        key={`${pageTurnKey}-${safeIndex}`}
        ref={pageFrameRef}
        className={clsx(
          "relative mb-4 w-full max-w-4xl overflow-hidden rounded-lg",
          "mx-auto",
          canvasEdit && "ring-2 ring-sky-500 ring-offset-2",
          !shouldReduceMotion && "will-change-transform",
        )}
      >
        <div
          ref={pageSheenRef}
          className={clsx(
            "pointer-events-none absolute inset-0 z-20 opacity-0",
            pageTurnDir === "next"
              ? "bg-gradient-to-r from-transparent via-white/30 to-black/12"
              : "bg-gradient-to-l from-transparent via-white/30 to-black/12",
          )}
        />
        <div
          ref={pageFoldShadowRef}
          className={clsx(
            "pointer-events-none absolute inset-0 z-10 opacity-0",
            pageTurnDir === "next"
              ? "bg-gradient-to-r from-black/24 via-black/10 to-transparent"
              : "bg-gradient-to-l from-black/24 via-black/10 to-transparent",
          )}
        />
        {stage}
      </div>

      {embedMode !== "bookend" && (canvasEdit || page.body_text?.trim()) ? (
        <KidPanel>
          {canvasEdit && !isMulti ? (
            <div className="space-y-3">
              <p className="text-xs text-neutral-600">
                Single-page story — edit below, or add pages in{" "}
                <strong>Screen details</strong>.
              </p>
              <label className="block text-xs font-semibold uppercase tracking-wide text-kid-ink">
                Video URL (optional — hides image when set)
                <input
                  type="url"
                  className="mt-1 w-full rounded border border-kid-ink px-2 py-1 text-sm"
                  placeholder="https://…"
                  value={payload.video_url ?? ""}
                  onChange={(e) => {
                    try {
                      const next = storyPayloadSchema.parse({
                        ...payload,
                        video_url: e.target.value || undefined,
                      });
                      patchPayload(next);
                    } catch {
                      /* ignore */
                    }
                  }}
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-sky-800">
                Story text
                <textarea
                  className="mt-1 min-h-[8rem] w-full resize-y rounded-lg border-2 border-dashed border-sky-500 bg-white/90 px-3 py-2 text-xl leading-relaxed text-neutral-900 outline-none focus:ring-4 focus:ring-sky-300"
                  value={payload.body_text}
                  onChange={(e) => {
                    try {
                      const next = storyPayloadSchema.parse({
                        ...payload,
                        body_text: e.target.value,
                      });
                      patchPayload(next);
                    } catch {
                      /* ignore */
                    }
                  }}
                />
              </label>
              <label className="block text-xs font-semibold text-neutral-600">
                Read-aloud override (optional)
                <textarea
                  className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                  rows={2}
                  value={payload.read_aloud_text ?? ""}
                  onChange={(e) => {
                    try {
                      const next = storyPayloadSchema.parse({
                        ...payload,
                        read_aloud_text: e.target.value || undefined,
                      });
                      patchPayload(next);
                    } catch {
                      /* ignore */
                    }
                  }}
                />
              </label>
              <label className="block text-xs font-semibold text-amber-900">
                Guide tip (optional)
                <input
                  type="text"
                  className="mt-1 w-full rounded border border-amber-400 px-2 py-1 text-sm"
                  value={payload.guide?.tip_text ?? ""}
                  onChange={(e) => {
                    try {
                      const tip = e.target.value;
                      const next = storyPayloadSchema.parse({
                        ...payload,
                        guide:
                          tip || payload.guide?.image_url
                            ? {
                                tip_text: tip || undefined,
                                image_url: payload.guide?.image_url,
                              }
                            : undefined,
                      });
                      patchPayload(next);
                    } catch {
                      /* ignore */
                    }
                  }}
                />
              </label>
            </div>
          ) : canvasEdit && isMulti ? (
            <p className="text-sm text-neutral-600">
              Multi-page story — edit pages, items, and motion in{" "}
              <strong>Screen details</strong>.
            </p>
          ) : (
            <p className="max-w-prose text-2xl leading-relaxed font-medium text-kid-ink md:text-3xl">
              {page.body_text}
            </p>
          )}
        </KidPanel>
      ) : null}
      {embedMode !== "bookend" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <KidButton
            type="button"
            variant="accent"
            onClick={listenCurrent}
          >
            Listen
          </KidButton>
          {!audioUnlocked && page.auto_play && pageEnterHasScheduledSounds(page) ? (
            <span className="text-sm text-neutral-600">
              Tap Listen or turn the page to hear sounds.
            </span>
          ) : null}
        </div>
      ) : null}

      {embedMode !== "bookend" ? <GuideBlock guide={payload.guide} /> : null}

      {embedMode !== "bookend" || !bookendHideNav ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <KidButton
            type="button"
            variant="secondary"
            disabled={firstPage && lessonBackDisabled}
            onClick={goPageBack}
          >
            Back
          </KidButton>
          <KidButton
            type="button"
            disabled={lastPage && !lessonAdvanceOk}
            onClick={goPageNext}
          >
            {lastPage ?
              embedMode === "bookend" && bookendPrimaryLabel?.trim() ?
                bookendPrimaryLabel.trim()
              : "Next"
            : "Next page"}
          </KidButton>
        </div>
      ) : null}
      {isMulti && layoutMode === "slide" && pages.length > 1 ? (
        <div
          className="mt-4 flex flex-wrap items-center justify-center gap-2"
          role="tablist"
          aria-label="Slides"
        >
          {pages.map((_, i) => (
            <button
              key={pages[i]!.id}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              className={
                i === safeIndex ?
                  "h-2.5 w-2.5 rounded-full bg-kid-ink ring-2 ring-kid-ink/30"
                : "h-2.5 w-2.5 rounded-full bg-kid-ink/25 hover:bg-kid-ink/40"
              }
              onClick={() => jumpToPage(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
