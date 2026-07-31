import type {
  ExploreHotspotsDocument,
  HotspotElement,
  HotspotGeometry,
  Dialogue,
  ActivityAssetReference,
} from "@/lib/hotspots/types";
import { ensurePhases, withEnsuredPhases } from "@/lib/hotspots/phases";

export type HotspotClipboardPayload = {
  version: 1;
  hotspot: HotspotElement;
  dialogues: Dialogue[];
  assets: ActivityAssetReference[];
};

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

export function offsetGeometry(
  geometry: HotspotGeometry,
  dx = 0.03,
  dy = 0.03,
): HotspotGeometry {
  if (geometry.shape === "rectangle") {
    return {
      ...geometry,
      x: Math.max(0, Math.min(1 - geometry.width, geometry.x + dx)),
      y: Math.max(0, Math.min(1 - geometry.height, geometry.y + dy)),
    };
  }
  if (geometry.shape === "ellipse") {
    return {
      ...geometry,
      cx: Math.max(geometry.rx, Math.min(1 - geometry.rx, geometry.cx + dx)),
      cy: Math.max(geometry.ry, Math.min(1 - geometry.ry, geometry.cy + dy)),
    };
  }
  return {
    ...geometry,
    points: geometry.points.map((point) => ({
      x: Math.max(0, Math.min(1, point.x + dx)),
      y: Math.max(0, Math.min(1, point.y + dy)),
    })),
  };
}

function uniqueId(prefix: string, used: Set<string>): string {
  let index = 1;
  let id = `${prefix}-${index}`;
  while (used.has(id)) {
    index += 1;
    id = `${prefix}-${index}`;
  }
  used.add(id);
  return id;
}

export function buildHotspotClipboardPayload(
  document: ExploreHotspotsDocument,
  hotspotId: string,
): HotspotClipboardPayload | null {
  const hotspot = document.layout.elements.find(
    (element): element is HotspotElement =>
      element.kind === "hotspot" && element.id === hotspotId,
  );
  if (!hotspot) return null;
  const dialogues = document.interaction.dialogues.filter(
    (dialogue) => dialogue.hotspotId === hotspotId,
  );
  const assets =
    hotspot.presentation === "sprite" && hotspot.spriteAssetId
      ? document.assets.filter((asset) => asset.id === hotspot.spriteAssetId)
      : [];
  return {
    version: 1,
    hotspot: structuredClone(hotspot),
    dialogues: structuredClone(dialogues),
    assets: structuredClone(assets),
  };
}

export function parseHotspotClipboardPayload(
  raw: unknown,
): HotspotClipboardPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<HotspotClipboardPayload>;
  if (data.version !== 1 || !data.hotspot || data.hotspot.kind !== "hotspot") {
    return null;
  }
  return {
    version: 1,
    hotspot: data.hotspot,
    dialogues: Array.isArray(data.dialogues) ? data.dialogues : [],
    assets: Array.isArray(data.assets) ? data.assets : [],
  };
}

export function insertHotspotClipboardPayload(
  document: ExploreHotspotsDocument,
  payload: HotspotClipboardPayload,
  options?: { phaseId?: string | null; offset?: boolean },
): { document: ExploreHotspotsDocument; newId: string } {
  const withPhases = withEnsuredPhases(document);
  const used = new Set<string>([
    ...withPhases.layout.elements.map((element) => element.id),
    ...withPhases.assets.map((asset) => asset.id),
    ...withPhases.interaction.dialogues.map((dialogue) => dialogue.id),
  ]);

  const newId = uniqueId(
    payload.hotspot.presentation === "sprite"
      ? "sprite"
      : payload.hotspot.presentation === "shape"
        ? "shape"
        : payload.hotspot.presentation === "text"
          ? "text"
          : "hotspot",
    used,
  );

  let spriteAssetId = payload.hotspot.spriteAssetId;
  const nextAssets = [...withPhases.assets];
  if (payload.hotspot.presentation === "sprite" && payload.assets[0]) {
    const source = payload.assets[0];
    const newAssetId = uniqueId("sprite-asset", used);
    nextAssets.push({ ...structuredClone(source), id: newAssetId });
    spriteAssetId = newAssetId;
  }

  const geometry =
    options?.offset === false
      ? structuredClone(payload.hotspot.geometry)
      : offsetGeometry(structuredClone(payload.hotspot.geometry));

  const hotspotCount = withPhases.layout.elements.filter(
    (element) => element.kind === "hotspot",
  ).length;

  const nextHotspot: HotspotElement = {
    ...structuredClone(payload.hotspot),
    id: newId,
    geometry,
    tabOrder: hotspotCount + 1,
    orderIndex: hotspotCount,
    zIndex: hotspotCount,
    ...(spriteAssetId ? { spriteAssetId } : {}),
  };

  const nextDialogues = payload.dialogues.map((dialogue) => {
    const dialogueId = uniqueId(`dialogue-${newId}`, used);
    return {
      ...structuredClone(dialogue),
      id: dialogueId,
      hotspotId: newId,
    };
  });

  const targetPhaseId =
    options?.phaseId ?? ensurePhases(withPhases)[0]?.id ?? null;
  const nextPhases = ensurePhases(withPhases).map((phase) =>
    phase.id === targetPhaseId
      ? { ...phase, hotspotIds: [...phase.hotspotIds, newId] }
      : phase,
  );

  return {
    newId,
    document: {
      ...withPhases,
      assets: nextAssets,
      layout: {
        ...withPhases.layout,
        elements: [...withPhases.layout.elements, nextHotspot],
      },
      interaction: {
        ...withPhases.interaction,
        dialogues: [...withPhases.interaction.dialogues, ...nextDialogues],
        phases: nextPhases,
      },
    },
  };
}

export async function imageFileFromClipboardData(
  clipboardData: DataTransfer | null,
): Promise<File | null> {
  if (!clipboardData) return null;
  const items = Array.from(clipboardData.items ?? []);
  for (const item of items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  for (const file of Array.from(clipboardData.files ?? [])) {
    if (file.type.startsWith("image/")) return file;
  }
  return null;
}

/** Read image from system clipboard (Chromium). Falls back to null when blocked. */
export async function imageFileFromSystemClipboard(): Promise<File | null> {
  if (!navigator.clipboard || !("read" in navigator.clipboard)) return null;
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find((candidate) => candidate.startsWith("image/"));
      if (!type) continue;
      const blob = await item.getType(type);
      const extension = type.split("/")[1] ?? "png";
      return new File([blob], `pasted-image.${extension}`, { type });
    }
  } catch {
    return null;
  }
  return null;
}
