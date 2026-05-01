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
  getNormalizedStoryPages,
  getPhaseInteractionKind,
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
  type StoryPayload,
} from "@/lib/lesson-schemas";
import { resolveStoryIdleForItem, storyIdleClassForPreset } from "@/lib/story-idle";

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
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioUnlockedRef = useRef(false);
  const pageFrameRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    audioUnlockedRef.current = audioUnlocked;
  }, [audioUnlocked]);

  useEffect(() => {
    activeStoryPhaseIdRef.current = activeStoryPhaseId;
  }, [activeStoryPhaseId]);

  const safeIndex = Math.min(pageIndex, Math.max(0, pages.length - 1));
  const page = pages[safeIndex];
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
      if (step.kind === "show_item" || step.kind === "hide_item") return 40;
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

  useEffect(() => {
    queueMicrotask(() => {
      setActiveStoryPhaseId(null);
    });
  }, [page.id]);

  useEffect(() => {
    if (!page.auto_play) return;
    const sequences = getPageEnterActionSequences(page, { includeLegacy: true });
    if (sequences.length === 0) return;
    const itemById = new Map(page.items.map((it) => [it.id, it]));
    const timers: number[] = [];
    for (const sequence of sequences) {
      const filtered: StoryActionSequence = {
        ...sequence,
        steps: sequence.steps.filter(
          (step) => !(step.kind === "play_sound" && !audioUnlockedRef.current),
        ),
      };
      timers.push(...runActionSequence(filtered, itemById, null).timers);
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
    runActionSequence,
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
    if (!page.phasesExplicit || !currentStoryPhase) return;
    const sequences = getPhaseEnterActionSequences(currentStoryPhase, { includeLegacy: true });
    if (sequences.length === 0) return;
    const timers: number[] = [];
    const raf = requestAnimationFrame(() => {
      const itemById = new Map(page.items.map((it) => [it.id, it]));
      for (const sequence of sequences) {
        timers.push(...runActionSequence(sequence, itemById, null).timers);
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
    runActionSequence,
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
      muted,
      page,
      runActionSequence,
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
    queueMicrotask(() => {
      setActiveStoryPhaseId(r.next_phase_id);
    });
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
          className={page.image_fit === "contain" ? "object-contain" : "object-cover"}
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
          const itemKind = item.kind ?? "image";
          const defaultAria =
            itemKind === "text" ? "Story text"
            : itemKind === "shape" ? "Story shape"
            : itemKind === "line" ? "Story line"
            : itemKind === "button" ? "Story button"
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
        {!audioUnlocked && page.auto_play && pageEnterHasScheduledSounds(page) ? (
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
      {isMulti && layoutMode === "slide" ? (
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
