import type {
  ExploreHotspotsDocument,
  HotspotElement,
} from "@/lib/hotspots";
import type {
  WkeObjectAction,
  WkePhase,
  WkeResponseCard,
} from "@/lib/wke-activity/types";

/** Layout media element's document-local asset id (not teacher media_assets UUID). */
function layoutMediaDocumentAssetId(document: ExploreHotspotsDocument): string {
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
  const interaction = document.interaction;
  return [
    {
      id: "phase-1",
      title: "Scene 1",
      imageAssetId: layoutMediaDocumentAssetId(document),
      hotspotIds: allHotspotIds(document),
      ...(interaction.objective ? { objective: interaction.objective } : {}),
      ...(interaction.strictOrder != null
        ? { strictOrder: interaction.strictOrder }
        : {}),
      ...(interaction.hintPulseEnabled != null
        ? { hintPulseEnabled: interaction.hintPulseEnabled }
        : {}),
      ...(interaction.visitedWhen ? { visitedWhen: interaction.visitedWhen } : {}),
      ...(interaction.autoPlayOnSelect != null
        ? { autoPlayOnSelect: interaction.autoPlayOnSelect }
        : {}),
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

export function nextPhaseImageAssetId(document: ExploreHotspotsDocument): string {
  const used = new Set(document.assets.map((asset) => asset.id));
  let index = document.assets.length + 1;
  let id = `phase-image-${index}`;
  while (used.has(id)) {
    index += 1;
    id = `phase-image-${index}`;
  }
  return id;
}

export function phasesUsingAsset(phases: WkePhase[], assetId: string): number {
  return phases.filter((phase) => phase.imageAssetId === assetId).length;
}

/** Swap a phase one step left (`-1`) or right (`+1`). No-op at ends / missing id. */
export function movePhase(
  phases: WkePhase[],
  phaseId: string,
  direction: -1 | 1,
): WkePhase[] {
  const index = phases.findIndex((phase) => phase.id === phaseId);
  if (index < 0) return phases;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= phases.length) return phases;
  const next = [...phases];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item!);
  return next;
}

export function movePhaseInDocument(
  document: ExploreHotspotsDocument,
  phaseId: string,
  direction: -1 | 1,
): ExploreHotspotsDocument {
  const withPhases = withEnsuredPhases(document);
  const current = ensurePhases(withPhases);
  const reordered = movePhase(current, phaseId, direction);
  if (reordered === current) return document;
  return {
    ...withPhases,
    interaction: {
      ...withPhases.interaction,
      phases: reordered,
    },
  };
}

/** Clone an image asset so a scene can have its own background without affecting others. */
export function duplicateImageAsset(
  document: ExploreHotspotsDocument,
  sourceAssetId: string,
  newAssetId: string,
): ExploreHotspotsDocument {
  const source = document.assets.find((asset) => asset.id === sourceAssetId);
  if (!source) return document;
  if (document.assets.some((asset) => asset.id === newAssetId)) return document;
  return {
    ...document,
    assets: [...document.assets, { ...source, id: newAssetId }],
  };
}

/**
 * When multiple scenes point at the same asset, give this scene its own copy
 * so Replace image only affects the active scene.
 */
export function forkPhaseImageAsset(
  document: ExploreHotspotsDocument,
  phaseId: string,
): ExploreHotspotsDocument {
  const phases = ensurePhases(document);
  const phase = phases.find((entry) => entry.id === phaseId);
  if (!phase || phasesUsingAsset(phases, phase.imageAssetId) <= 1) {
    return document;
  }
  const newAssetId = nextPhaseImageAssetId(document);
  const withAsset = duplicateImageAsset(document, phase.imageAssetId, newAssetId);
  return {
    ...withAsset,
    interaction: {
      ...withAsset.interaction,
      phases: ensurePhases(withAsset).map((entry) =>
        entry.id === phaseId ? { ...entry, imageAssetId: newAssetId } : entry,
      ),
    },
  };
}

function uniquePrefixedId(prefix: string, used: Set<string>): string {
  let index = 1;
  let id = `${prefix}-${index}`;
  while (used.has(id)) {
    index += 1;
    id = `${prefix}-${index}`;
  }
  used.add(id);
  return id;
}

function hotspotIdPrefix(hotspot: HotspotElement): string {
  if (hotspot.presentation === "sprite") return "sprite";
  if (hotspot.presentation === "shape") return "shape";
  if (hotspot.presentation === "text") return "text";
  return "hotspot";
}

function remapActionIds(
  actions: WkeObjectAction[] | undefined,
  hotspotMap: Map<string, string>,
  dialogueMap: Map<string, string>,
): WkeObjectAction[] | undefined {
  if (!actions?.length) return actions;
  return actions.map((action) => {
    const next = { ...action } as WkeObjectAction & {
      targetId?: string;
      dialogueId?: string;
    };
    if (next.targetId && hotspotMap.has(next.targetId)) {
      next.targetId = hotspotMap.get(next.targetId)!;
    }
    if (next.dialogueId && dialogueMap.has(next.dialogueId)) {
      next.dialogueId = dialogueMap.get(next.dialogueId)!;
    }
    return next as WkeObjectAction;
  });
}

function remapResponseCards(
  cards: WkeResponseCard[] | undefined,
  dialogueMap: Map<string, string>,
): WkeResponseCard[] | undefined {
  if (!cards?.length) return cards;
  return cards.map((card) => {
    if (card.kind !== "dialogue" || !card.dialogueId) return structuredClone(card);
    const remapped = dialogueMap.get(card.dialogueId);
    return {
      ...structuredClone(card),
      ...(remapped ? { dialogueId: remapped } : {}),
    };
  });
}

/**
 * Clone a scene after the source: own image asset, cloned objects/dialogues,
 * and remapped in-scene action targets.
 */
export function duplicatePhaseInDocument(
  document: ExploreHotspotsDocument,
  phaseId: string,
): { document: ExploreHotspotsDocument; newPhaseId: string } | null {
  const withPhases = withEnsuredPhases(document);
  const phases = ensurePhases(withPhases);
  const sourceIndex = phases.findIndex((phase) => phase.id === phaseId);
  if (sourceIndex < 0) return null;
  const source = phases[sourceIndex]!;

  const newPhaseId = nextPhaseId(phases);
  const newImageAssetId = nextPhaseImageAssetId(withPhases);
  const withImage = duplicateImageAsset(
    withPhases,
    source.imageAssetId,
    newImageAssetId,
  );

  const usedHotspotIds = new Set(
    withImage.layout.elements
      .filter((element): element is HotspotElement => element.kind === "hotspot")
      .map((hotspot) => hotspot.id),
  );
  const usedDialogueIds = new Set(
    withImage.interaction.dialogues.map((dialogue) => dialogue.id),
  );

  const hotspotMap = new Map<string, string>();
  const sourceHotspots: HotspotElement[] = [];
  for (const oldId of source.hotspotIds) {
    const hotspot = withImage.layout.elements.find(
      (element): element is HotspotElement =>
        element.kind === "hotspot" && element.id === oldId,
    );
    if (!hotspot) continue;
    sourceHotspots.push(hotspot);
    hotspotMap.set(oldId, uniquePrefixedId(hotspotIdPrefix(hotspot), usedHotspotIds));
  }

  const dialogueMap = new Map<string, string>();
  const clonedDialogues = withImage.interaction.dialogues
    .filter((dialogue) => hotspotMap.has(dialogue.hotspotId))
    .map((dialogue) => {
      const newHotspotId = hotspotMap.get(dialogue.hotspotId)!;
      const newDialogueId = uniquePrefixedId(
        `dialogue-${newHotspotId}`,
        usedDialogueIds,
      );
      dialogueMap.set(dialogue.id, newDialogueId);
      return {
        ...structuredClone(dialogue),
        id: newDialogueId,
        hotspotId: newHotspotId,
      };
    });

  const clonedHotspots = sourceHotspots.map((hotspot) => {
    const newId = hotspotMap.get(hotspot.id)!;
    const clone = structuredClone(hotspot);
    const visualShape =
      clone.visualShape?.sourceAssetId === source.imageAssetId
        ? { ...clone.visualShape, sourceAssetId: newImageAssetId }
        : clone.visualShape;
    return {
      ...clone,
      id: newId,
      ...(visualShape ? { visualShape } : {}),
      onTap: remapActionIds(clone.onTap, hotspotMap, dialogueMap),
      responseCards: remapResponseCards(clone.responseCards, dialogueMap),
    } as HotspotElement;
  });

  const clonedPhase: WkePhase = {
    ...structuredClone(source),
    id: newPhaseId,
    title: source.title?.trim()
      ? `${source.title.trim()} copy`
      : `Scene ${phases.length + 1}`,
    imageAssetId: newImageAssetId,
    hotspotIds: source.hotspotIds
      .map((id) => hotspotMap.get(id))
      .filter((id): id is string => Boolean(id)),
    onEnter: remapActionIds(source.onEnter, hotspotMap, dialogueMap),
  };

  const nextPhases = [...phases];
  nextPhases.splice(sourceIndex + 1, 0, clonedPhase);

  return {
    newPhaseId,
    document: {
      ...withImage,
      layout: {
        ...withImage.layout,
        elements: [...withImage.layout.elements, ...clonedHotspots],
      },
      interaction: {
        ...withImage.interaction,
        dialogues: [...withImage.interaction.dialogues, ...clonedDialogues],
        phases: nextPhases,
      },
    },
  };
}
