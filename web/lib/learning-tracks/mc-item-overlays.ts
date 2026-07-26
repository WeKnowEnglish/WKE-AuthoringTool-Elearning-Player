import type { GamesAuthoringDocument, GamesMcItem } from "@/lib/activity-builder/games/types-mc";
import type {
  LearningTrackMcItemOverlay,
  LearningTrackScreenPayload,
} from "@/lib/learning-tracks/composition-types";

/** Editable MCQ row derived from compiled Lesson Player screens. */
export type McQuizEditableItem = {
  itemId: string;
  question: string;
  options: Array<{ id: string; label: string }>;
  promptAudioUrl: string;
  correctOptionId: string;
};

function trimOrEmpty(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Drop overlay fields that are empty; drop the whole overlay when nothing remains.
 * Text fields keep internal spaces (trim only at apply time). Audio still trims. */
export function compactMcItemOverlay(
  overlay: LearningTrackMcItemOverlay,
  options?: { trimText?: boolean },
): LearningTrackMcItemOverlay | null {
  const trimText = options?.trimText === true;
  const next: LearningTrackMcItemOverlay = { itemId: overlay.itemId };

  if (typeof overlay.question === "string") {
    const question = trimText ? overlay.question.trim() : overlay.question;
    if (question.length > 0) next.question = question;
  }

  if (overlay.optionLabels) {
    const labels: Record<string, string> = {};
    for (const [optionId, label] of Object.entries(overlay.optionLabels)) {
      if (typeof label !== "string") continue;
      const value = trimText ? label.trim() : label;
      if (value.length > 0) labels[optionId] = value;
    }
    if (Object.keys(labels).length > 0) next.optionLabels = labels;
  }

  const correctOptionId = trimOrEmpty(overlay.correctOptionId);
  if (correctOptionId) next.correctOptionId = correctOptionId;

  const audio = trimOrEmpty(overlay.promptAudioUrl);
  if (audio) next.promptAudioUrl = audio;

  if (
    !next.question &&
    !next.optionLabels &&
    !next.correctOptionId &&
    !next.promptAudioUrl
  ) {
    return null;
  }
  return next;
}

/** Keep overlays that still match compiled item ids. */
export function pruneMcItemOverlays(
  overlays: LearningTrackMcItemOverlay[] | undefined,
  itemIds: Iterable<string>,
): LearningTrackMcItemOverlay[] | undefined {
  if (!overlays?.length) return undefined;
  const allowed = new Set(itemIds);
  const next = overlays
    .filter((overlay) => allowed.has(overlay.itemId))
    .map((overlay) => compactMcItemOverlay(overlay))
    .filter((overlay): overlay is LearningTrackMcItemOverlay => overlay !== null);
  return next.length > 0 ? next : undefined;
}

/**
 * Apply per-item text/audio overlays onto a compiled MCQ authoring document.
 * Empty overlay fields keep the compiled value. Orphan overlays are ignored.
 */
export function applyMcItemOverlays(
  document: GamesAuthoringDocument,
  overlays: LearningTrackMcItemOverlay[] | undefined,
): GamesAuthoringDocument {
  if (!overlays?.length) return document;
  const byId = new Map(
    overlays
      .map((overlay) => compactMcItemOverlay(overlay, { trimText: true }))
      .filter((overlay): overlay is LearningTrackMcItemOverlay => overlay !== null)
      .map((overlay) => [overlay.itemId, overlay] as const),
  );
  if (byId.size < 1) return document;

  const items: GamesMcItem[] = document.interaction.items.map((item) => {
    const overlay = byId.get(item.id);
    if (!overlay) return item;

    let next: GamesMcItem = item;
    if (overlay.question) {
      next = { ...next, question: overlay.question };
    }
    if (overlay.optionLabels) {
      next = {
        ...next,
        options: next.options.map((option) => {
          const label = overlay.optionLabels?.[option.id];
          return label ? { ...option, label } : option;
        }),
      };
    }
    if (
      overlay.correctOptionId &&
      next.options.some((option) => option.id === overlay.correctOptionId)
    ) {
      next = { ...next, correctOptionId: overlay.correctOptionId };
    }
    if (overlay.promptAudioUrl) {
      next = { ...next, promptAudioUrl: overlay.promptAudioUrl };
    }
    return next;
  });

  return {
    ...document,
    interaction: {
      ...document.interaction,
      items,
    },
  };
}

/** Read MCQ items from compiled track screens (requires `item_id` from export). */
export function listMcQuizItemsFromScreens(
  screens: LearningTrackScreenPayload[],
): McQuizEditableItem[] {
  const items: McQuizEditableItem[] = [];
  for (const screen of screens) {
    if (screen.subtype !== "mc_quiz") continue;
    const itemId =
      typeof screen.item_id === "string" ? screen.item_id.trim() : "";
    if (!itemId) continue;
    const question =
      typeof screen.question === "string" ? screen.question : "";
    const correctOptionId =
      typeof screen.correct_option_id === "string" ? screen.correct_option_id : "";
    const promptAudioUrl =
      typeof screen.prompt_audio_url === "string" ? screen.prompt_audio_url.trim() : "";
    const rawOptions = Array.isArray(screen.options) ? screen.options : [];
    const options = rawOptions
      .map((option) => {
        if (!option || typeof option !== "object" || Array.isArray(option)) return null;
        const record = option as Record<string, unknown>;
        const id = typeof record.id === "string" ? record.id.trim() : "";
        const label = typeof record.label === "string" ? record.label : "";
        if (!id) return null;
        return { id, label };
      })
      .filter((option): option is { id: string; label: string } => option !== null);
    items.push({
      itemId,
      question,
      options,
      promptAudioUrl,
      correctOptionId,
    });
  }
  return items;
}

export type McItemOverlayPatch = {
  question?: string | null;
  optionLabel?: { optionId: string; label: string | null };
  correctOptionId?: string | null;
  promptAudioUrl?: string | null;
};

/** Upsert one item overlay; removes empty overlays. */
export function upsertMcItemOverlay(
  overlays: LearningTrackMcItemOverlay[] | undefined,
  itemId: string,
  patch: McItemOverlayPatch,
): LearningTrackMcItemOverlay[] | undefined {
  const current = overlays?.find((overlay) => overlay.itemId === itemId);
  const draft: LearningTrackMcItemOverlay = {
    itemId,
    ...(current ?? {}),
  };

  if (patch.question !== undefined) {
    if (patch.question === null || patch.question.length === 0) {
      delete draft.question;
    } else {
      draft.question = patch.question;
    }
  }

  if (patch.optionLabel) {
    const labels = { ...(draft.optionLabels ?? {}) };
    const { optionId, label } = patch.optionLabel;
    if (label === null || label.length === 0) {
      delete labels[optionId];
    } else {
      labels[optionId] = label;
    }
    if (Object.keys(labels).length > 0) draft.optionLabels = labels;
    else delete draft.optionLabels;
  }

  if (patch.correctOptionId !== undefined) {
    if (patch.correctOptionId === null || !patch.correctOptionId.trim()) {
      delete draft.correctOptionId;
    } else {
      draft.correctOptionId = patch.correctOptionId.trim();
    }
  }

  if (patch.promptAudioUrl !== undefined) {
    if (patch.promptAudioUrl === null || !patch.promptAudioUrl.trim()) {
      delete draft.promptAudioUrl;
    } else {
      draft.promptAudioUrl = patch.promptAudioUrl.trim();
    }
  }

  // Keep draft spaces while typing; only drop wholly empty overlays.
  const compacted = compactMcItemOverlay(draft, { trimText: false });
  const without = (overlays ?? []).filter((overlay) => overlay.itemId !== itemId);
  if (!compacted) return without.length > 0 ? without : undefined;
  return [...without, compacted];
}
