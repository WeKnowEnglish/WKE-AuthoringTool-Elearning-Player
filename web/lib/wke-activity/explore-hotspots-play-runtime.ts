import type { ScreenPayload } from "@/lib/lesson-schemas";

export type ExploreHotspotsParsed = Extract<
  ScreenPayload,
  { type: "interaction"; subtype: "explore_hotspots" }
>;

export type ExploreHotspotItem = ExploreHotspotsParsed["hotspots"][number];
export type ExploreHotspotResponseCard = NonNullable<
  ExploreHotspotItem["response_cards"]
>[number];
export type ExploreHotspotOnTapAction = NonNullable<
  ExploreHotspotItem["on_tap"]
>[number];

export type PlayPhase = {
  id: string;
  title?: string;
  image_url: string;
  image_alt?: string;
  image_width?: number;
  image_height?: number;
  hotspot_ids: string[];
  on_enter?: ExploreHotspotOnTapAction[];
  objective?: { label?: string };
  strict_order?: boolean;
  hint_pulse_enabled?: boolean;
  visited_when?: "dialogue_started" | "dialogue_finished";
  auto_play_on_select?: boolean;
};

export type PhasePlaybackSettings = {
  objectiveLabel?: string;
  strictOrder: boolean;
  hintPulseEnabled: boolean;
  visitedWhen: "dialogue_started" | "dialogue_finished";
  autoPlayOnSelect: boolean;
};

/** Prefer scene-level playback; fall back to activity-level legacy fields. */
export function resolvePhasePlayback(
  phase: PlayPhase | undefined,
  activity: Pick<
    ExploreHotspotsParsed,
    | "objective"
    | "strict_order"
    | "hint_pulse_enabled"
    | "visited_when"
    | "auto_play_on_select"
  >,
): PhasePlaybackSettings {
  const visitedWhen =
    phase?.visited_when ??
    activity.visited_when ??
    "dialogue_started";
  return {
    objectiveLabel: phase?.objective?.label ?? activity.objective?.label,
    strictOrder: phase?.strict_order ?? activity.strict_order ?? false,
    hintPulseEnabled: phase?.hint_pulse_enabled ?? activity.hint_pulse_enabled ?? false,
    visitedWhen,
    autoPlayOnSelect:
      phase?.auto_play_on_select ?? activity.auto_play_on_select ?? true,
  };
}

export type ObjectRuntimeState =
  | "locked"
  | "available"
  | "discovered"
  | "completed"
  | "incorrect"
  | "hidden";

export type StageObjectPlayState = {
  visible: boolean;
  opacity: number;
  geometry: {
    shape: "rectangle";
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  spriteSrc?: string;
  pulse?: boolean;
};

/** Flatten phases for play; synthesize one scene when authoring omitted phases. */
export function resolvePlayPhases(parsed: ExploreHotspotsParsed): PlayPhase[] {
  if (parsed.phases?.length) return parsed.phases;
  return [
    {
      id: "phase-1",
      title: parsed.activity_name ?? "Scene 1",
      image_url: parsed.image_url,
      image_alt: parsed.image_alt,
      image_width: parsed.image_width,
      image_height: parsed.image_height,
      hotspot_ids: parsed.hotspots.map((hotspot) => hotspot.id),
    },
  ];
}

export function hotspotsInPhase(
  parsed: ExploreHotspotsParsed,
  phase: PlayPhase,
): ExploreHotspotItem[] {
  const allowed = new Set(phase.hotspot_ids);
  return parsed.hotspots.filter((hotspot) => allowed.has(hotspot.id));
}

export function orderValue(hotspot: ExploreHotspotItem): number {
  return hotspot.order_index ?? hotspot.tab_order ?? 0;
}

export function sortedByOrder(hotspots: ExploreHotspotItem[]): ExploreHotspotItem[] {
  return [...hotspots].sort((a, b) => orderValue(a) - orderValue(b));
}

export function isObjectComplete(
  hotspot: ExploreHotspotItem,
  state: ObjectRuntimeState | undefined,
): boolean {
  /** Decorative props never need a tap — they must not block scene advance. */
  if (hotspot.interaction_kind === "none") return true;
  if (hotspot.required === false) return true;
  if (state === "hidden") return false;
  return state === "completed" || state === "discovered";
}

export function nextRequiredInOrder(
  phaseHotspots: ExploreHotspotItem[],
  states: Record<string, ObjectRuntimeState>,
): ExploreHotspotItem | null {
  for (const hotspot of sortedByOrder(phaseHotspots)) {
    if (hotspot.required === false) continue;
    if (!isObjectComplete(hotspot, states[hotspot.id])) return hotspot;
  }
  return null;
}

export function canSelectInStrictOrder(
  hotspot: ExploreHotspotItem,
  phaseHotspots: ExploreHotspotItem[],
  states: Record<string, ObjectRuntimeState>,
  strictOrder: boolean,
): boolean {
  if (!strictOrder) return true;
  if (isObjectComplete(hotspot, states[hotspot.id])) return true;
  const next = nextRequiredInOrder(phaseHotspots, states);
  return !next || next.id === hotspot.id;
}

export function responseStackFor(
  hotspot: ExploreHotspotItem,
): ExploreHotspotResponseCard[] {
  const kind = hotspot.interaction_kind ?? "dialogue";
  if (kind === "none" || kind === "silent") return [];
  if (hotspot.response_cards?.length) return hotspot.response_cards;
  if (kind === "dialogue") {
    return [{ id: `fallback-dialogue-${hotspot.id}`, kind: "dialogue" as const }];
  }
  if (kind === "info") {
    return [
      {
        id: `fallback-info-${hotspot.id}`,
        kind: "info" as const,
        text: hotspot.name ?? "Look closely.",
      },
    ];
  }
  if (kind === "audio") {
    return [
      {
        id: `fallback-audio-${hotspot.id}`,
        kind: "audio" as const,
        audio_url: "",
        label: "Listen",
      },
    ];
  }
  if (kind === "question") {
    return [];
  }
  return [{ id: `fallback-dialogue-${hotspot.id}`, kind: "dialogue" as const }];
}

/** Prefer on_tap; migrate legacy response_cards into actions. */
export function resolvePlayOnTap(
  hotspot: ExploreHotspotItem,
): ExploreHotspotOnTapAction[] {
  if (hotspot.on_tap?.length) return hotspot.on_tap;
  return responseStackFor(hotspot).map((card) => {
    switch (card.kind) {
      case "info":
        return {
          id: card.id,
          type: "show_info" as const,
          text: card.text,
          ...(card.image_url ? { image_url: card.image_url } : {}),
          wait: true,
        };
      case "audio":
        return {
          id: card.id,
          type: "play_audio" as const,
          audio_url: card.audio_url,
          ...(card.label ? { label: card.label } : {}),
          wait: true,
        };
      case "dialogue":
        return {
          id: card.id,
          type: "show_dialogue" as const,
          ...(card.dialogue_id ? { dialogue_id: card.dialogue_id } : {}),
          wait: true,
        };
      case "question":
        return {
          id: card.id,
          type: "ask_question" as const,
          prompt: card.prompt,
          question_type: card.question_type,
          choices: card.choices,
          correct_choice_id: card.correct_choice_id,
          ...(card.gate_discover != null ? { gate_discover: card.gate_discover } : {}),
          wait: true,
        };
      default: {
        const _exhaustive: never = card;
        return _exhaustive;
      }
    }
  });
}

export function isContentOnTapAction(
  action: ExploreHotspotOnTapAction,
): action is Extract<
  ExploreHotspotOnTapAction,
  | { type: "play_audio" }
  | { type: "show_dialogue" }
  | { type: "show_info" }
  | { type: "ask_question" }
> {
  return (
    action.type === "play_audio" ||
    action.type === "show_dialogue" ||
    action.type === "show_info" ||
    action.type === "ask_question"
  );
}

export function contentActionAsCard(
  action: ExploreHotspotOnTapAction,
): ExploreHotspotResponseCard | null {
  switch (action.type) {
    case "show_info":
      return {
        id: action.id,
        kind: "info",
        text: action.text,
        ...(action.image_url ? { image_url: action.image_url } : {}),
      };
    case "play_audio":
      return {
        id: action.id,
        kind: "audio",
        audio_url: action.audio_url,
        ...(action.label ? { label: action.label } : {}),
      };
    case "show_dialogue":
      return {
        id: action.id,
        kind: "dialogue",
        ...(action.dialogue_id ? { dialogue_id: action.dialogue_id } : {}),
      };
    case "ask_question":
      return {
        id: action.id,
        kind: "question",
        prompt: action.prompt,
        question_type: action.question_type,
        choices: action.choices,
        correct_choice_id: action.correct_choice_id,
        ...(action.gate_discover != null ? { gate_discover: action.gate_discover } : {}),
      };
    default:
      return null;
  }
}

export function isSpriteObject(hotspot: ExploreHotspotItem): boolean {
  return hotspot.presentation === "sprite";
}

export function isDecorativeObject(hotspot: ExploreHotspotItem): boolean {
  return hotspot.interaction_kind === "none";
}

export function isSilentObject(hotspot: ExploreHotspotItem): boolean {
  return hotspot.interaction_kind === "silent";
}

export function initialObjectStates(
  hotspots: ExploreHotspotItem[],
): Record<string, ObjectRuntimeState> {
  const states: Record<string, ObjectRuntimeState> = {};
  for (const hotspot of hotspots) {
    if (hotspot.initial_state === "locked") states[hotspot.id] = "locked";
    else if (hotspot.initial_state === "hidden") states[hotspot.id] = "hidden";
    else states[hotspot.id] = "available";
  }
  return states;
}

export function pointsToRectangleGeometry(
  points: Array<{ x: number; y: number }>,
): NonNullable<StageObjectPlayState["geometry"]> {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    shape: "rectangle",
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function stageStateForHotspot(hotspot: ExploreHotspotItem): StageObjectPlayState {
  const geometry =
    hotspot.presentation === "sprite" ? pointsToRectangleGeometry(hotspot.points) : null;
  return {
    visible: hotspot.initial_state !== "hidden",
    opacity: hotspot.initial_state === "hidden" ? 0 : 1,
    geometry,
    spriteSrc: hotspot.sprite_url,
    pulse: false,
  };
}

export function initialStageStates(
  hotspots: ExploreHotspotItem[],
): Record<string, StageObjectPlayState> {
  const states: Record<string, StageObjectPlayState> = {};
  for (const hotspot of hotspots) {
    states[hotspot.id] = stageStateForHotspot(hotspot);
  }
  return states;
}

export function phaseComplete(
  phaseHotspots: ExploreHotspotItem[],
  states: Record<string, ObjectRuntimeState>,
): boolean {
  return phaseHotspots.every((hotspot) => isObjectComplete(hotspot, states[hotspot.id]));
}

export function hintTargetId(
  phaseHotspots: ExploreHotspotItem[],
  states: Record<string, ObjectRuntimeState>,
  hintPulseEnabled: boolean,
): string | null {
  if (!hintPulseEnabled) return null;
  const next = nextRequiredInOrder(phaseHotspots, states);
  if (!next) return null;
  if (next.enable_hint_pulse === false) return null;
  return next.id;
}
