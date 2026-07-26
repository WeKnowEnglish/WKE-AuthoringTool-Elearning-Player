import type {
  LearningTrackExploreHotspotsSettings,
  LearningTrackHotspotContentCard,
  LearningTrackHotspotDialogueTurnCard,
  LearningTrackHotspotPanelOverlay,
  LearningTrackHotspotTurnOverlay,
  LearningTrackScreenPayload,
} from "@/lib/learning-tracks/composition-types";

/** Editable hotspot panel derived from screens + overlays. */
export type HotspotPanelEditable = {
  dialogueId: string;
  dialogueTitle: string;
  hotspotId: string;
  cards: LearningTrackHotspotContentCard[];
  /** True when cards come from a saved panel overlay (not just the fixture). */
  isStaged: boolean;
};

function trimOrEmpty(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function newCardId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `card-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `card-${Date.now().toString(36)}`;
}

export function createDialogueTurnCard(
  partial?: Partial<Omit<LearningTrackHotspotDialogueTurnCard, "type">>,
): LearningTrackHotspotDialogueTurnCard {
  return {
    id: partial?.id ?? newCardId(),
    type: "dialogue_turn",
    speaker: partial?.speaker ?? "",
    text: partial?.text ?? "New line",
    ...(partial?.speakText?.trim()
      ? { speakText: partial.speakText.trim() }
      : {}),
    ...(partial?.audioUrl?.trim() ? { audioUrl: partial.audioUrl.trim() } : {}),
  };
}

function compactDialogueTurnCard(
  card: LearningTrackHotspotContentCard,
  options?: { trimText?: boolean },
): LearningTrackHotspotDialogueTurnCard | null {
  if (card.type !== "dialogue_turn") return null;
  const trimText = options?.trimText === true;
  const text = typeof card.text === "string" ? (trimText ? card.text.trim() : card.text) : "";
  if (!text) return null;
  const speaker =
    typeof card.speaker === "string"
      ? trimText
        ? card.speaker.trim()
        : card.speaker
      : "";
  const next: LearningTrackHotspotDialogueTurnCard = {
    id: trimOrEmpty(card.id) || newCardId(),
    type: "dialogue_turn",
    speaker,
    text,
  };
  const speakText = trimOrEmpty(card.speakText);
  if (speakText) next.speakText = speakText;
  const audioUrl = trimOrEmpty(card.audioUrl);
  if (audioUrl) next.audioUrl = audioUrl;
  return next;
}

export function compactHotspotPanelOverlay(
  overlay: LearningTrackHotspotPanelOverlay,
  options?: { trimText?: boolean },
): LearningTrackHotspotPanelOverlay | null {
  const dialogueId = trimOrEmpty(overlay.dialogueId);
  if (!dialogueId) return null;
  const cards = (overlay.cards ?? [])
    .map((card) => compactDialogueTurnCard(card, options))
    .filter((card): card is LearningTrackHotspotDialogueTurnCard => card !== null);
  if (cards.length < 1) return null;
  const next: LearningTrackHotspotPanelOverlay = { dialogueId, cards };
  const title =
    typeof overlay.title === "string"
      ? options?.trimText
        ? overlay.title.trim()
        : overlay.title
      : "";
  if (title) next.title = title;
  return next;
}

function cardsFromFixtureTurns(turns: unknown[]): LearningTrackHotspotContentCard[] {
  return turns
    .map((turn, index) => {
      if (!turn || typeof turn !== "object" || Array.isArray(turn)) return null;
      const record = turn as Record<string, unknown>;
      return createDialogueTurnCard({
        id: `fixture-${index}`,
        speaker: typeof record.speaker === "string" ? record.speaker : "",
        text: typeof record.text === "string" ? record.text : "",
        speakText:
          typeof record.speak_text === "string" ? record.speak_text : undefined,
        audioUrl:
          typeof record.audio_url === "string" ? record.audio_url : undefined,
      });
    })
    .filter((card): card is LearningTrackHotspotDialogueTurnCard => {
      return card !== null && card.text.length > 0;
    });
}

function turnsFromCards(cards: LearningTrackHotspotContentCard[]): Array<Record<string, unknown>> {
  return cards
    .map((card) => compactDialogueTurnCard(card, { trimText: true }))
    .filter((card): card is LearningTrackHotspotDialogueTurnCard => card !== null)
    .map((card) => {
      const turn: Record<string, unknown> = {
        speaker: card.speaker,
        text: card.text,
      };
      if (card.speakText) turn.speak_text = card.speakText;
      if (card.audioUrl) turn.audio_url = card.audioUrl;
      return turn;
    });
}

/** Legacy Phase E audio stamp. */
function applyLegacyTurnAudioOverlays(
  screens: LearningTrackScreenPayload[],
  overlays: LearningTrackHotspotTurnOverlay[] | undefined,
): LearningTrackScreenPayload[] {
  if (!overlays?.length) return screens;
  const byKey = new Map(
    overlays
      .filter(
        (overlay) =>
          trimOrEmpty(overlay.dialogueId) &&
          Number.isFinite(overlay.turnIndex) &&
          overlay.turnIndex >= 0 &&
          trimOrEmpty(overlay.audioUrl),
      )
      .map(
        (overlay) =>
          [
            `${overlay.dialogueId.trim()}::${Math.floor(overlay.turnIndex)}`,
            overlay.audioUrl!.trim(),
          ] as const,
      ),
  );
  if (byKey.size < 1) return screens;

  return screens.map((screen) => {
    if (screen.subtype !== "explore_hotspots" || !Array.isArray(screen.dialogues)) {
      return screen;
    }
    const dialogues = screen.dialogues.map((dialogue) => {
      if (!dialogue || typeof dialogue !== "object" || Array.isArray(dialogue)) {
        return dialogue;
      }
      const record = dialogue as Record<string, unknown>;
      const dialogueId = typeof record.id === "string" ? record.id.trim() : "";
      if (!dialogueId || !Array.isArray(record.turns)) return dialogue;
      const turns = record.turns.map((turn, turnIndex) => {
        if (!turn || typeof turn !== "object" || Array.isArray(turn)) return turn;
        const audioUrl = byKey.get(`${dialogueId}::${turnIndex}`);
        if (!audioUrl) return turn;
        return { ...(turn as Record<string, unknown>), audio_url: audioUrl };
      });
      return { ...record, turns };
    });
    return { ...screen, dialogues };
  });
}

/**
 * Apply staged panel overlays (full card replace) then legacy per-turn audio.
 * Panel overlays win for dialogues they cover.
 */
export function applyHotspotTurnOverlays(
  screens: LearningTrackScreenPayload[],
  settings: LearningTrackExploreHotspotsSettings | undefined,
): LearningTrackScreenPayload[] {
  const panels = settings?.panelOverlays;
  let nextScreens = screens;

  if (panels?.length) {
    const byId = new Map(
      panels
        .map((panel) => compactHotspotPanelOverlay(panel, { trimText: true }))
        .filter((panel): panel is LearningTrackHotspotPanelOverlay => panel !== null)
        .map((panel) => [panel.dialogueId, panel] as const),
    );

    if (byId.size > 0) {
      nextScreens = nextScreens.map((screen) => {
        if (screen.subtype !== "explore_hotspots" || !Array.isArray(screen.dialogues)) {
          return screen;
        }
        const dialogues = screen.dialogues.map((dialogue) => {
          if (!dialogue || typeof dialogue !== "object" || Array.isArray(dialogue)) {
            return dialogue;
          }
          const record = dialogue as Record<string, unknown>;
          const dialogueId = typeof record.id === "string" ? record.id.trim() : "";
          if (!dialogueId) return dialogue;
          const panel = byId.get(dialogueId);
          if (!panel) return dialogue;
          const turns = turnsFromCards(panel.cards);
          if (turns.length < 1) return dialogue;
          return {
            ...record,
            ...(panel.title ? { title: panel.title } : {}),
            turns,
          };
        });
        return { ...screen, dialogues };
      });
    }
  }

  // Legacy audio only for dialogues that were not fully restaged.
  const stagedIds = new Set(
    (settings?.panelOverlays ?? [])
      .map((panel) => compactHotspotPanelOverlay(panel, { trimText: true }))
      .filter((panel): panel is LearningTrackHotspotPanelOverlay => panel !== null)
      .map((panel) => panel.dialogueId),
  );
  const legacy = (settings?.turnOverlays ?? []).filter(
    (overlay) => !stagedIds.has(overlay.dialogueId),
  );
  return applyLegacyTurnAudioOverlays(nextScreens, legacy);
}

export function listHotspotPanelsFromScreens(
  screens: LearningTrackScreenPayload[],
  settings?: LearningTrackExploreHotspotsSettings,
): HotspotPanelEditable[] {
  const panels: HotspotPanelEditable[] = [];
  const overlayById = new Map(
    (settings?.panelOverlays ?? [])
      .map((panel) => compactHotspotPanelOverlay(panel, { trimText: false }))
      .filter((panel): panel is LearningTrackHotspotPanelOverlay => panel !== null)
      .map((panel) => [panel.dialogueId, panel] as const),
  );

  for (const screen of screens) {
    if (screen.subtype !== "explore_hotspots" || !Array.isArray(screen.dialogues)) {
      continue;
    }
    for (const dialogue of screen.dialogues) {
      if (!dialogue || typeof dialogue !== "object" || Array.isArray(dialogue)) continue;
      const record = dialogue as Record<string, unknown>;
      const dialogueId = typeof record.id === "string" ? record.id.trim() : "";
      if (!dialogueId || !Array.isArray(record.turns)) continue;
      const overlay = overlayById.get(dialogueId);
      const fixtureCards = cardsFromFixtureTurns(record.turns);
      const cards = overlay?.cards?.length ? overlay.cards : fixtureCards;
      if (cards.length < 1) continue;
      panels.push({
        dialogueId,
        dialogueTitle:
          overlay?.title ??
          (typeof record.title === "string" ? record.title : dialogueId),
        hotspotId: typeof record.hotspot_id === "string" ? record.hotspot_id : "",
        cards,
        isStaged: Boolean(overlay),
      });
    }
  }
  return panels;
}

/** @deprecated Prefer listHotspotPanelsFromScreens. */
export function listHotspotTurnsFromScreens(
  screens: LearningTrackScreenPayload[],
): Array<{
  dialogueId: string;
  dialogueTitle: string;
  hotspotId: string;
  turnIndex: number;
  speaker: string;
  text: string;
  audioUrl: string;
}> {
  return listHotspotPanelsFromScreens(screens).flatMap((panel) =>
    panel.cards
      .filter((card): card is LearningTrackHotspotDialogueTurnCard => card.type === "dialogue_turn")
      .map((card, turnIndex) => ({
        dialogueId: panel.dialogueId,
        dialogueTitle: panel.dialogueTitle,
        hotspotId: panel.hotspotId,
        turnIndex,
        speaker: card.speaker,
        text: card.text,
        audioUrl: card.audioUrl ?? "",
      })),
  );
}

function upsertPanelOverlay(
  settings: LearningTrackExploreHotspotsSettings | undefined,
  dialogueId: string,
  cards: LearningTrackHotspotContentCard[],
  title?: string,
): LearningTrackExploreHotspotsSettings {
  const compacted = compactHotspotPanelOverlay(
    { dialogueId, cards, ...(title !== undefined ? { title } : {}) },
    { trimText: false },
  );
  const without = (settings?.panelOverlays ?? []).filter(
    (panel) => panel.dialogueId !== dialogueId,
  );
  if (!compacted) {
    return {
      ...settings,
      ...(without.length > 0 ? { panelOverlays: without } : { panelOverlays: undefined }),
    };
  }
  return {
    ...settings,
    panelOverlays: [...without, compacted],
  };
}

/** Replace staged cards for a dialogue (seeds from baseline when first editing). */
export function setHotspotPanelCards(
  settings: LearningTrackExploreHotspotsSettings | undefined,
  dialogueId: string,
  cards: LearningTrackHotspotContentCard[],
  title?: string,
): LearningTrackExploreHotspotsSettings {
  return upsertPanelOverlay(settings, dialogueId, cards, title);
}

export function patchHotspotDialogueTurnCard(
  settings: LearningTrackExploreHotspotsSettings | undefined,
  dialogueId: string,
  cardId: string,
  patch: {
    speaker?: string;
    text?: string;
    speakText?: string | null;
    audioUrl?: string | null;
  },
  baselineCards: LearningTrackHotspotContentCard[],
  title?: string,
): LearningTrackExploreHotspotsSettings {
  const existing = settings?.panelOverlays?.find((panel) => panel.dialogueId === dialogueId);
  const cards = structuredClone(existing?.cards?.length ? existing.cards : baselineCards);
  const index = cards.findIndex((card) => card.id === cardId);
  if (index < 0) return settings ?? {};
  const card = cards[index];
  if (!card || card.type !== "dialogue_turn") return settings ?? {};

  if (patch.speaker !== undefined) card.speaker = patch.speaker;
  if (patch.text !== undefined) card.text = patch.text;
  if (patch.speakText !== undefined) {
    if (patch.speakText === null || !patch.speakText.trim()) delete card.speakText;
    else card.speakText = patch.speakText;
  }
  if (patch.audioUrl !== undefined) {
    if (patch.audioUrl === null || !patch.audioUrl.trim()) delete card.audioUrl;
    else card.audioUrl = patch.audioUrl.trim();
  }
  cards[index] = card;
  return upsertPanelOverlay(
    settings,
    dialogueId,
    cards,
    title ?? existing?.title,
  );
}

export function addHotspotDialogueTurnCard(
  settings: LearningTrackExploreHotspotsSettings | undefined,
  dialogueId: string,
  baselineCards: LearningTrackHotspotContentCard[],
  title?: string,
): LearningTrackExploreHotspotsSettings {
  const existing = settings?.panelOverlays?.find((panel) => panel.dialogueId === dialogueId);
  const cards = structuredClone(existing?.cards?.length ? existing.cards : baselineCards);
  cards.push(createDialogueTurnCard({ text: "New line", speaker: "" }));
  return upsertPanelOverlay(settings, dialogueId, cards, title ?? existing?.title);
}

export function removeHotspotDialogueTurnCard(
  settings: LearningTrackExploreHotspotsSettings | undefined,
  dialogueId: string,
  cardId: string,
  baselineCards: LearningTrackHotspotContentCard[],
  title?: string,
): LearningTrackExploreHotspotsSettings {
  const existing = settings?.panelOverlays?.find((panel) => panel.dialogueId === dialogueId);
  const cards = structuredClone(existing?.cards?.length ? existing.cards : baselineCards);
  if (cards.length <= 1) return settings ?? {};
  const nextCards = cards.filter((card) => card.id !== cardId);
  if (nextCards.length < 1) return settings ?? {};
  return upsertPanelOverlay(settings, dialogueId, nextCards, title ?? existing?.title);
}

export function patchHotspotPanelTitle(
  settings: LearningTrackExploreHotspotsSettings | undefined,
  dialogueId: string,
  title: string,
  baselineCards: LearningTrackHotspotContentCard[],
): LearningTrackExploreHotspotsSettings {
  const existing = settings?.panelOverlays?.find((panel) => panel.dialogueId === dialogueId);
  const cards = structuredClone(existing?.cards?.length ? existing.cards : baselineCards);
  return upsertPanelOverlay(settings, dialogueId, cards, title);
}

/** Keep old export names working for audio-only upserts via panel staging. */
export function upsertHotspotTurnOverlay(
  overlays: LearningTrackHotspotTurnOverlay[] | undefined,
  dialogueId: string,
  turnIndex: number,
  patch: { audioUrl?: string | null },
): LearningTrackHotspotTurnOverlay[] | undefined {
  const current = overlays?.find(
    (overlay) =>
      overlay.dialogueId === dialogueId && overlay.turnIndex === turnIndex,
  );
  const draft: LearningTrackHotspotTurnOverlay = {
    dialogueId,
    turnIndex,
    ...(current ?? {}),
  };
  if (patch.audioUrl !== undefined) {
    if (patch.audioUrl === null || !patch.audioUrl.trim()) delete draft.audioUrl;
    else draft.audioUrl = patch.audioUrl.trim();
  }
  const without = (overlays ?? []).filter(
    (overlay) =>
      !(overlay.dialogueId === dialogueId && overlay.turnIndex === turnIndex),
  );
  if (!draft.audioUrl) return without.length > 0 ? without : undefined;
  return [...without, draft];
}

export function pruneHotspotTurnOverlays(
  overlays: LearningTrackHotspotTurnOverlay[] | undefined,
  keys: Iterable<{ dialogueId: string; turnIndex: number }>,
): LearningTrackHotspotTurnOverlay[] | undefined {
  if (!overlays?.length) return undefined;
  const allowed = new Set(
    [...keys].map((key) => `${key.dialogueId}::${key.turnIndex}`),
  );
  const next = overlays.filter((overlay) =>
    allowed.has(`${overlay.dialogueId}::${overlay.turnIndex}`),
  );
  return next.length > 0 ? next : undefined;
}
