import type {
  StoryActionSequence,
  StoryActionStep,
  StoryClickAction,
  StoryItem,
  StoryPage,
  StoryPagePhase,
  StoryPhaseOnEnterStep,
  StoryTapSpeechEntry,
  StoryTimelineStep,
} from "@/lib/lesson-schemas";

function mapTimelineAction(action: StoryTimelineStep["action"]): StoryActionStep["kind"] {
  if (action === "enter") return "show_item";
  if (action === "exit") return "hide_item";
  return action;
}

function mapPhaseOnEnterAction(action: StoryPhaseOnEnterStep["action"]): StoryActionStep["kind"] {
  if (action === "play_sound") return "play_sound";
  return action;
}

function convertClickTriggerToStep(
  trigger: StoryClickAction,
  index: number,
): StoryActionStep {
  return {
    id: trigger.trigger_id ?? `legacy-step-${index}`,
    kind: trigger.action,
    target_item_id: trigger.item_id,
    emphasis_preset: trigger.emphasis_preset,
    duration_ms: trigger.duration_ms,
    timing: trigger.trigger_timing ?? "simultaneous",
    after_step_id: trigger.after_trigger_id,
    play_once: trigger.play_once,
    sound_url: trigger.sound_url,
  };
}

function convertTapSpeechEntriesToSmartLines(
  entries: StoryTapSpeechEntry[],
): NonNullable<StoryActionStep["smart_line_lines"]> {
  return entries.map((entry, idx) => ({
    id: entry.id || `legacy-line-${idx}`,
    text: entry.text,
    sound_url: entry.sound_url,
    priority: entry.priority,
    max_plays: entry.max_plays,
    active_phase_ids: entry.phase_ids,
  }));
}

function createLegacySmartLineSequence(item: StoryItem): StoryActionSequence | null {
  const tapEntries = item.tap_speeches ?? [];
  const hasLegacyFallback = !!item.request_line?.trim() || !!item.on_click?.sound_url?.trim();
  if (tapEntries.length === 0 && !hasLegacyFallback) return null;
  const lines =
    tapEntries.length > 0 ?
      convertTapSpeechEntriesToSmartLines(tapEntries)
    : [
        {
          id: `legacy-line-${item.id}-0`,
          text: item.request_line?.trim() || undefined,
          sound_url: item.on_click?.sound_url?.trim() || undefined,
          priority: 100,
        },
      ];
  return {
    id: `legacy:item:${item.id}:smart_line`,
    name: "Legacy tap speech",
    event: "click",
    steps: [
      {
        id: `legacy:item:${item.id}:smart_line:step`,
        kind: "smart_line",
        timing: "simultaneous",
        smart_line_lines: lines,
      },
    ],
  };
}

export function getPageEnterActionSequences(
  page: StoryPage,
  opts?: { includeLegacy?: boolean },
): StoryActionSequence[] {
  const includeLegacy = opts?.includeLegacy ?? true;
  const next: StoryActionSequence[] = (page.action_sequences ?? []).filter(
    (x) => x.event === "page_enter",
  );
  if (!includeLegacy) return next;
  const timeline = page.timeline ?? [];
  if (timeline.length === 0) return next;
  return [
    ...next,
    {
      id: `legacy:page:${page.id}:timeline`,
      name: "Autoplay (legacy timeline)",
      event: "page_enter",
      steps: timeline.map((step, idx) => ({
        id: `legacy:page:${page.id}:tl:${idx}`,
        kind: mapTimelineAction(step.action),
        target_item_id: step.item_id,
        sound_url: step.sound_url,
        delay_ms: step.delay_ms,
        timing: "simultaneous",
      })),
    },
  ];
}

export function getPhaseEnterActionSequences(
  phase: StoryPagePhase,
  opts?: { includeLegacy?: boolean },
): StoryActionSequence[] {
  const includeLegacy = opts?.includeLegacy ?? true;
  const next: StoryActionSequence[] = (phase.action_sequences ?? []).filter(
    (x) => x.event === "phase_enter",
  );
  if (!includeLegacy || !phase.on_enter?.length) return next;
  const legacySteps: StoryActionStep[] = [];
  for (const [idx, step] of phase.on_enter.entries()) {
    const ids =
      step.item_id ? [step.item_id]
      : step.item_ids?.length ? step.item_ids
      : [undefined];
    for (const targetId of ids) {
      legacySteps.push({
        id: `legacy:phase:${phase.id}:enter:${idx}:${targetId ?? "none"}`,
        kind: mapPhaseOnEnterAction(step.action),
        target_item_id: targetId,
        sound_url: step.sound_url,
        duration_ms: step.duration_ms,
        emphasis_preset: step.emphasis_preset,
        timing: "simultaneous",
      });
    }
  }
  return [
    ...next,
    {
      id: `legacy:phase:${phase.id}:on_enter`,
      name: "Autoplay (legacy phase on_enter)",
      event: "phase_enter",
      steps: legacySteps,
    },
  ];
}

export function getItemClickActionSequences(
  item: StoryItem,
  opts?: { includeLegacy?: boolean; activePhaseId?: string | null },
): StoryActionSequence[] {
  const includeLegacy = opts?.includeLegacy ?? true;
  const activePhaseId = opts?.activePhaseId ?? null;
  const next: StoryActionSequence[] = (item.action_sequences ?? []).filter((x) => {
    if (x.event !== "click") return false;
    if (!x.active_phase_ids || x.active_phase_ids.length === 0) return true;
    if (!activePhaseId) return false;
    return x.active_phase_ids.includes(activePhaseId);
  });
  if (includeLegacy) {
    const legacyTriggers = item.on_click?.triggers ?? [];
    if (legacyTriggers.length > 0) {
      next.push({
        id: `legacy:item:${item.id}:triggers`,
        name: "Legacy click triggers",
        event: "click",
        steps: legacyTriggers.map((trigger, idx) => convertClickTriggerToStep(trigger, idx)),
      });
    }
    if (item.on_click?.run_emphasis) {
      next.push({
        id: `legacy:item:${item.id}:run_emphasis`,
        name: "Legacy tap emphasis",
        event: "click",
        steps: [
          {
            id: `legacy:item:${item.id}:run_emphasis:0`,
            kind: "emphasis",
            timing: "simultaneous",
          },
        ],
      });
    }
  }
  // Keep speech library tap lines available even when modern click sequences exist.
  const smartLineSeq = createLegacySmartLineSequence(item);
  if (smartLineSeq) next.push(smartLineSeq);
  return next;
}

export function stripLegacyAnimationFields<T>(entity: T): T {
  if (!entity || typeof entity !== "object") return entity;
  const value = entity as Record<string, unknown>;
  const next: Record<string, unknown> = { ...value };
  if ("timeline" in next) next.timeline = undefined;
  if ("on_enter" in next) next.on_enter = undefined;
  if ("tap_speeches" in next) next.tap_speeches = undefined;
  if ("request_line" in next) next.request_line = undefined;
  if ("on_click" in next && typeof next.on_click === "object" && next.on_click) {
    next.on_click = {
      ...(next.on_click as Record<string, unknown>),
      triggers: undefined,
      sound_url: undefined,
      run_emphasis: undefined,
    };
  }
  return next as T;
}
