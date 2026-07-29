/** Portable EDU Studio `.wkeactivity` authoring document (v2). */

export type WkePoint = { x: number; y: number };

export type WkeHotspotGeometry =
  | { shape: "polygon"; points: WkePoint[] }
  | { shape: "rectangle"; x: number; y: number; width: number; height: number }
  | { shape: "ellipse"; cx: number; cy: number; rx: number; ry: number };

export type WkeAsset = {
  id: string;
  kind: "image" | string;
  src: string;
  mimeType?: string;
  intrinsicSize?: { width: number; height: number };
  alt?: string;
};

export type WkeHotspotVisualShape = {
  type: "segmentation-contour";
  sourceAssetId: string;
  sourceWidth: number;
  sourceHeight: number;
  /** Normalized closed contours. Multiple paths preserve separated parts / holes. */
  paths: WkePoint[][];
  score?: number;
};

/** Object interaction kinds enabled in the scene engine. */
export type WkeObjectInteractionKind =
  | "dialogue"
  | "info"
  | "audio"
  | "question"
  | "none"
  | "silent";

export type WkeObjectPresentation = "target" | "sprite" | "shape" | "text";

export type WkeObjectInitialState = "locked" | "available" | "hidden";

export type WkeResponseCard =
  | {
      id: string;
      kind: "info";
      text: string;
      imageUrl?: string;
    }
  | {
      id: string;
      kind: "audio";
      audioUrl: string;
      label?: string;
    }
  | {
      id: string;
      kind: "dialogue";
      /** Prefer existing dialogue for this hotspot when omitted. */
      dialogueId?: string;
    }
  | {
      id: string;
      kind: "question";
      prompt: string;
      questionType: "mc" | "true_false";
      choices: Array<{ id: string; label: string }>;
      correctChoiceId: string;
      /** When true, discover/complete only after correct answer. */
      gateDiscover?: boolean;
    };

export type WkeNormalizedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** When this action starts relative to the previous one in a sequence. */
export type WkeActionStartTiming = "after_previous" | "with_previous";

/**
 * Ordered on-tap sequence. Content actions replace responseCards over time;
 * stage actions drive show/hide, motion, and sprite swaps.
 */
export type WkeObjectAction =
  | {
      id: string;
      type: "play_audio";
      audioUrl: string;
      label?: string;
      wait?: boolean;
      timing?: WkeActionStartTiming;
    }
  | {
      id: string;
      type: "show_dialogue";
      dialogueId?: string;
      wait?: boolean;
      timing?: WkeActionStartTiming;
    }
  | {
      id: string;
      type: "show_info";
      text: string;
      imageUrl?: string;
      wait?: boolean;
      timing?: WkeActionStartTiming;
    }
  | {
      id: string;
      type: "ask_question";
      prompt: string;
      questionType: "mc" | "true_false";
      choices: Array<{ id: string; label: string }>;
      correctChoiceId: string;
      gateDiscover?: boolean;
      wait?: boolean;
      timing?: WkeActionStartTiming;
    }
  | {
      id: string;
      type: "wait";
      ms: number;
      timing?: WkeActionStartTiming;
    }
  | {
      id: string;
      type: "set_object_state";
      targetId: string;
      state: "hidden" | "visible" | "locked" | "available";
      timing?: WkeActionStartTiming;
    }
  | {
      id: string;
      type: "swap_sprite_asset";
      targetId: string;
      spriteAssetId: string;
      timing?: WkeActionStartTiming;
    }
  | {
      id: string;
      type: "tween_object";
      targetId: string;
      to: WkeNormalizedRect;
      durationMs: number;
      easing?: "linear" | "easeOut";
      wait?: boolean;
      timing?: WkeActionStartTiming;
    }
  | {
      id: string;
      type: "enter_object";
      targetId: string;
      to: WkeNormalizedRect;
      durationMs: number;
      from?: Partial<WkeNormalizedRect>;
      wait?: boolean;
      timing?: WkeActionStartTiming;
    }
  | {
      id: string;
      type: "complete_object";
      targetId?: string;
      timing?: WkeActionStartTiming;
    }
  | {
      id: string;
      type: "pulse_object";
      targetId: string;
      /** Defaults to true when omitted. */
      enabled?: boolean;
      timing?: WkeActionStartTiming;
    }
  | {
      id: string;
      type: "advance_scene";
      timing?: WkeActionStartTiming;
    }
  | {
      id: string;
      type: "click_advance_scene";
      targetId: string;
      timing?: WkeActionStartTiming;
    };

export type WkeHotspotElement = {
  id: string;
  kind: "hotspot";
  regionId: string;
  name?: string;
  accessibleLabel?: string;
  geometry: WkeHotspotGeometry;
  tabOrder?: number;
  required?: boolean;
  highlight?: {
    style?: string;
    color?: string;
    outlineWidth?: number;
    glowRadius?: number;
    backgroundDim?: number;
  };
  visualShape?: WkeHotspotVisualShape;
  /** `target` = invisible region + highlight; `sprite` = visible PNG; `shape`/`text` = simple overlays. */
  presentation?: WkeObjectPresentation;
  /** Asset id for `presentation: "sprite"`. */
  spriteAssetId?: string;
  /** Visible label for `presentation: "text"` overlays. */
  labelText?: string;
  /** Typography for text overlays. */
  textStyle?: {
    role?: "title" | "body" | "caption";
    align?: "left" | "center" | "right";
  };
  /** Clockwise rotation in degrees around the object center (0–360). */
  rotationDeg?: number;
  /** Draw / hit stack order within a scene (higher = in front). */
  zIndex?: number;
  /** Simple entrance + idle motion presets for sprites, shapes, text, and targets. */
  animation?: {
    entrance?: "none" | "fade_in" | "pop" | "slide_up" | "slide_down";
    entranceDurationMs?: number;
    entranceDelayMs?: number;
    idle?: "none" | "pulse" | "bob" | "wiggle";
  };
  /** Extensible interaction kind (defaults to dialogue for targets, silent for sprites). */
  interactionKind?: WkeObjectInteractionKind;
  /** Strict-order index within its phase (lower first). */
  orderIndex?: number;
  initialState?: WkeObjectInitialState;
  wrongOrderHint?: string;
  /** Ordered response stack; when empty, fall back to dialogue. Prefer `onTap`. */
  responseCards?: WkeResponseCard[];
  /** Ordered on-tap action sequence (content + stage). */
  onTap?: WkeObjectAction[];
  enableHintPulse?: boolean;
};

export type WkeMediaElement = {
  id: string;
  kind: "media";
  regionId: string;
  assetId: string;
  fit?: "contain" | "cover";
};

export type WkeDialoguePanelElement = {
  id: string;
  kind: "dialogue-panel";
  regionId: string;
  emptyStateText?: string;
  showTranscript?: boolean;
  showReplay?: boolean;
  showProgress?: boolean;
};

export type WkeLayoutElement =
  | WkeHotspotElement
  | WkeMediaElement
  | WkeDialoguePanelElement
  | { id: string; kind: string; [key: string]: unknown };

export type WkeDialogueTurn = {
  speaker: string;
  text: string;
  /** Optional TTS override when no audioUrl. */
  speakText?: string;
  /** Recorded clip URL; preferred over TTS when set. */
  audioUrl?: string;
};

export type WkeDialogue = {
  id: string;
  hotspotId: string;
  title: string;
  turns: WkeDialogueTurn[];
};

export type WkePhase = {
  id: string;
  title?: string;
  imageAssetId: string;
  hotspotIds: string[];
  /** Stage actions run automatically when this scene becomes active. */
  onEnter?: WkeObjectAction[];
  /** Scene-level playback (falls back to activity interaction defaults when omitted). */
  objective?: {
    label?: string;
  };
  strictOrder?: boolean;
  hintPulseEnabled?: boolean;
  visitedWhen?: "dialogue-started" | "dialogue-finished" | "dialogue-completed";
  autoPlayOnSelect?: boolean;
};

export type WkeExploreHotspotsInteraction = {
  type: "explore-hotspots";
  completion: { type: "visit-all-required-hotspots" };
  visitedWhen?: "dialogue-started" | "dialogue-finished" | "dialogue-completed";
  autoPlayOnSelect?: boolean;
  dialogues: WkeDialogue[];
  /** Multi-scene storytelling; omit for single-image activities. */
  phases?: WkePhase[];
  objective?: {
    label?: string;
  };
  /** When true, objects must be completed in orderIndex order within a phase. */
  strictOrder?: boolean;
  /** Activity-level hint pulse available to students. */
  hintPulseEnabled?: boolean;
};

export type WkeActivityV2 = {
  version: 2;
  kind: "activity-authoring";
  id: string;
  name: string;
  educationalIntent?: {
    objective?: string;
    successCriteria?: string;
    cefr?: string;
    vocabulary?: string[];
    languageFrames?: string[];
  };
  content: {
    instruction: string;
    completionMessage?: string;
  };
  assets: WkeAsset[];
  layout: {
    aspectRatio?: string;
    responsive?: string;
    regions: Array<{
      id: string;
      role: string;
      widthFraction?: number;
    }>;
    elements: WkeLayoutElement[];
  };
  interaction: WkeExploreHotspotsInteraction;
  accessibility?: {
    keyboardEnabled?: boolean;
    transcriptFallback?: boolean;
    announceProgress?: boolean;
  };
};
