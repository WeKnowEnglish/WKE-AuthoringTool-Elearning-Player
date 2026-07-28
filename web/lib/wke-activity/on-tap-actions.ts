import type {
  WkeHotspotElement,
  WkeObjectAction,
  WkeResponseCard,
} from "@/lib/wke-activity/types";

/** Content-style actions that map 1:1 from legacy response cards. */
export function responseCardToAction(card: WkeResponseCard): WkeObjectAction {
  switch (card.kind) {
    case "info":
      return {
        id: card.id,
        type: "show_info",
        text: card.text,
        ...(card.imageUrl ? { imageUrl: card.imageUrl } : {}),
        wait: true,
      };
    case "audio":
      return {
        id: card.id,
        type: "play_audio",
        audioUrl: card.audioUrl,
        ...(card.label ? { label: card.label } : {}),
        wait: true,
      };
    case "dialogue":
      return {
        id: card.id,
        type: "show_dialogue",
        ...(card.dialogueId ? { dialogueId: card.dialogueId } : {}),
        wait: true,
      };
    case "question":
      return {
        id: card.id,
        type: "ask_question",
        prompt: card.prompt,
        questionType: card.questionType,
        choices: card.choices,
        correctChoiceId: card.correctChoiceId,
        ...(card.gateDiscover != null ? { gateDiscover: card.gateDiscover } : {}),
        wait: true,
      };
    default: {
      const _exhaustive: never = card;
      return _exhaustive;
    }
  }
}

export function actionToResponseCard(action: WkeObjectAction): WkeResponseCard | null {
  switch (action.type) {
    case "show_info":
      return {
        id: action.id,
        kind: "info",
        text: action.text,
        ...(action.imageUrl ? { imageUrl: action.imageUrl } : {}),
      };
    case "play_audio":
      return {
        id: action.id,
        kind: "audio",
        audioUrl: action.audioUrl,
        ...(action.label ? { label: action.label } : {}),
      };
    case "show_dialogue":
      return {
        id: action.id,
        kind: "dialogue",
        ...(action.dialogueId ? { dialogueId: action.dialogueId } : {}),
      };
    case "ask_question":
      return {
        id: action.id,
        kind: "question",
        prompt: action.prompt,
        questionType: action.questionType,
        choices: action.choices,
        correctChoiceId: action.correctChoiceId,
        ...(action.gateDiscover != null ? { gateDiscover: action.gateDiscover } : {}),
      };
    default:
      return null;
  }
}

/** Prefer onTap; fall back to migrating legacy responseCards. */
export function resolveOnTapActions(
  hotspot: Pick<WkeHotspotElement, "onTap" | "responseCards" | "interactionKind" | "id" | "name">,
): WkeObjectAction[] {
  if (hotspot.onTap?.length) return hotspot.onTap;
  if (hotspot.responseCards?.length) {
    return hotspot.responseCards.map(responseCardToAction);
  }
  const kind = hotspot.interactionKind ?? "dialogue";
  if (kind === "none" || kind === "silent") return [];
  if (kind === "dialogue") {
    return [{ id: `fallback-dialogue-${hotspot.id}`, type: "show_dialogue", wait: true }];
  }
  if (kind === "info") {
    return [
      {
        id: `fallback-info-${hotspot.id}`,
        type: "show_info",
        text: hotspot.name ?? "Look closely.",
        wait: true,
      },
    ];
  }
  if (kind === "audio") {
    return [
      {
        id: `fallback-audio-${hotspot.id}`,
        type: "play_audio",
        audioUrl: "",
        label: "Listen",
        wait: true,
      },
    ];
  }
  return [];
}

/** Keep legacy responseCards in sync with content actions for older play paths. */
export function syncResponseCardsFromOnTap(
  actions: WkeObjectAction[] | undefined,
): WkeResponseCard[] | undefined {
  if (!actions?.length) return undefined;
  const cards = actions
    .map(actionToResponseCard)
    .filter((card): card is WkeResponseCard => card != null);
  return cards.length ? cards : undefined;
}

export function isContentAction(
  action: WkeObjectAction,
): action is Extract<
  WkeObjectAction,
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

export function isStageAction(action: WkeObjectAction): boolean {
  return !isContentAction(action) && action.type !== "wait" && action.type !== "complete_object";
}

export type NormalizedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type StageObjectRuntime = {
  id: string;
  visible: boolean;
  opacity: number;
  geometry: NormalizedRect | null;
  spriteAssetId?: string;
  spriteSrc?: string;
  anim?: { name: string; until: number } | null;
};

export function rectFromGeometry(geometry: {
  shape: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
  points?: Array<{ x: number; y: number }>;
}): NormalizedRect | null {
  if (geometry.shape === "rectangle") {
    return {
      x: geometry.x ?? 0,
      y: geometry.y ?? 0,
      width: geometry.width ?? 0.1,
      height: geometry.height ?? 0.1,
    };
  }
  if (geometry.shape === "ellipse") {
    const rx = geometry.rx ?? 0.05;
    const ry = geometry.ry ?? 0.05;
    return {
      x: (geometry.cx ?? 0.5) - rx,
      y: (geometry.cy ?? 0.5) - ry,
      width: rx * 2,
      height: ry * 2,
    };
  }
  if (geometry.shape === "polygon" && geometry.points?.length) {
    const xs = geometry.points.map((p) => p.x);
    const ys = geometry.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  return null;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}
