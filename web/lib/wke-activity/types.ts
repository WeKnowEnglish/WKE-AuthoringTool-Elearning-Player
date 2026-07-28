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

/** Object interaction kinds enabled in the next upgrade. */
export type WkeObjectInteractionKind = "dialogue" | "info" | "audio" | "question";

export type WkeObjectInitialState = "locked" | "available";

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
  /** Extensible interaction kind (defaults to dialogue). */
  interactionKind?: WkeObjectInteractionKind;
  /** Strict-order index within its phase (lower first). */
  orderIndex?: number;
  initialState?: WkeObjectInitialState;
  wrongOrderHint?: string;
  /** Ordered response stack; when empty, fall back to dialogue. */
  responseCards?: WkeResponseCard[];
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
