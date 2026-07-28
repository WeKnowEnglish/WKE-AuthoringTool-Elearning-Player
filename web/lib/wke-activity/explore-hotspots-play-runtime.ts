import type { ScreenPayload } from "@/lib/lesson-schemas";

export type ExploreHotspotsParsed = Extract<
  ScreenPayload,
  { type: "interaction"; subtype: "explore_hotspots" }
>;

export type ExploreHotspotItem = ExploreHotspotsParsed["hotspots"][number];
export type ExploreHotspotResponseCard = NonNullable<
  ExploreHotspotItem["response_cards"]
>[number];

export type PlayPhase = {
  id: string;
  title?: string;
  image_url: string;
  image_alt?: string;
  image_width?: number;
  image_height?: number;
  hotspot_ids: string[];
};

export type ObjectRuntimeState =
  | "locked"
  | "available"
  | "discovered"
  | "completed"
  | "incorrect";

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
  if (hotspot.required === false) return true;
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
  if (hotspot.response_cards?.length) return hotspot.response_cards;
  const kind = hotspot.interaction_kind ?? "dialogue";
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
  return [{ id: `fallback-dialogue-${hotspot.id}`, kind: "dialogue" as const }];
}

export function initialObjectStates(
  hotspots: ExploreHotspotItem[],
): Record<string, ObjectRuntimeState> {
  const states: Record<string, ObjectRuntimeState> = {};
  for (const hotspot of hotspots) {
    states[hotspot.id] =
      hotspot.initial_state === "locked" ? "locked" : "available";
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
