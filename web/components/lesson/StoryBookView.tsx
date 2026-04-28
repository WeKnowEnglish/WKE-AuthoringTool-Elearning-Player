"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  KidButton,
} from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { speakText, speakTextAndWait } from "@/lib/audio/tts";
import { bumpTapSpeechCounter, resolveTapSpeechEntry } from "@/lib/story-tap-speech";
import {
  getNormalizedStoryPages,
  getOnEnterRuntimeActions,
  getPhaseInteractionKind,
  getPhaseVisibleItemWhitelist,
  getResolvedPhaseTransition,
  getStartPhaseIdFromNormalizedPage,
  getStoryPageTurnStyle,
  storyPayloadSchema,
  type StoryAnimationPreset,
  type StoryClickAction,
  type StoryItem,
  type StoryPagePhase,
  type StoryPayload,
  type StoryTimelineStep,
} from "@/lib/lesson-schemas";
import { ScaledStoryItemImage } from "@/components/story/ScaledStoryItemImage";
import { GuideBlock } from "@/components/lesson/interaction-views";
import type { LessonPlayerVisualEdit } from "@/components/lesson/lesson-player-edit";

function enterClassForPreset(preset: StoryAnimationPreset | undefined): string {
  const p = preset ?? "fade_in";
  if (p === "none") return "story-in-none";
  return `story-in-${p}`;
}

type RuntimeStoryAction = Pick<StoryTimelineStep, "item_id" | "sound_url"> & {
  action: StoryTimelineStep["action"] | StoryClickAction["action"];
  emphasis_preset?: StoryClickAction["emphasis_preset"];
  play_once?: StoryClickAction["play_once"];
  duration_ms?: StoryClickAction["duration_ms"];
};

function normalizeTriggerTiming(
  mode: StoryClickAction["trigger_timing"] | string | undefined,
): "simultaneous" | "after_previous" | "next_click" {
  if (mode === "after_previous" || mode === "after previous" || mode === "after-previous") {
    return "after_previous";
  }
  if (mode === "next_click" || mode === "next click" || mode === "next-click") {
    return "next_click";
  }
  return "simultaneous";
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
}: Props) {
  const pages = useMemo(() => getNormalizedStoryPages(payload), [payload]);
  const turnStyle = getStoryPageTurnStyle(payload);
  const isMulti = (payload.pages?.length ?? 0) > 0;
  // Keep page-turn and enter animations visible in both teacher preview and student view.
  const shouldReduceMotion = false;

  const [pageIndex, setPageIndex] = useState(0);
  const [pageTurnKey, setPageTurnKey] = useState(0);
  const [pageTurnDir, setPageTurnDir] = useState<"next" | "back">("next");
  const [activeStoryPhaseId, setActiveStoryPhaseId] = useState<string | null>(null);
  const activeStoryPhaseIdRef = useRef<string | null>(null);
  const [hiddenItemIds, setHiddenItemIds] = useState<Record<string, boolean>>({});
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioUnlockedRef = useRef(false);
  const pageFrameRef = useRef<HTMLDivElement | null>(null);
  const pageSheenRef = useRef<HTMLDivElement | null>(null);
  const pageFoldShadowRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const pageAudioRef = useRef<HTMLAudioElement | null>(null);
  const itemAudioRef = useRef<HTMLAudioElement | null>(null);
  const pathAbortRef = useRef<AbortController | null>(null);
  const tapSequenceIndexRef = useRef<Record<string, number>>({});
  const triggerLockStateRef = useRef<Record<string, boolean>>({});
  const triggerLastEndAtRef = useRef<Record<string, number>>({});
  const tapSpeechCountersRef = useRef<Record<string, number>>({});
  const phaseAutoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    audioUnlockedRef.current = audioUnlocked;
  }, [audioUnlocked]);

  useEffect(() => {
    activeStoryPhaseIdRef.current = activeStoryPhaseId;
  }, [activeStoryPhaseId]);

  const safeIndex = Math.min(pageIndex, Math.max(0, pages.length - 1));
  const page = pages[safeIndex];
  const currentStoryPhase: StoryPagePhase | null = useMemo(() => {
    if (!page.phasesExplicit) return null;
    const sid = activeStoryPhaseId ?? getStartPhaseIdFromNormalizedPage(page);
    return page.phases.find((p) => p.id === sid) ?? page.phases[0] ?? null;
  }, [page, activeStoryPhaseId, page.phases, page.phasesExplicit]);
  const pageRef = useRef(page);
  const currentStoryPhaseRef = useRef(currentStoryPhase);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  useEffect(() => {
    currentStoryPhaseRef.current = currentStoryPhase;
  }, [currentStoryPhase]);
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
    setMatchAssignments({});
    tapSpeechCountersRef.current = {};
  }, [activeStoryPhaseId, page.id]);
  const storyHighlightIdSet = useMemo(() => {
    if (!currentStoryPhase?.highlight_item_ids?.length) return new Set<string>();
    return new Set(currentStoryPhase.highlight_item_ids);
  }, [currentStoryPhase?.highlight_item_ids]);
  const pageCrop = page.background_crop ?? { x_percent: 0, y_percent: 0, zoom_percent: 100 };
  const lastPage = safeIndex >= pages.length - 1;
  const firstPage = safeIndex === 0;

  const runItemEmphasis = useCallback(
    (
      item: StoryItem,
      emphasisPreset?: StoryClickAction["emphasis_preset"],
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
      const { waypoints, duration_ms } = item.path;
      const kf = waypoints.map((w) => ({
        left: `${w.x_percent}%`,
        top: `${w.y_percent}%`,
      }));
      const anim = el.animate(kf as Keyframe[], {
        duration: duration_ms,
        fill: "forwards",
        easing: "linear",
      });
      anim.addEventListener("finish", () => ac.abort(), { signal: ac.signal });
    },
    [screenId],
  );

  const runStoryTimelineStep = useCallback(
    (
      step: RuntimeStoryAction,
      itemById: Map<string, StoryItem>,
      clickedItemId: string | null,
    ) => {
      switch (step.action) {
        case "play_sound":
          if (step.sound_url && !muted && itemAudioRef.current) {
            itemAudioRef.current.src = step.sound_url;
            void itemAudioRef.current.play().catch(() => {});
          }
          break;
        case "emphasis": {
          const id = step.item_id ?? clickedItemId;
          const target = id ? itemById.get(id) : undefined;
          if (target) runItemEmphasis(target, step.emphasis_preset, step.duration_ms);
          break;
        }
        case "move": {
          const id = step.item_id ?? clickedItemId;
          const target = id ? itemById.get(id) : undefined;
          if (target && step.duration_ms != null && step.duration_ms >= 0) {
            const el = document.querySelector<HTMLElement>(
              `[data-story-item="${screenId}-${target.id}"]`,
            );
            if (el && target.path && target.path.waypoints.length >= 2) {
              const kf = target.path.waypoints.map((w) => ({
                left: `${w.x_percent}%`,
                top: `${w.y_percent}%`,
              }));
              el.animate(kf as Keyframe[], {
                duration: step.duration_ms,
                fill: "forwards",
                easing: "linear",
              });
            } else {
              runItemPath(target);
            }
          } else if (target) {
            runItemPath(target);
          }
          break;
        }
        case "show_item": {
          const id = step.item_id ?? clickedItemId;
          if (!id) break;
          setHiddenItemIds((prev) => {
            if (!prev[id]) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
          });
          break;
        }
        case "hide_item": {
          const id = step.item_id ?? clickedItemId;
          if (!id) break;
          setHiddenItemIds((prev) => ({ ...prev, [id]: true }));
          break;
        }
        default:
          break;
      }
    },
    [muted, runItemEmphasis, runItemPath, screenId],
  );

  const getTapStepDurationMs = useCallback(
    (
      step: {
        action: "emphasis" | "move" | "play_sound" | "show_item" | "hide_item";
        item_id?: string;
        duration_ms?: number;
      },
      itemById: Map<string, StoryItem>,
      clickedItemId: string,
    ) => {
      const id = step.item_id ?? clickedItemId;
      const target = itemById.get(id);
      if (!target) return 0;
      if (step.action === "move") return step.duration_ms ?? target.path?.duration_ms ?? 0;
      if (step.action === "emphasis") return step.duration_ms ?? target.emphasis?.duration_ms ?? 500;
      return 0;
    },
    [],
  );

  useEffect(() => {
    setActiveStoryPhaseId(null);
  }, [page.id]);

  useEffect(() => {
    if (!page.auto_play || !page.timeline?.length) return;
    const itemById = new Map(page.items.map((it) => [it.id, it]));
    const timers: ReturnType<typeof setTimeout>[] = [];
    const sorted = [...page.timeline].sort((a, b) => a.delay_ms - b.delay_ms);
    for (const step of sorted) {
      const t = setTimeout(() => {
        if (step.action === "play_sound" && !audioUnlockedRef.current) return;
        runStoryTimelineStep(step, itemById, null);
      }, step.delay_ms);
      timers.push(t);
    }
    return () => {
      for (const x of timers) clearTimeout(x);
    };
  }, [
    page.auto_play,
    page.timeline,
    page.items,
    page.id,
    runStoryTimelineStep,
  ]);

  useEffect(() => {
    tapSequenceIndexRef.current = {};
    triggerLockStateRef.current = {};
    triggerLastEndAtRef.current = {};
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
    setHiddenItemIds(initialHidden);
  }, [page.id, page.items, page.phases, page.phasesExplicit, activeStoryPhaseId]);

  useEffect(() => {
    if (phaseAutoTimerRef.current) {
      clearTimeout(phaseAutoTimerRef.current);
      phaseAutoTimerRef.current = null;
    }
    if (!page.phasesExplicit) return;
    if (!currentStoryPhase) return;
    if (getPhaseInteractionKind(currentStoryPhase) === "legacy") return;
    const r = getResolvedPhaseTransition(currentStoryPhase);
    if (r?.type !== "auto") return;
    phaseAutoTimerRef.current = setTimeout(() => {
      setActiveStoryPhaseId(r.next_phase_id);
    }, r.delay_ms);
    return () => {
      if (phaseAutoTimerRef.current) {
        clearTimeout(phaseAutoTimerRef.current);
        phaseAutoTimerRef.current = null;
      }
    };
  }, [currentStoryPhase, page.id, page.phasesExplicit]);

  useEffect(() => {
    if (!page.phasesExplicit || !currentStoryPhase?.on_enter?.length) return;
    const raf = requestAnimationFrame(() => {
      const itemById = new Map(page.items.map((it) => [it.id, it]));
      for (const step of currentStoryPhase.on_enter ?? []) {
        for (const a of getOnEnterRuntimeActions(step)) {
          runStoryTimelineStep(a as RuntimeStoryAction, itemById, null);
        }
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [
    currentStoryPhase,
    currentStoryPhase?.id,
    currentStoryPhase?.on_enter,
    page.id,
    page.items,
    page.phasesExplicit,
    runStoryTimelineStep,
  ]);

  useEffect(() => {
    if (!page.phasesExplicit || !currentStoryPhase?.dialogue?.start?.trim() || muted) return;
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
      onNextScreen();
    }
  }, [lastPage, muted, onNextScreen, pages.length, safeIndex]);

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

  const patchPayload = (next: StoryPayload) => {
    visualEdit?.onPayloadChange(screenId, next);
  };

  const listenCurrent = () => {
    playSfx("tap", muted);
    setAudioUnlocked(true);
    speakText(page.read_aloud_text || page.body_text, {
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
    const activePhaseId =
      page.phasesExplicit ?
        (activeStoryPhaseIdRef.current ?? getStartPhaseIdFromNormalizedPage(page))
      : null;
    const resolvedTapSpeech = resolveTapSpeechEntry({
      entries: item.tap_speeches,
      activePhaseId,
      itemId: item.id,
      counters: tapSpeechCountersRef.current,
    });
    const spokenLine =
      resolvedTapSpeech?.entry.text?.trim() ||
      (item.tap_speeches?.length ? "" : (item.request_line?.trim() ?? ""));
    if (spokenLine && !muted && !opts?.skipRequestLine) {
      void speakText(spokenLine, {
        lang: payload.tts_lang,
        muted,
      });
    }
    playSfx("tap", muted);
    const tapSoundUrl =
      resolvedTapSpeech?.entry.sound_url?.trim() ||
      (item.tap_speeches?.length ? undefined : item.on_click?.sound_url?.trim());
    if (tapSoundUrl && !muted) {
      if (itemAudioRef.current) {
        itemAudioRef.current.src = tapSoundUrl;
        void itemAudioRef.current.play().catch(() => {});
      }
    }
    tapSpeechCountersRef.current = bumpTapSpeechCounter(
      tapSpeechCountersRef.current,
      resolvedTapSpeech,
    );
    if (item.on_click?.run_emphasis && item.emphasis) {
      runItemEmphasis(item);
    } else if (item.on_click?.run_emphasis) {
      runItemEmphasis(item);
    }
    const itemById = new Map(page.items.map((it) => [it.id, it]));
    const clickedTriggers = item.on_click?.triggers ?? [];
    const scheduled: {
      step: (typeof clickedTriggers)[number];
      delayMs: number;
      lockKey: string;
      triggerId: string;
      durationMs: number;
      ownerItemId: string;
    }[] = [];
    const scheduledIds = new Set<string>();
    let chainEndMs = 0;
    const allRows = page.items.flatMap((owner) =>
      (owner.on_click?.triggers ?? []).map((tr, idx) => ({
        ownerItemId: owner.id,
        tr,
        idx,
        triggerId: tr.trigger_id ?? `${owner.id}:${idx}`,
        mode: normalizeTriggerTiming(tr.trigger_timing),
      })),
    );
    const rowsByAfter = new Map<string, typeof allRows>();
    for (const row of allRows) {
      const ref = row.tr.after_trigger_id;
      if (!ref) continue;
      rowsByAfter.set(ref, [...(rowsByAfter.get(ref) ?? []), row]);
    }
    const scheduleRow = (
      row: (typeof allRows)[number],
      delayMs: number,
      fromDependency: boolean,
    ) => {
      if (scheduledIds.has(row.triggerId)) return;
      if (row.tr.play_once && triggerLockStateRef.current[row.triggerId]) return;
      if (fromDependency && row.mode !== "after_previous") return;
      const durationMs = Math.max(
        0,
        getTapStepDurationMs(row.tr, itemById, row.ownerItemId),
      );
      scheduledIds.add(row.triggerId);
      scheduled.push({
        step: row.tr,
        delayMs: Math.max(0, delayMs),
        lockKey: row.triggerId,
        triggerId: row.triggerId,
        durationMs,
        ownerItemId: row.ownerItemId,
      });
      const dependents = rowsByAfter.get(row.triggerId) ?? [];
      for (const dep of dependents) {
        scheduleRow(dep, Math.max(0, delayMs + durationMs), true);
      }
    };

    const nextClickRows = allRows.filter(
      (x) => x.ownerItemId === item.id && x.mode === "next_click",
    );
    for (const row of allRows.filter((x) => x.ownerItemId === item.id)) {
      if (row.mode === "next_click") continue;
      if (row.mode === "after_previous" && row.tr.after_trigger_id) continue;
      if (row.mode === "after_previous") {
        scheduleRow(row, chainEndMs, false);
        const dur = Math.max(0, getTapStepDurationMs(row.tr, itemById, row.ownerItemId));
        chainEndMs += dur;
      } else {
        scheduleRow(row, 0, false);
      }
    }

    if (nextClickRows.length > 0) {
      const idx = tapSequenceIndexRef.current[item.id] ?? 0;
      const pick = nextClickRows[idx % nextClickRows.length];
      scheduleRow(pick, 0, false);
      tapSequenceIndexRef.current[item.id] = idx + 1;
    }

    for (const x of scheduled) {
      if (x.delayMs <= 0) {
        if (x.step.play_once) triggerLockStateRef.current[x.lockKey] = true;
        triggerLastEndAtRef.current[x.triggerId] = performance.now() + x.durationMs;
        runStoryTimelineStep(x.step, itemById, x.ownerItemId);
      } else {
        window.setTimeout(() => {
          if (x.step.play_once) triggerLockStateRef.current[x.lockKey] = true;
          triggerLastEndAtRef.current[x.triggerId] = performance.now() + x.durationMs;
          runStoryTimelineStep(x.step, itemById, x.ownerItemId);
        }, x.delayMs);
      }
    }

    queueMicrotask(() => {
      if (opts?.skipPhaseClickAdvance) return;
      if (!page.phasesExplicit) return;
      const aid =
        activeStoryPhaseIdRef.current ?? getStartPhaseIdFromNormalizedPage(page);
      const ph = page.phases.find((p) => p.id === aid);
      if (!ph) return;
      const kind = getPhaseInteractionKind(ph);
      if (kind === "drag_match") {
        return;
      }
      if (kind === "legacy") {
        if (ph.advance_on_item_tap_id === item.id && ph.next_phase_id) {
          setActiveStoryPhaseId(ph.next_phase_id);
        }
        return;
      }
      if (kind === "none") {
        return;
      }
      const r = getResolvedPhaseTransition(ph);
      if (r?.type === "on_click" && r.target_item_id === item.id) {
        setActiveStoryPhaseId(r.next_phase_id);
      }
    });
  },
  [
    getTapStepDurationMs,
    muted,
    page,
    payload.tts_lang,
    runItemEmphasis,
    runStoryTimelineStep,
  ],
  );

  useEffect(() => {
    runItemTapEffectsRef.current = runItemTapEffects;
  });

  const handleItemPointerUp = useCallback(
    (item: StoryItem) => {
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
    [page.phasesExplicit, runItemTapEffects],
  );

  const onDraggablePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, item: StoryItem) => {
      e.preventDefault();
      if (e.button !== 0) return;
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
    setActiveStoryPhaseId(r.next_phase_id);
  }, [currentStoryPhase, matchAssignments, activeStoryPhaseId, page.id]);

  const stage = (
    <div
      className={clsx(
        "relative w-full overflow-hidden rounded-lg border-4 border-kid-ink",
        page.image_fit === "contain" ? "bg-white" : "bg-neutral-900/5",
        shouldReduceMotion && "story-reduce-motion",
      )}
      style={{
        aspectRatio: "16 / 10",
        backgroundColor: page.background_color || undefined,
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
          style={{
            transform: `translate(${pageCrop.x_percent}%, ${pageCrop.y_percent}%) scale(${Math.max(0.5, pageCrop.zoom_percent / 100)})`,
            transformOrigin: "center center",
          }}
        />
      ) : page.background_image_url ? (
        <Image
          src={page.background_image_url}
          alt=""
          fill
          className={page.image_fit === "contain" ? "object-contain" : "object-cover"}
          style={{
            transform: `translate(${pageCrop.x_percent}%, ${pageCrop.y_percent}%) scale(${Math.max(0.5, pageCrop.zoom_percent / 100)})`,
            transformOrigin: "center center",
          }}
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
          if (hiddenItemIds[item.id]) return null;
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
          const layout = stickTarget
            ? {
                left: stickTarget.x_percent,
                top: stickTarget.y_percent,
                w: stickTarget.w_percent,
                h: stickTarget.h_percent,
              }
            : {
                left: item.x_percent,
                top: item.y_percent,
                w: item.w_percent,
                h: item.h_percent,
              };
          const enter = item.enter?.preset ?? "fade_in";
          const dur = item.enter?.duration_ms ?? 500;
          const enterCls = enterClassForPreset(enter);
          return (
            <button
              key={`${page.id}:${pageTurnKey}:${item.id}`}
              type="button"
              data-story-item={`${screenId}-${item.id}`}
              aria-label={
                item.name?.trim() ?
                  `${item.name.trim()} (story item)`
                : "Story picture"
              }
              className={clsx(
                "story-item-anim absolute box-border touch-manipulation",
                isDraggable && !isMatched && "touch-none cursor-grab active:cursor-grabbing",
                enter !== "none" && enterCls,
                page.phasesExplicit &&
                  storyHighlightIdSet.has(item.id) &&
                  "ring-2 ring-amber-400 ring-offset-1",
                draggingItemId === item.id && "invisible",
                isMatched && "ring-2 ring-green-500 ring-offset-1",
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
                isDraggable && !isMatched ?
                  (e) => onDraggablePointerDown(e, item)
                : undefined
              }
              onPointerUp={isDraggable && !isMatched ? undefined : () => handleItemPointerUp(item)}
            >
              <span
                data-story-item-inner={`${screenId}-${item.id}`}
                className={clsx(
                  "relative block h-full w-full overflow-hidden",
                  item.show_card !== false &&
                    "rounded-md border-2 border-kid-ink/40 bg-white/90 shadow-md",
                )}
              >
                <ScaledStoryItemImage imageUrl={item.image_url} imageScale={item.image_scale ?? 1} />
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
            "relative h-full w-full overflow-hidden",
            gi.show_card !== false &&
              "rounded-md border-2 border-kid-ink/50 bg-white/95 shadow-xl",
          )}
        >
          <ScaledStoryItemImage imageUrl={gi.image_url} imageScale={gi.image_scale ?? 1} />
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

  return (
    <div>
      <p className="sr-only" aria-live="polite">
        Page {safeIndex + 1} of {pages.length}
      </p>
      {storyDragPreviewPortal}

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

      {canvasEdit || page.body_text?.trim() ? (
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
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <KidButton
          type="button"
          variant="accent"
          onClick={listenCurrent}
        >
          Listen
        </KidButton>
        {!audioUnlocked && page.auto_play && (page.timeline?.length ?? 0) > 0 ? (
          <span className="text-sm text-neutral-600">
            Tap Listen or turn the page to hear sounds.
          </span>
        ) : null}
      </div>

      <GuideBlock guide={payload.guide} />

      <div className="mt-6 flex flex-wrap gap-3">
        <KidButton
          type="button"
          variant="secondary"
          disabled={firstPage && lessonBackDisabled}
          onClick={goPageBack}
        >
          Back
        </KidButton>
        <KidButton type="button" onClick={goPageNext}>
          {lastPage ? "Next" : "Next page"}
        </KidButton>
      </div>
    </div>
  );
}
