import type {
  LearningTrackListenAndChooseSettings,
  LearningTrackListenItemOverlay,
  LearningTrackScreenPayload,
} from "@/lib/learning-tracks/composition-types";

/** Editable Listen & Choose row from compiled screens. */
export type ListenEditableItem = {
  itemIndex: number;
  bodyText: string;
  dialogText: string;
  promptAudioUrl: string;
  autoPlay: boolean;
};

function trimOrEmpty(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Drop empty overlay fields. Text keeps spaces unless trimText is set. */
export function compactListenItemOverlay(
  overlay: LearningTrackListenItemOverlay,
  options?: { trimText?: boolean },
): LearningTrackListenItemOverlay | null {
  if (!Number.isFinite(overlay.itemIndex) || overlay.itemIndex < 0) return null;
  const trimText = options?.trimText === true;
  const next: LearningTrackListenItemOverlay = {
    itemIndex: Math.floor(overlay.itemIndex),
  };

  if (typeof overlay.bodyText === "string") {
    const bodyText = trimText ? overlay.bodyText.trim() : overlay.bodyText;
    if (bodyText.length > 0) next.bodyText = bodyText;
  }

  const audio = trimOrEmpty(overlay.promptAudioUrl);
  if (audio) next.promptAudioUrl = audio;
  if (typeof overlay.autoPlay === "boolean") next.autoPlay = overlay.autoPlay;

  if (
    !next.bodyText &&
    !next.promptAudioUrl &&
    typeof next.autoPlay !== "boolean"
  ) {
    return null;
  }
  return next;
}

export function pruneListenItemOverlays(
  overlays: LearningTrackListenItemOverlay[] | undefined,
  itemIndexes: Iterable<number>,
): LearningTrackListenItemOverlay[] | undefined {
  if (!overlays?.length) return undefined;
  const allowed = new Set(itemIndexes);
  const next = overlays
    .filter((overlay) => allowed.has(overlay.itemIndex))
    .map((overlay) => compactListenItemOverlay(overlay, { trimText: true }))
    .filter((overlay): overlay is LearningTrackListenItemOverlay => overlay !== null);
  return next.length > 0 ? next : undefined;
}

/**
 * Stamp per-item question prompt / audio / auto_play onto listen_and_choose screens.
 * Keyed by quiz_group_order (falls back to sequential listen screens).
 */
export function applyListenItemOverlays(
  screens: LearningTrackScreenPayload[],
  settings: LearningTrackListenAndChooseSettings | undefined,
): LearningTrackScreenPayload[] {
  const overlays = settings?.itemOverlays;
  if (!overlays?.length) return screens;
  const byIndex = new Map(
    overlays
      .map((overlay) => compactListenItemOverlay(overlay, { trimText: true }))
      .filter((overlay): overlay is LearningTrackListenItemOverlay => overlay !== null)
      .map((overlay) => [overlay.itemIndex, overlay] as const),
  );
  if (byIndex.size < 1) return screens;

  let listenOrder = 0;
  return screens.map((screen) => {
    if (screen.subtype !== "listen_and_choose") return screen;
    const order =
      typeof screen.quiz_group_order === "number" && Number.isFinite(screen.quiz_group_order)
        ? Math.floor(screen.quiz_group_order)
        : listenOrder;
    listenOrder += 1;
    const overlay = byIndex.get(order);
    if (!overlay) return screen;

    const next: LearningTrackScreenPayload = { ...screen };
    if (overlay.bodyText) {
      next.body_text = overlay.bodyText;
    }
    if (overlay.promptAudioUrl) {
      next.prompt_audio_url = overlay.promptAudioUrl;
    }
    if (typeof overlay.autoPlay === "boolean") {
      next.auto_play = overlay.autoPlay;
    }
    return next;
  });
}

export function listListenItemsFromScreens(
  screens: LearningTrackScreenPayload[],
): ListenEditableItem[] {
  const items: ListenEditableItem[] = [];
  let fallbackOrder = 0;
  for (const screen of screens) {
    if (screen.subtype !== "listen_and_choose") continue;
    const itemIndex =
      typeof screen.quiz_group_order === "number" && Number.isFinite(screen.quiz_group_order)
        ? Math.floor(screen.quiz_group_order)
        : fallbackOrder;
    fallbackOrder += 1;
    items.push({
      itemIndex,
      bodyText: typeof screen.body_text === "string" ? screen.body_text : "",
      dialogText: typeof screen.dialog_text === "string" ? screen.dialog_text : "",
      promptAudioUrl:
        typeof screen.prompt_audio_url === "string" ? screen.prompt_audio_url.trim() : "",
      autoPlay: screen.auto_play === true,
    });
  }
  return items;
}

export type ListenItemOverlayPatch = {
  bodyText?: string | null;
  promptAudioUrl?: string | null;
  autoPlay?: boolean | null;
};

export function upsertListenItemOverlay(
  overlays: LearningTrackListenItemOverlay[] | undefined,
  itemIndex: number,
  patch: ListenItemOverlayPatch,
): LearningTrackListenItemOverlay[] | undefined {
  const current = overlays?.find((overlay) => overlay.itemIndex === itemIndex);
  const draft: LearningTrackListenItemOverlay = {
    itemIndex,
    ...(current ?? {}),
  };

  if (patch.bodyText !== undefined) {
    if (patch.bodyText === null || patch.bodyText.length === 0) {
      delete draft.bodyText;
    } else {
      draft.bodyText = patch.bodyText;
    }
  }

  if (patch.promptAudioUrl !== undefined) {
    if (patch.promptAudioUrl === null || !patch.promptAudioUrl.trim()) {
      delete draft.promptAudioUrl;
    } else {
      draft.promptAudioUrl = patch.promptAudioUrl.trim();
    }
  }

  if (patch.autoPlay !== undefined) {
    if (patch.autoPlay === null) delete draft.autoPlay;
    else draft.autoPlay = patch.autoPlay;
  }

  const compacted = compactListenItemOverlay(draft, { trimText: false });
  const without = (overlays ?? []).filter((overlay) => overlay.itemIndex !== itemIndex);
  if (!compacted) return without.length > 0 ? without : undefined;
  return [...without, compacted];
}
