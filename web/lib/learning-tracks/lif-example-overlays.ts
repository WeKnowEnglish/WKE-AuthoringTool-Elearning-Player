import type {
  LearningTrackLanguageInFocusSettings,
  LearningTrackLifExampleOverlay,
  LearningTrackScreenPayload,
} from "@/lib/learning-tracks/composition-types";

/** Editable LiF listen example from compiled screens. */
export type LifExampleEditableItem = {
  exampleId: string;
  tabId: string;
  tabLabel: string;
  listenPreview: string;
  audioUrl: string;
};

function trimOrEmpty(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function compactLifExampleOverlay(
  overlay: LearningTrackLifExampleOverlay,
): LearningTrackLifExampleOverlay | null {
  const exampleId = trimOrEmpty(overlay.exampleId);
  if (!exampleId) return null;
  const audioUrl = trimOrEmpty(overlay.audioUrl);
  if (!audioUrl) return null;
  return { exampleId, audioUrl };
}

export function pruneLifExampleOverlays(
  overlays: LearningTrackLifExampleOverlay[] | undefined,
  exampleIds: Iterable<string>,
): LearningTrackLifExampleOverlay[] | undefined {
  if (!overlays?.length) return undefined;
  const allowed = new Set(exampleIds);
  const next = overlays
    .map(compactLifExampleOverlay)
    .filter((overlay): overlay is LearningTrackLifExampleOverlay => overlay !== null)
    .filter((overlay) => allowed.has(overlay.exampleId));
  return next.length > 0 ? next : undefined;
}

/**
 * Stamp per-example audio_url onto language_in_focus examples.
 * Keyed by stable example id.
 */
export function applyLifExampleOverlays(
  screens: LearningTrackScreenPayload[],
  settings: LearningTrackLanguageInFocusSettings | undefined,
): LearningTrackScreenPayload[] {
  const overlays = settings?.exampleOverlays;
  if (!overlays?.length) return screens;
  const byId = new Map(
    overlays
      .map(compactLifExampleOverlay)
      .filter((overlay): overlay is LearningTrackLifExampleOverlay => overlay !== null)
      .map((overlay) => [overlay.exampleId, overlay] as const),
  );
  if (byId.size < 1) return screens;

  return screens.map((screen) => {
    if (screen.subtype !== "language_in_focus") return screen;
    if (!Array.isArray(screen.examples)) return screen;

    const examples = screen.examples.map((example) => {
      if (!example || typeof example !== "object" || Array.isArray(example)) {
        return example;
      }
      const record = example as Record<string, unknown>;
      const exampleId = typeof record.id === "string" ? record.id.trim() : "";
      if (!exampleId) return example;
      const overlay = byId.get(exampleId);
      if (!overlay?.audioUrl) return example;
      return { ...record, audio_url: overlay.audioUrl };
    });

    return { ...screen, examples };
  });
}

function previewFromValues(values: unknown): string {
  if (!values || typeof values !== "object" || Array.isArray(values)) return "";
  return Object.values(values as Record<string, unknown>)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
    .join(" · ");
}

export function listLifExamplesFromScreens(
  screens: LearningTrackScreenPayload[],
): LifExampleEditableItem[] {
  const items: LifExampleEditableItem[] = [];
  for (const screen of screens) {
    if (screen.subtype !== "language_in_focus") continue;
    if (!Array.isArray(screen.examples)) continue;

    const tabLabels = new Map<string, string>();
    if (Array.isArray(screen.tabs)) {
      for (const tab of screen.tabs) {
        if (!tab || typeof tab !== "object" || Array.isArray(tab)) continue;
        const record = tab as Record<string, unknown>;
        const id = typeof record.id === "string" ? record.id.trim() : "";
        const label = typeof record.label === "string" ? record.label.trim() : "";
        if (id) tabLabels.set(id, label || id);
      }
    }

    for (const example of screen.examples) {
      if (!example || typeof example !== "object" || Array.isArray(example)) continue;
      const record = example as Record<string, unknown>;
      const exampleId = typeof record.id === "string" ? record.id.trim() : "";
      if (!exampleId) continue;
      const tabId = typeof record.tab_id === "string" ? record.tab_id.trim() : "";
      const audioUrl =
        typeof record.audio_url === "string" ? record.audio_url.trim() : "";
      items.push({
        exampleId,
        tabId,
        tabLabel: tabLabels.get(tabId) ?? (tabId || exampleId),
        listenPreview: previewFromValues(record.values),
        audioUrl,
      });
    }
  }
  return items;
}

export type LifExampleOverlayPatch = {
  audioUrl?: string | null;
};

export function upsertLifExampleOverlay(
  overlays: LearningTrackLifExampleOverlay[] | undefined,
  exampleId: string,
  patch: LifExampleOverlayPatch,
): LearningTrackLifExampleOverlay[] | undefined {
  const current = overlays?.find((overlay) => overlay.exampleId === exampleId);
  const draft: LearningTrackLifExampleOverlay = {
    exampleId,
    ...(current ?? {}),
  };

  if (patch.audioUrl !== undefined) {
    if (patch.audioUrl === null || !patch.audioUrl.trim()) {
      delete draft.audioUrl;
    } else {
      draft.audioUrl = patch.audioUrl.trim();
    }
  }

  const compacted = compactLifExampleOverlay(draft);
  const without = (overlays ?? []).filter((overlay) => overlay.exampleId !== exampleId);
  if (!compacted) return without.length > 0 ? without : undefined;
  return [...without, compacted];
}
