import type { ExploreHotspotsDocument } from "@/lib/hotspots/types";
import type { WkeObjectAction } from "@/lib/wke-activity/types";
import { getTeacherMediaByIds } from "@/lib/actions/media";

function isHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  return /^https?:\/\//i.test(value.trim());
}

function collectMediaAssetIds(document: ExploreHotspotsDocument): string[] {
  const ids: string[] = [];
  for (const asset of document.assets) {
    if (asset.mediaAssetId?.trim()) ids.push(asset.mediaAssetId.trim());
  }
  for (const element of document.layout.elements) {
    if (element.kind !== "hotspot") continue;
    const onTap = element.onTap;
    if (!Array.isArray(onTap)) continue;
    for (const action of onTap) {
      if (action.type === "play_audio" && action.mediaAssetId?.trim()) {
        ids.push(action.mediaAssetId.trim());
      }
    }
  }
  for (const phase of document.interaction.phases ?? []) {
    for (const action of phase.onEnter ?? []) {
      if (action.type === "play_audio" && action.mediaAssetId?.trim()) {
        ids.push(action.mediaAssetId.trim());
      }
    }
  }
  for (const dialogue of document.interaction.dialogues) {
    for (const turn of dialogue.turns) {
      if (turn.mediaAssetId?.trim()) ids.push(turn.mediaAssetId.trim());
    }
  }
  return ids;
}

function mapPlayAudioAction(
  action: WkeObjectAction,
  urlById: Map<string, string>,
): WkeObjectAction {
  if (action.type !== "play_audio" || !action.mediaAssetId?.trim()) return action;
  const fresh = urlById.get(action.mediaAssetId.trim());
  if (!fresh || fresh === action.audioUrl) return action;
  return { ...action, audioUrl: fresh };
}

/**
 * Apply a media_assets id → public_url map onto a hotspots document.
 * - Image assets: refresh `src` only when it is already http(s) (keeps processed
 *   data-URL sprites that still point at a library source id).
 * - Audio: always prefer the library URL when an id is present.
 */
export function applyMediaAssetUrlMap(
  document: ExploreHotspotsDocument,
  urlById: Map<string, string>,
): ExploreHotspotsDocument {
  if (urlById.size === 0) return document;

  let dirty = false;

  const assets = document.assets.map((asset) => {
    const id = asset.mediaAssetId?.trim();
    if (!id) return asset;
    const fresh = urlById.get(id);
    if (!fresh || fresh === asset.src) return asset;
    if (!isHttpUrl(asset.src)) return asset;
    dirty = true;
    return { ...asset, src: fresh };
  });

  const elements = document.layout.elements.map((element) => {
    if (element.kind !== "hotspot" || !Array.isArray(element.onTap) || !element.onTap.length) {
      return element;
    }
    let actionDirty = false;
    const onTap = element.onTap.map((action) => {
      const next = mapPlayAudioAction(action, urlById);
      if (next !== action) actionDirty = true;
      return next;
    });
    if (!actionDirty) return element;
    dirty = true;
    return { ...element, onTap };
  });

  const phases = (document.interaction.phases ?? []).map((phase) => {
    if (!phase.onEnter?.length) return phase;
    let actionDirty = false;
    const onEnter = phase.onEnter.map((action) => {
      const next = mapPlayAudioAction(action, urlById);
      if (next !== action) actionDirty = true;
      return next;
    });
    if (!actionDirty) return phase;
    dirty = true;
    return { ...phase, onEnter };
  });

  const dialogues = document.interaction.dialogues.map((dialogue) => {
    let turnDirty = false;
    const turns = dialogue.turns.map((turn) => {
      const id = turn.mediaAssetId?.trim();
      if (!id || !turn.audioUrl) return turn;
      const fresh = urlById.get(id);
      if (!fresh || fresh === turn.audioUrl) return turn;
      turnDirty = true;
      return { ...turn, audioUrl: fresh };
    });
    if (!turnDirty) return dialogue;
    dirty = true;
    return { ...dialogue, turns };
  });

  if (!dirty) return document;

  return {
    ...document,
    assets,
    layout: { ...document.layout, elements },
    interaction: {
      ...document.interaction,
      dialogues,
      ...(document.interaction.phases ? { phases } : {}),
    },
  };
}

/** Refresh http(s) media URLs from the teacher library when mediaAssetId is set. */
export async function resolveExploreHotspotsMediaUrls(
  document: ExploreHotspotsDocument,
): Promise<ExploreHotspotsDocument> {
  const ids = collectMediaAssetIds(document);
  if (ids.length === 0) return document;
  const rows = await getTeacherMediaByIds(ids);
  if (rows.length === 0) return document;
  const urlById = new Map(rows.map((row) => [row.id, row.public_url] as const));
  return applyMediaAssetUrlMap(document, urlById);
}
