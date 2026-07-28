import type {
  ExploreHotspotsDocument,
  HotspotElement,
} from "@/lib/hotspots";
import type { WkePhase } from "@/lib/wke-activity/types";

function mediaAssetId(document: ExploreHotspotsDocument): string {
  const media = document.layout.elements.find((element) => element.kind === "media");
  if (!media || media.kind !== "media") {
    throw new Error("Missing media element");
  }
  return String(media.assetId);
}

function allHotspotIds(document: ExploreHotspotsDocument): string[] {
  return document.layout.elements
    .filter((element): element is HotspotElement => element.kind === "hotspot")
    .map((hotspot) => hotspot.id);
}

/** Ensure at least one phase exists (synthesized from current media + all objects). */
export function ensurePhases(document: ExploreHotspotsDocument): WkePhase[] {
  if (document.interaction.phases?.length) {
    return document.interaction.phases;
  }
  return [
    {
      id: "phase-1",
      title: "Scene 1",
      imageAssetId: mediaAssetId(document),
      hotspotIds: allHotspotIds(document),
    },
  ];
}

export function withEnsuredPhases(
  document: ExploreHotspotsDocument,
): ExploreHotspotsDocument {
  if (document.interaction.phases?.length) {
    return document;
  }
  return {
    ...document,
    interaction: {
      ...document.interaction,
      phases: ensurePhases(document),
    },
  };
}

export function hotspotsForPhase(
  document: ExploreHotspotsDocument,
  phaseId: string | null,
): HotspotElement[] {
  const hotspots = document.layout.elements.filter(
    (element): element is HotspotElement => element.kind === "hotspot",
  );
  if (!phaseId) return hotspots;
  const phases = ensurePhases(document);
  const phase = phases.find((entry) => entry.id === phaseId) ?? phases[0];
  if (!phase) return hotspots;
  const allowed = new Set(phase.hotspotIds);
  return hotspots.filter((hotspot) => allowed.has(hotspot.id));
}

export function nextPhaseId(phases: WkePhase[]): string {
  let index = phases.length + 1;
  let id = `phase-${index}`;
  const used = new Set(phases.map((phase) => phase.id));
  while (used.has(id)) {
    index += 1;
    id = `phase-${index}`;
  }
  return id;
}
